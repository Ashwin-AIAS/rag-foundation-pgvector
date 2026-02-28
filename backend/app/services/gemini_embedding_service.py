import google.generativeai as genai
import logging
import time
from typing import List
from app.config import settings

logger = logging.getLogger(__name__)


def _classify_embedding_error(e: Exception) -> str:
    """Return a short error category string for structured logging."""
    s = str(e).lower()
    if "429" in s or "quota" in s or "rate" in s:
        return "RATE_LIMIT_429"
    if "timeout" in s or "deadline" in s or "timed out" in s:
        return "TIMEOUT"
    if "too large" in s or "token" in s or "size" in s or "length" in s:
        return "TOKEN_SIZE_ERROR"
    if "invalid" in s or "api key" in s or "permission" in s or "403" in s:
        return "AUTH_ERROR"
    return "UNKNOWN"


class GeminiEmbeddingService:
    """
    Service for generating embeddings using Google's Gemini API.
    Uses text-embedding-004 (768-dimensional embeddings).
    Retries up to 2 extra times on rate-limit, timeout, or token-size errors.
    """

    def __init__(self):
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.model_name = settings.GEMINI_EMBEDDING_MODEL

    def embed_documents(self, texts: List[str], batch_size: int = 50) -> List[List[float]]:
        """
        Generate embeddings for a list of documents in batches.
        Batch size increased to 50 (fewer API round-trips for large docs).
        Adds 0.5s inter-batch sleep to avoid Gemini burst rate limits.
        Retries up to 2 times on transient errors (rate limit, timeout, token size).
        Raises on auth errors or exhausted retries.
        """
        embeddings = []
        MAX_RETRIES = 3  # 1 attempt + 2 retries

        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            batch_num = i // batch_size + 1

            last_error = None
            for attempt in range(MAX_RETRIES):
                try:
                    result = genai.embed_content(
                        model=self.model_name,
                        content=batch,
                        task_type="retrieval_document",
                        output_dimensionality=768
                    )

                    if 'embedding' in result:
                        batch_embeddings = result['embedding']
                        if isinstance(batch_embeddings, list) and len(batch_embeddings) > 0:
                            if isinstance(batch_embeddings[0], float):
                                # Single embedding returned unexpectedly — wrap it
                                embeddings.append(batch_embeddings)
                            else:
                                embeddings.extend(batch_embeddings)
                            logger.info(
                                f"[EMBED BATCH {batch_num}] OK — {len(batch)} texts embedded "
                                f"(attempt {attempt+1}/{MAX_RETRIES})"
                            )
                            break  # success
                        else:
                            raise ValueError(f"Empty embedding list returned for batch {batch_num}")
                    else:
                        raise ValueError(f"'embedding' key missing in API result: {result}")

                except Exception as e:
                    last_error = e
                    category = _classify_embedding_error(e)
                    retryable = category in ("RATE_LIMIT_429", "TIMEOUT", "TOKEN_SIZE_ERROR")

                    logger.error(
                        f"[EMBED FAIL] Batch {batch_num}, attempt {attempt+1}/{MAX_RETRIES} "
                        f"— category={category} error={e}"
                    )

                    if retryable and attempt < MAX_RETRIES - 1:
                        delay = 5 * (2 ** attempt)  # 5s, 10s
                        logger.warning(
                            f"[EMBED RETRY] Batch {batch_num} ({category}) — "
                            f"retrying in {delay}s (attempt {attempt+2}/{MAX_RETRIES})..."
                        )
                        time.sleep(delay)
                        continue

                    # Non-retryable or exhausted retries
                    logger.error(
                        f"[EMBED ABORT] Batch {batch_num} — category={category}, "
                        f"giving up after {attempt+1} attempt(s). Error: {e}"
                    )
                    raise e

            # 0.5s pause between batches to avoid Gemini burst rate limits
            if i + batch_size < len(texts):
                time.sleep(0.5)

        if len(embeddings) != len(texts):
            raise ValueError(
                f"Embedding count mismatch: expected {len(texts)}, got {len(embeddings)}. "
                f"Some batches may have failed silently."
            )

        return embeddings

    def embed_query(self, text: str) -> List[float]:
        """Generate embedding for a single query with retry."""
        MAX_RETRIES = 3
        last_error = None

        for attempt in range(MAX_RETRIES):
            try:
                result = genai.embed_content(
                    model=self.model_name,
                    content=text,
                    task_type="retrieval_query",
                    output_dimensionality=768
                )
                return result['embedding']
            except Exception as e:
                last_error = e
                category = _classify_embedding_error(e)
                if category in ("RATE_LIMIT_429", "TIMEOUT") and attempt < MAX_RETRIES - 1:
                    delay = 5 * (2 ** attempt)
                    logger.warning(f"[QUERY EMBED RETRY] {category} — retrying in {delay}s...")
                    time.sleep(delay)
                    continue
                raise e
