from typing import List
from langchain_openai import OpenAIEmbeddings
from app.config import settings


class EmbeddingService:
    """
    Service for converting text queries into vector embeddings.
    
    Uses the same embedding model as document ingestion (text-embedding-ada-002)
    to ensure query and document vectors are in the same embedding space.
    """
    
    def __init__(self):
        """Initialize the OpenAI embeddings client."""
        self.embeddings = OpenAIEmbeddings(
            openai_api_key=settings.OPENAI_API_KEY,
            model="text-embedding-ada-002"
        )
    
    def embed_query(self, query: str) -> List[float]:
        """
        Convert a text query into a vector embedding.
        
        Args:
            query: The user's question as a string
            
        Returns:
            A 1536-dimensional embedding vector
            
        Raises:
            Exception: If the OpenAI API call fails
        """
        if not query or not query.strip():
            raise ValueError("Query cannot be empty")
        
        try:
            # Use embed_query method for single query (optimized vs embed_documents)
            embedding = self.embeddings.embed_query(query)
            return embedding
        except Exception as e:
            raise Exception(f"Failed to generate embedding: {str(e)}")
