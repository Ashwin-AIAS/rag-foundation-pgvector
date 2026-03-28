import logging
from typing import List, Dict, Any, Tuple

from app.config import settings

logger = logging.getLogger(__name__)

# Hard ceiling for reranker input to control latency
MAX_CHUNKS_FOR_RERANKING = 15
RERANK_RETURN_COUNT = 5

class RerankingService:
    """Rerank retrieved chunks using a fast local Cross-Encoder."""
    
    @classmethod
    def get_model(cls):
        """Deprecated: PyTorch models OOM on Render's 512MB free tier."""
        return None

    def __init__(self):
        # PyTorch cross-encoder removed to save 800MB+ of RAM
        pass

    def rerank(
        self,
        question: str,
        chunks: List[Dict[str, Any]],
        top_n: int = RERANK_RETURN_COUNT,
    ) -> Tuple[List[Dict[str, Any]], bool]:
        """
        Rerank *chunks* by relevance to *question* using a Cross-Encoder.

        Returns:
            (reranked_chunks, rerank_succeeded)
        """
        if len(chunks) <= top_n:
            return chunks, False  # nothing to rerank

        # Reranking is disabled to prevent Out-Of-Memory crashes on 512MB instances.
        # Hybrid search (pgvector + keyword) scores are preserved.
        return chunks[:top_n], False
