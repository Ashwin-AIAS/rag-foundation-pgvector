# Cross-Encoder Reranking Implementation

We have successfully combined both approaches!

1. **PostgreSQL Reciprocal Rank Fusion:** Rapidly finds the Top 15 chunks based on a mathematically sound blend of keyword search and vector similarity.
2. **Local Cross-Encoder Reranking:** Takes those 15 chunks, scores them specifically for question-answering relevance, and returns the top 5.

## What changed

- **`requirements.txt`**: Added `sentence-transformers>=2.3.0`
- **`backend/app/services/reranking_service.py`**: Completely rewrote the service.
  - **Removed:** All the Gemini configuration, complicated system prompts, LLM generation API calls, and flaky regex fallbacks trying to extract JSON integers from the LLM response.
  - **Added:** A lightweight, local HuggingFace Cross-Encoder model (`cross-encoder/ms-marco-MiniLM-L-6-v2`).
  - The model runs entirely on your CPU, evaluates pairs of `[question, chunk]`, and outputs standard Python float scores.
  - It assigns the exact scores to the chunks and returns the top 5 accurately sorted chunks to be fed into the final generative LLM step.

### Benefits of combining both

- **Speed:** The Cross-Encoder is tiny and runs locally in milliseconds, removing the network latency of waiting for the Gemini API just to filter text.
- **Accuracy:** Cross-Encoders are explicitly trained to score relevance. Generative LLMs are trained to write text, meaning Gemini was occasionally struggling or formatting the indices wrong.
- **Fewer Rate Limits:** By not asking Gemini to rerank chunks on every single query, you save massively on API quota, keeping the quota reserved specifically to write the final polished answer.
