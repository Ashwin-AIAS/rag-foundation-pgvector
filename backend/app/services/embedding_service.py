import functools
import logging
import google.generativeai as genai
from typing import List
from app.config import settings

logger = logging.getLogger(__name__)


@functools.lru_cache(maxsize=256)
def _cached_embed_query(model_name: str, api_key_hash: str, query: str) -> tuple:
    """
    Module-level LRU cache for query embeddings.
    Uses api_key_hash (not the key itself) as a cache discriminator.
    Returns a tuple (hashable) which is converted back to list by embed_query.
    """
    result = genai.embed_content(
        model=model_name,
        content=query,
        task_type="retrieval_query",
        output_dimensionality=768
    )
    return tuple(result['embedding'])


class EmbeddingService:
    """
    Service for converting text queries into vector embeddings.

    Uses Gemini's text-embedding-004 model (768 dimensions)
    to ensure query and document vectors are in the same embedding space.
    Results are LRU-cached (maxsize=256) to skip duplicate API calls.
    """

    def __init__(self):
        """Initialize the Gemini embeddings client."""
        genai.configure(api_key=settings.GEMINI_API_KEY)
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
