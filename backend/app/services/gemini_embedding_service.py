import google.generativeai as genai
from typing import List
from app.config import settings


class GeminiEmbeddingService:
    """
    Service for generating embeddings using Google's Gemini API.
    
    Uses the text-embedding-004 model which produces 768-dimensional embeddings.
    """
    
    def __init__(self):
        """Initialize the Gemini embedding service with API key."""
        genai.configure(api_key=settings.GEMINI_API_KEY)
        # Gemini embedding model needs 'models/' prefix
        self.model_name = settings.GEMINI_EMBEDDING_MODEL
    
    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for a list of documents.
        
        Args:
            texts: List of text strings to embed
            
        Returns:
            List of embedding vectors (each 768 dimensions)
        """
        embeddings = []
        
        # Gemini API processes embeddings one at a time
        for text in texts:
            result = genai.embed_content(
                model=self.model_name,
                content=text,
                task_type="retrieval_document",
                output_dimensionality=768  # Match database schema
            )
            embeddings.append(result['embedding'])
        
        return embeddings
    
    def embed_query(self, text: str) -> List[float]:
        """
        Generate embedding for a single query.
        
        Args:
            text: Query text to embed
            
        Returns:
            Embedding vector (768 dimensions)
        """
        result = genai.embed_content(
            model=self.model_name,
            content=text,
            task_type="retrieval_query",
            output_dimensionality=768  # Match database schema
        )
        
        return result['embedding']
