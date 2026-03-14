import functools
import logging
import numpy as np
from typing import List
from app.config import settings
from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

# Module level client to avoid re-initializing
_client = None

@functools.lru_cache(maxsize=256)
def _cached_embed_query(model_name: str, api_key_hash: str, query: str) -> tuple:
    """
    Module-level LRU cache for query embeddings.
    Uses api_key_hash (not the key itself) as a cache discriminator.
    Returns a tuple (hashable) which is converted back to list by embed_query.
    """
    global _client
    if _client is None:
        _client = genai.Client(api_key=settings.GEMINI_API_KEY)
        
    result = _client.models.embed_content(
        model=model_name,
        contents=query,
        config=types.EmbedContentConfig(
            task_type="RETRIEVAL_QUERY",
            output_dimensionality=768
        )
    )
    vec = result.embeddings[0].values
    
    # normalize
    arr = np.array(vec)
    norm = np.linalg.norm(arr)
    if norm > 0:
        normed = arr / norm
    else:
        normed = arr
        
    return tuple(normed.tolist())


class EmbeddingService:
    """
    Service for converting text queries into vector embeddings.

    Uses Gemini's model (gemini-embedding-001 with 768 dimensions)
    to ensure query and document vectors are in the same embedding space.
    Results are LRU-cached (maxsize=256) to skip duplicate API calls.
    """

    def __init__(self):
        """Initialize the Gemini embeddings client configurations."""
        self.model_name = settings.GEMINI_EMBEDDING_MODEL
        # Cache discriminator — avoids cross-key cache hits without exposing the key
        self._api_key_hash = str(hash(settings.GEMINI_API_KEY))

    def embed_query(self, query: str) -> List[float]:
        """
        Convert a text query into a vector embedding.
        Results are LRU-cached by query string to avoid duplicate Gemini API calls.

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
            before = _cached_embed_query.cache_info()
            embedding_tuple = _cached_embed_query(
                self.model_name, self._api_key_hash, query.strip()
            )
            after = _cached_embed_query.cache_info()
            if after.hits > before.hits:
                logger.info(
                    f"[EMBED CACHE HIT] Query served from cache "
                    f"(hits={after.hits}, misses={after.misses})"
                )
            return list(embedding_tuple)
        except Exception as e:
            raise Exception(f"Failed to generate embedding: {str(e)}")
