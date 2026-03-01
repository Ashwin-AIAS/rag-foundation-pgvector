import logging
from typing import List, Dict, Any, Tuple

from sentence_transformers import CrossEncoder
from app.config import settings

logger = logging.getLogger(__name__)

# Hard ceiling for reranker input to control latency
MAX_CHUNKS_FOR_RERANKING = 15
RERANK_RETURN_COUNT = 5

class RerankingService:
    """Rerank retrieved chunks using a fast local Cross-Encoder."""
    
    _model_instance = None
    
    @classmethod
    def get_model(cls):
        """Lazy load the model to avoid slow startup times until first use."""
        if cls._model_instance is None:
            logger.info("Loading Cross-Encoder model (ms-marco-MiniLM-L-6-v2) for the first time...")
            # We use a fast, lightweight cross-encoder model ideal for CPU inference
            cls._model_instance = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')
            logger.info("Cross-Encoder model loaded successfully.")
        return cls._model_instance

    def __init__(self):
        # We don't load the model in init to keep service instantiation fast
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

        # Trim to ceiling to ensure fast latency
        candidates = chunks[:MAX_CHUNKS_FOR_RERANKING]

        try:
            model = self.get_model()
            
            # Format input as a list of [query, chunk_text] pairs for the Cross-Encoder
            sentence_pairs = [[question, c["chunk_text"]] for c in candidates]
            
            # Predict scores
            scores = model.predict(sentence_pairs)
            
            # Attach scores to chunks
            for i, score in enumerate(scores):
                candidates[i]["cross_encoder_score"] = float(score)
                # Keep the original final_score (from RRF) for debugging/logging
                candidates[i]["rrf_score"] = candidates[i].get("final_score", 0.0)
                # Ensure the system sorts by the new score if it relies on final_score downstream
                candidates[i]["final_score"] = float(score)

            # Sort by the new cross-encoder score descending
            reranked = sorted(candidates, key=lambda x: x["cross_encoder_score"], reverse=True)
            
            return reranked[:top_n], True

        except Exception as e:
            logger.error(f"Cross-Encoder Reranking failed: {e}")
            # Fallback to the original RRF order
            return chunks[:top_n], False
