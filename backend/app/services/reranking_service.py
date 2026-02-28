"""
Reranking Service — LLM-based second-stage chunk relevance reranking.

After initial vector retrieval (top_k=15), the top chunks are sent to the LLM
which ranks them by contextual relevance to the user question.  The top 5 are
returned.  If the LLM call fails or returns invalid JSON, the original vector
order is preserved as a fallback.
"""

import json
import logging
import asyncio
from typing import List, Dict, Any, Optional, Tuple

import google.generativeai as genai
from app.config import settings

logger = logging.getLogger(__name__)

# Hard ceiling for reranker input to control latency
MAX_CHUNKS_FOR_RERANKING = 15
RERANK_RETURN_COUNT = 5
RERANKER_TIMEOUT_SECONDS = 10


class RerankingService:
    """Rerank retrieved chunks using Gemini at temperature=0."""

    def __init__(self):
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model_name = f"models/{settings.GEMINI_MODEL}"
        self.model = genai.GenerativeModel(model_name)

    def rerank(
        self,
        question: str,
        chunks: List[Dict[str, Any]],
        top_n: int = RERANK_RETURN_COUNT,
    ) -> Tuple[List[Dict[str, Any]], bool]:
        """
        Rerank *chunks* by relevance to *question*.

        Returns:
            (reranked_chunks, rerank_succeeded)
        """
        if len(chunks) <= top_n:
            return chunks, False  # nothing to rerank

        # Trim to ceiling
        candidates = chunks[:MAX_CHUNKS_FOR_RERANKING]

        prompt = self._build_prompt(question, candidates, top_n)

        try:
            generation_config = genai.types.GenerationConfig(
                temperature=0.0,
                max_output_tokens=256,
            )

            response = self.model.generate_content(
                prompt,
                generation_config=generation_config,
            )

            indices = self._parse_response(response.text, len(candidates))

            if indices is None or len(indices) == 0:
                logger.warning("Reranker returned no valid indices — falling back")
                return chunks[:top_n], False

            reranked = [candidates[i] for i in indices[:top_n]]
            logger.info(f"Reranking succeeded: selected indices {indices[:top_n]}")
            return reranked, True

        except Exception as e:
            logger.error(f"Reranking failed: {e}")
            return chunks[:top_n], False

    # ---- internal helpers ----

    @staticmethod
    def _build_prompt(
        question: str, chunks: List[Dict[str, Any]], top_n: int
    ) -> str:
        numbered = "\n".join(
            f"[{i}] {c['chunk_text'][:400]}" for i, c in enumerate(chunks)
        )
        return (
            "You are a relevance ranker. Given the user question and numbered "
            "document chunks, return a JSON array of the indices (integers) of "
            f"the {top_n} MOST relevant chunks, ordered best first.\n\n"
            "RULES:\n"
            "- Output ONLY a JSON array of integers, e.g. [3, 0, 7, 1, 4]\n"
            "- No explanation, no markdown, no extra text.\n"
            "- Use 0-based indices.\n\n"
            f"Question: {question}\n\n"
            f"Chunks:\n{numbered}"
        )

    @staticmethod
    def _parse_response(text: str, max_index: int) -> Optional[List[int]]:
        """Parse the LLM response into a list of valid indices.
        
        Robust against common LLM output issues:
        - Extra text before/after the JSON array
        - Markdown code fences
        - Truncated arrays (missing closing bracket)
        """
        import re

        clean = text.strip()

        # Strip markdown code fences if present
        if clean.startswith("```"):
            clean = clean.split("\n", 1)[-1]
        if clean.endswith("```"):
            clean = clean.rsplit("```", 1)[0]
        clean = clean.strip()

        # Strategy 1: Try to extract a complete JSON array from anywhere in the response
        array_match = re.search(r'\[[\d\s,]+\]', clean)
        if array_match:
            try:
                parsed = json.loads(array_match.group(0))
                if isinstance(parsed, list):
                    valid = [int(i) for i in parsed if isinstance(i, (int, float)) and 0 <= int(i) < max_index]
                    if valid:
                        return valid
            except json.JSONDecodeError:
                pass

        # Strategy 2: Extract all integers from the response (handles truncated arrays like "[3, 5, 2,")
        numbers = re.findall(r'\b(\d+)\b', clean)
        if numbers:
            valid = [int(n) for n in numbers if 0 <= int(n) < max_index]
            # Deduplicate while preserving order
            seen = set()
            deduped = []
            for v in valid:
                if v not in seen:
                    seen.add(v)
                    deduped.append(v)
            if deduped:
                logger.info(f"Reranker indices extracted via fallback regex: {deduped}")
                return deduped

        logger.warning(f"Reranker parse failed completely: {clean[:200]}")
        return None
