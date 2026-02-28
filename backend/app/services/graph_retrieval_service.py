import logging
from typing import List, Dict, Any
from app.config import settings

logger = logging.getLogger(__name__)

class GraphRetrievalService:
    """
    Service for retrieving context from Neo4j Graph Database.
    
    Provides multi-hop reasoning by finding central entities in a query
    and extracting their surrounding subgraphs.
    """
    
    def __init__(self, neo4j_driver):
        """Initialize with a Neo4j driver instance."""
        self.driver = neo4j_driver
        
    def retrieve(
        self,
        user_question: str,
        source_files: List[str] = None,
        top_k: int = 5,
        **kwargs
    ) -> List[Dict[str, Any]]:
        """
        Extract graph sub-networks relevant to the keywords in the user question.
        
        Args:
            user_question: The user's query
            source_files: Optional list of documents to filter by
            top_k: Maximum number of entity relationships to return
            
        Returns:
            List of dictionary items containing graph text context
        """
        # Very basic keyword extraction for the prototype
        # Ideally, we would use an LLM or NLP to extract exact entities from the query here
        keywords = [word for word in user_question.replace("?", "").split() if len(word) > 4]
        
        if not keywords:
            logger.info("No significant keywords found for Graph traversal, returning empty context.")
            return []
            
        try:
            with self.driver.session() as session:
                result = session.execute_read(
                    self._execute_graph_search, 
                    keywords=keywords, 
                    source_files=source_files, 
                    limit=top_k
                )
                
            # Format graph connections into textual chunks so generation_service can read it
            formatted_chunks = []
            for record in result:
                txt = (f"GRAPH CONTEXT: Entity '{record['source']}' is "
                       f"{(record['rel_type'] or 'connected').replace('_', ' ').lower()} "
                       f"Entity '{record['target']}'. "
                       f"Details: {record['rel_desc'] or 'N/A'}. "
                       f"Found in Document: {record['source_file'] or 'Unknown'}")
                       
                formatted_chunks.append({
                    "chunk_text": txt,
                    "source_file": record['source_file'] or "Graph Context",
                    "chunk_index": -1, # Signifies it's a synthetic graph chunk
                    "metadata": {"type": "graph_traversal"},
                    "similarity_score": 1.0,
                    "keyword_score": 1.0,
                    "final_score": 1.0
                })
                
            return formatted_chunks
            
        except Exception as e:
            logger.error(f"Failed to retrieve graph context: {e}")
            return []
            
    @staticmethod
    def _execute_graph_search(tx, keywords: List[str], source_files: List[str] = None, limit: int = 5):
        """Execute cypher query to find multi-hop entity connections around query keywords."""
        
        # Build parameterized keyword matching (prevents Cypher injection)
        params = {"limit": limit}
        keyword_conditions = []
        for i, k in enumerate(keywords):
            params[f"kw_{i}"] = k
            keyword_conditions.append(
                f"source.id CONTAINS $kw_{i} OR target.id CONTAINS $kw_{i}"
            )
        keyword_clause = " OR ".join(keyword_conditions)
        
        cypher_query = f"""
        MATCH (source:Entity)-[r:CONNECTED_TO]->(target:Entity)
        WHERE {keyword_clause}
        """
        
        if source_files and len(source_files) > 0:
             cypher_query += " AND r.source_file IN $source_files "
             params["source_files"] = source_files
             
        cypher_query += """
        RETURN 
            source.id as source, 
            type(r) as rel_type, 
            r.description as rel_desc, 
            r.source_file as source_file,
            target.id as target
        LIMIT $limit
        """
        
        result = tx.run(cypher_query, **params)
        return [record.data() for record in result]
