# RAG Ingestion Optimization Walkthrough

I have optimized the document ingestion pipeline to significantly reduce overhead and API calls.

## Changes Implemented

### 1. Configuration Tuning

- **Chunk Size**: Increased to `1500` (from `1000`) with `150` overlap. This reduces the total number of chunks per document.
- **File Size Limit**: Increased to `15MB` (from `10MB`).

### 2. Batch Embeddings

Refactored `GeminiEmbeddingService` to use the Google GenAI SDK's batching capabilities.

- **Before**: Iterated 1-by-1 calling `embed_content`.
- **After**: Sends chunks in lists of up to 20 to `embed_content`, reducing HTTP overhead.

### 3. Bulk Database Insert

Optimized `ingestion.py` to use SQLAlchemy's `bulk_save_objects`.

- **Before**: `db.add()` loops with potential multiple commits (though logic was `add_all` before, `bulk_save_objects` is faster).
- **Consolidated Commit**: database commit now happens once per document transaction.

### 4. Performance Instrumentation

Added detailed timing logs for every stage of ingestion.
Example Log Output:

```json
INGEST_METRICS: {
    "file_read_ms": 120.5,
    "chunking_ms": 45.2,
    "embedding_ms": 850.0,
    "db_insert_ms": 150.3,
    "total_ms": 1166.0
}
```

## Verification

Ran a static verification script `verify_optimizations.py` to ensure:

- Config values are correctly loaded.
- `GeminiEmbeddingService` accepts lists and handles batch logic.
- `DocumentIngestionService` flow is valid and imports updated dependencies.

## Next Steps

- Deploy changes.
- Monitor `INGEST_METRICS` in logs during next upload to quantify speedup.
