import logging
import json
from typing import List, Dict, Any
from app.config import settings
from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

class GraphExtractionService:
    """
    Service for extracting entities and relationships from text using Gemini
    and storing them in a Neo4j Graph Database.
    """
    
    _client = None

    def __init__(self, neo4j_driver):
        """Initialize with a Neo4j driver instance."""
        self.driver = neo4j_driver
        if GraphExtractionService._client is None:
            GraphExtractionService._client = genai.Client(api_key=settings.GEMINI_API_KEY)
        self.model_name = settings.GEMINI_MODEL
        
    def extract_and_store(self, text: str, source_file: str, chunk_index: int) -> bool:
        """
        Extract entities/relationships from a text chunk and store them in Neo4j.
        """
        try:
            # 1. Ask Gemini to extract entities and relationships
            graph_data = self._extract_graph_data(text)
            
            if not graph_data or ("entities" not in graph_data and "relationships" not in graph_data):
                logger.warning(f"No graph data extracted for {source_file} chunk {chunk_index}")
                return False
                
            # 2. Store the extracted data in Neo4j
            with self.driver.session() as session:
                session.execute_write(self._merge_graph_data, graph_data, source_file, chunk_index)
                
            return True
            
        except Exception as e:
            logger.error(f"Failed to extract and store graph data: {e}")
            return False
            
    def _extract_graph_data(self, text: str) -> Dict[str, Any]:
        """Use Gemini to extract entities and relationships as JSON."""
        prompt = f"""
        You are an expert data ontologist. Analyze the following text and extract key entities and the relationships between them.
        Focus on specific concepts, people, organizations, methodologies, and technologies.
        
        Return the result strictly as a valid JSON object with the following structure:
        {{
            "entities": [
                {{"id": "entity_name", "type": "Concept|Person|Organization|Technology|Methodology", "description": "brief description"}}
            ],
            "relationships": [
                {{"source": "entity_name_1", "target": "entity_name_2", "type": "RELATES_TO|USES|AUTHORED_BY|PART_OF|IMPLEMENTS", "description": "how they relate"}}
            ]
        }}
        
        Text to analyze:
        {text}
        
        JSON OUTPUT ONLY:
        """
        
        try:
            response = self._client.models.generate_content(
                model=self.model_name,
                contents=prompt
            )
            response_text = response.text.strip()
            
            # Clean up the response to ensure it's valid JSON
            if response_text.startswith("```json"):
                response_text = response_text[7:]
                if response_text.endswith("```"):
                    response_text = response_text[:-3]
            elif response_text.startswith("```"):
                response_text = response_text[3:]
                if response_text.endswith("```"):
                    response_text = response_text[:-3]
            
            return json.loads(response_text.strip())
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON from Gemini: {e}\nRaw output: {response.text if 'response' in locals() else 'N/A'}")
            return {}
        except Exception as e:
            logger.error(f"Error during Gemini generation: {e}")
            return {}
            
    @staticmethod
    def _merge_graph_data(tx, graph_data: Dict[str, Any], source_file: str, chunk_index: int):
        """Execute Cypher queries to merge nodes and relationships."""
        
        # 1. Create Document Node
        tx.run("""
            MERGE (d:Document {id: $source_file})
        """, source_file=source_file)
        
        # 2. Merge Entities
        entities = graph_data.get("entities", [])
        for entity in entities:
            tx.run("""
                MERGE (e:Entity {id: $id})
                SET e.type = $type, e.description = $description
                MERGE (d:Document {id: $source_file})
                MERGE (d)-[:MENTIONS {chunk_index: $chunk_index}]->(e)
            """, 
            id=entity.get("id"), 
            type=entity.get("type"), 
            description=entity.get("description"),
            source_file=source_file,
            chunk_index=chunk_index)
            
        # 3. Merge Relationships
        relationships = graph_data.get("relationships", [])
        for rel in relationships:
            tx.run("""
                MATCH (source:Entity {id: $source_id})
                MATCH (target:Entity {id: $target_id})
                MERGE (source)-[r:CONNECTED_TO {type: $rel_type}]->(target)
                SET r.description = $description, r.source_file = $source_file
            """,
            source_id=rel.get("source"),
            target_id=rel.get("target"),
            rel_type=rel.get("type"),
            description=rel.get("description"),
            source_file=source_file)
