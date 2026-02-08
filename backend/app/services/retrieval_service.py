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
        similarity_threshold: float = None
    ) -> List[Dict[str, Any]]:
        """
        Retrieve the most relevant document chunks for a query embedding.
        
        Args:
            query_embedding: The query vector (1536 dimensions)
            top_k: Number of chunks to retrieve (defaults to settings.TOP_K)
            similarity_threshold: Minimum similarity score (defaults to settings.SIMILARITY_THRESHOLD)
            
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
        
        # Perform vector similarity search using pgvector's cosine distance operator (<=>)
        # Note: cosine distance = 1 - cosine similarity
        query = text("""
            SELECT 
                chunk_text,
                source_file,
                chunk_index,
                metadata,
                1 - (embedding <=> :query_embedding) AS similarity_score
            FROM document_chunks
            WHERE 1 - (embedding <=> :query_embedding) >= :threshold
            ORDER BY embedding <=> :query_embedding
            LIMIT :limit
        """)
        
        try:
            result = self.db.execute(
                query,
                {
                    "query_embedding": embedding_str,
                    "threshold": similarity_threshold,
                    "limit": top_k
                }
            )
            
            # Convert result rows to dictionaries
            chunks = []
            for row in result:
                chunks.append({
                    "chunk_text": row.chunk_text,
                    "source_file": row.source_file,
                    "chunk_index": row.chunk_index,
                    "metadata": row.metadata,
                    "similarity_score": float(row.similarity_score)
                })
            
            return chunks
            
        except Exception as e:
            raise Exception(f"Retrieval failed: {str(e)}")
