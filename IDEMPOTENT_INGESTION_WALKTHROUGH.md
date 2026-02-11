# Idempotent Ingestion Walkthrough

I have implemented idempotent document ingestion to prevent unique constraint violations when uploading the same document multiple times.

## Changes

### 1. Ingestion Service (`backend/app/services/ingestion.py`)

- Modified `store_chunks` to wrap operations in a transaction.
- Added a check for existing chunks with the same `source_file`.
- If found, existing chunks are deleted **before** new chunks are inserted.
- Added logging to track replacements.

## Verification

I created a reproduction script `reproduce_issue.py` that:
1.  Ingests a test document.
2.  Verifies chunks exist in the database.
3.  Ingests the *same* document again.
4.  Verifies no errors occur and chunks still exist (replaced).

### Test Results

```
--- Attempt 1: Ingesting test_idempotency.txt ---
Result 1: {'filename': 'test_idempotency.txt', 'num_chunks': 1, 'num_pages': 1, 'status': 'success'}
Chunks in DB after run 1: 1

--- Attempt 2: Ingesting test_idempotency.txt AGAIN ---
Result 2: {'filename': 'test_idempotency.txt', 'num_chunks': 1, 'num_pages': 1, 'status': 'success'}
Chunks in DB after run 2: 1

SUCCESS: Idempotency test passed! No unique constraint violation.
```

## Next Steps

- You can now safely re-upload documents via the frontend without errors.
- The `reproduce_issue.py` script can be deleted or kept for regression testing.
