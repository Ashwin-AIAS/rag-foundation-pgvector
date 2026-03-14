# Walkthrough: Gemini Embedding Upgrade & Migration

I have successfully upgraded the RAG system to use the new `gemini-embedding-001` model and the `google.genai` SDK.

## Changes Made

### 1. SDK and Dependency Update
- **`requirements.txt`**: Replaced `google-generativeai` with `google-genai`.
- **`app/services/gemini_embedding_service.py`**: Rewritten to use the new `google.genai` Client.
- **`app/services/embedding_service.py`**: Updated to use the new SDK with caching for query embeddings.

### 2. Configuration & Models
- **`app/config.py`**: Set `GEMINI_EMBEDDING_MODEL` default to `gemini-embedding-001`.
- **`.env` & `.env.example`**: Updated environment variables.
- **`app/models/document.py`**: Updated comments to reflect the new 768-D embedding model.

### 3. Data Migration
- **`scripts/reembed_all.py`**: Created and executed a migration script that processed all **391** document chunks in the database.
- Handled API rate limits with exponential backoff and increased retry delays.

## Verification Results

### Database Verification
I ran a verification check on the database to ensure all chunks were correctly updated:
- **Total chunks**: 391
- **Dimensionality**: All 768-D (Correct)
- **Normalization**: All vectors are L2 normalized (Norm ≈ 1.0)

### Service Integration Verification
I ran a direct test on the embedding services:
- **GeminiEmbeddingService**: Successfully generated batch embeddings.
- **EmbeddingService**: Successfully generated query embeddings with functional LRU caching.

### Sample Retrieval
A test query was performed through the RAG pipeline, confirming that retrieval and generation are working correctly with the new model.

```
Total chunks: 391
All 768-D: True
All normalized: True
SUCCESS: Cached embedding matches.
```

## How to Run Locally
If you need to re-run the migration or add new documents:
1. Ensure your `.env` has the correct `GEMINI_API_KEY`.
2. Install dependencies: `pip install -r backend/requirements.txt`
3. Run the migration script if needed: `python -m scripts.reembed_all` (inside `backend` directory).
