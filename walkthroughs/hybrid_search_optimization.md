# Hybrid Search Optimization Walkthrough

## Overview

We identified a critical performance bottleneck in the hybrid search implementation where full-text search vectors were being computed on-the-fly for every row, leading to O(N) query performance.

We optimized this by introducing a PostgreSQL `Generated Column` (`search_vector`) that pre-computes and indexes these vectors.

## Changes Applied

### 1. Database Schema Migration

Added a `search_vector` column to `document_chunks` table:

```sql
ALTER TABLE document_chunks
ADD COLUMN search_vector TSVECTOR
GENERATED ALWAYS AS (to_tsvector('english', chunk_text)) STORED;

CREATE INDEX idx_document_chunks_search_vector ON document_chunks USING GIN (search_vector);
```

### 2. Backend Code Updates

- **`backend/app/models/document.py`**: Updated `DocumentChunk` model to include the `Computed` column definition.
- **`backend/app/services/retrieval_service.py`**: Updated the hybrid search query to use the indexed `search_vector` column instead of calling `to_tsvector()` dynamically.

### 3. Deployment Configuration

- **`database/init.sql`**: Updated the initialization script to include the `search_vector` column and index. This ensures that new deployments (e.g., on Render/Supabase) will have the correct schema out of the box.

### 4. Troubleshooting: Missing Column

If you encounter `UndefinedColumn: column document_chunks.search_vector does not exist`:

1. The database schema might be out of sync.
2. Run the following command in your database tool (or via `psql`):
   ```sql
   ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS search_vector TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', chunk_text)) STORED;
   CREATE INDEX IF NOT EXISTS idx_document_chunks_search_vector ON document_chunks USING GIN (search_vector);
   ```

## Verification Results

### Automated Verification

Ran `verify_hybrid.py` inside the Docker container to confirm the new query executes successfully.

**Log Output:**

```
INFO:__main__:Running hybrid search for: 'RAG retrieval'
INFO:__main__:Retrieve took 124.50ms
INFO:__main__:Found 5 chunks
INFO:__main__:Hybrid search executed successfully!
```

### Performance Impact

- **Before**: Full table scan + On-the-fly vector computation (O(N))
- **After**: Indexed GIN search (O(log N))

The system is now scalable for large document sets.
