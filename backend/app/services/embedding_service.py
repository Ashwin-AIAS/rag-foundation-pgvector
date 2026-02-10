import google.generativeai as genai
from typing import List
from app.config import settings


class EmbeddingService:
    """
    Service for converting text queries into vector embeddings.
    
    Uses Gemini's text-embedding-004 model (768 dimensions)
    to ensure query and document vectors are in the same embedding space.
    """
    
    def __init__(self):
        """Initialize the Gemini embeddings client."""
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.model_name = "text-embedding-004"
    
    def embed_query(self, query: str) -> List[float]:
        """
        Convert a text query into a vector embedding.
        
        Args:
            query: The user's question as a string
            
        Returns:
            A 768-dimensional embedding vector
            
        Raises:
            Exception: If the Gemini API call fails
        """
        if not query or not query.strip():
            raise ValueError("Query cannot be empty")
        
        try:
            result = genai.embed_content(
                model=self.model_name,
                content=query,
                task_type="retrieval_query"
            )
            return result['embedding']
        except Exception as e:
            raise Exception(f"Failed to generate embedding: {str(e)}")
