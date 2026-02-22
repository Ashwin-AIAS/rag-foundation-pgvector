import google.generativeai as genai
import logging
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
    
    def embed_documents(self, texts: List[str], batch_size: int = 100) -> List[List[float]]:
        """
        Generate embeddings for a list of documents in batches.
        
        Args:
            texts: List of text strings to embed
            batch_size: Number of texts to process in a single batch (default 100)
            
        Returns:
            List of embedding vectors (each 768 dimensions)
        """
        embeddings = []
        
        # Process in batches
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            try:
                # Use batch embedding if available, otherwise strict iteration
                # Newer Google GenAI SDK supports passing a list of content to embed_content
                # formatted as 'content' checks for list.
                
                result = genai.embed_content(
                    model=self.model_name,
                    content=batch,
                    task_type="retrieval_document",
                    output_dimensionality=768
                )
                
                # result['embedding'] will be a list of lists if input was a list
                if 'embedding' in result:
                    batch_embeddings = result['embedding']
                    # Verify it's a list of lists
                    if isinstance(batch_embeddings, list) and len(batch_embeddings) > 0:
                        if isinstance(batch_embeddings[0], list) or isinstance(batch_embeddings[0], float):
                           # If it returned a single embedding (unexpected for list input), wrap it
                           if isinstance(batch_embeddings[0], float):
                                embeddings.append(batch_embeddings)
                           else:
                                embeddings.extend(batch_embeddings)
                    else:
                        logging.warning(f"DEBUG: Empty embedding list returned for batch {i}")
                else:
                    logging.warning(f"DEBUG: 'embedding' key missing in result: {result}")
                    raise ValueError("No embedding returned from API")
                 
            except Exception as e:
                logging.warning(f"Batch embedding failed for batch starting at index {i}, falling back to sequential: {e}")
                for text in batch:
                    try:
                         res = genai.embed_content(
                            model=self.model_name,
                            content=text,
                            task_type="retrieval_document", 
                            output_dimensionality=768
                        )
                         embeddings.append(res['embedding'])
                    except Exception as inner_e:
                        logging.error(f"Error embedding chunk: {inner_e}")
                        raise inner_e
        
        if len(embeddings) != len(texts):
            logging.error(f"Generated {len(embeddings)} embeddings for {len(texts)} texts.")
            
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
