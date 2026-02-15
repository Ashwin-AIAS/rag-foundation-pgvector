from typing import List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.config import settings


class RetrievalService:
    """
    Service for retrieving relevant document chunks using vector similarity search.
    
    Uses PostgreSQL's pgvector extension to perform efficient cosine similarity
    search against stored document embeddings.
    """
    
    def __init__(self, db: Session):
        """
        Initialize the retrieval service.
        
        Args:
            db: SQLAlchemy database session
        """
        self.db = db
    
    def retrieve(
        self,
        query_embedding: List[float],
        top_k: int = None,
        similarity_threshold: float = None,
        source_files: List[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Retrieve the most relevant document chunks for a query embedding.
        
        Args:
            query_embedding: The query vector (1536 dimensions)
            top_k: Number of chunks to retrieve (defaults to settings.TOP_K)
            similarity_threshold: Minimum similarity score (defaults to settings.SIMILARITY_THRESHOLD)
            source_files: Optional list of source filenames to restrict retrieval to
            
        Returns:
            List of dictionaries containing:
                - chunk_text: The text content
                - source_file: Original document filename
                - chunk_index: Position in the original document
                - metadata: Additional metadata (JSONB)
                - similarity_score: Cosine similarity score (0-1)
                
        Note:
            Results are ordered by similarity (highest first).
            Only chunks meeting the similarity threshold are returned.
        """
        # Use defaults from settings if not provided
        if top_k is None:
            top_k = settings.TOP_K
        if similarity_threshold is None:
            similarity_threshold = settings.SIMILARITY_THRESHOLD
        
        # Convert embedding list to PostgreSQL vector format
        embedding_str = "[" + ",".join(str(x) for x in query_embedding) + "]"
        
        # Build query with optional source_file filter
        where_clauses = ["1 - (embedding <=> :query_embedding) >= :threshold"]
        params = {
            "query_embedding": embedding_str,
            "threshold": similarity_threshold,
            "limit": top_k
        }
        
        if source_files and len(source_files) > 0:
            # Build parameterized IN clause
            file_params = {}
            file_placeholders = []
            for i, sf in enumerate(source_files):
                key = f"sf_{i}"
                file_params[key] = sf
                file_placeholders.append(f":{key}")
            where_clauses.append(f"source_file IN ({','.join(file_placeholders)})")
            params.update(file_params)
        
        where_sql = " AND ".join(where_clauses)
        
        query = text(f"""
            SELECT 
                chunk_text,
                source_file,
                chunk_index,
                chunk_metadata,
                1 - (embedding <=> :query_embedding) AS similarity_score
            FROM document_chunks
            WHERE {where_sql}
            ORDER BY embedding <=> :query_embedding
            LIMIT :limit
        """)
        
        try:
            result = self.db.execute(query, params)
            
            # Convert result rows to dictionaries
            chunks = []
            for row in result:
                chunks.append({
                    "chunk_text": row.chunk_text,
                    "source_file": row.source_file,
                    "chunk_index": row.chunk_index,
                    "metadata": row.chunk_metadata,
                    "similarity_score": float(row.similarity_score)
                })
            
            return chunks
            
        except Exception as e:
            raise Exception(f"Retrieval failed: {str(e)}")
