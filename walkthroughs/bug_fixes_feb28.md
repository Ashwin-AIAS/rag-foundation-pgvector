# Walkthrough — RAG Project Bug Fixes (Feb 28, 2026)

## Summary

Scanned the entire RAG project (30+ files) and identified **11 bugs**. All 11 have been fixed across **9 files**.

## Changes Made

### Critical Fixes

| #   | Bug                                                | File                         | What Changed                                                                                                                               |
| --- | -------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Event loop conflict in background ingestion        | `ingestion.py`               | Removed `async` from `ingest_document()` — nothing inside awaits. Eliminated `asyncio.get_event_loop()` dance in `ingest_document_sync()`. |
| 3   | Delete doesn't clean `documents`/`paper_summaries` | `document_service.py`        | Added cascading deletes to `documents` and `paper_summaries` tables.                                                                       |
| 4   | Cypher injection via user keywords                 | `graph_retrieval_service.py` | Replaced f-string interpolation with parameterized Cypher (`$kw_0`, `$kw_1`, etc.).                                                        |

### Moderate Fixes

| #   | Bug                                       | File                          | What Changed                                                      |
| --- | ----------------------------------------- | ----------------------------- | ----------------------------------------------------------------- |
| 2   | Double semaphore acquisition              | `ingestion.py`                | Clarified log message; kept single semaphore guard.               |
| 5   | Missing `models/` prefix on Gemini model  | `graph_extraction_service.py` | Added `f"models/{settings.GEMINI_MODEL}"` for consistency.        |
| 6   | IVFFlat index on empty table              | `main.py`                     | Added row-count guard (≥100 rows required) before index creation. |
| 7   | Embedding count mismatch silently ignored | `gemini_embedding_service.py` | Changed `logger.error()` to `raise ValueError()`.                 |

### Minor Fixes

| #   | Bug                           | File                  | What Changed                                                   |
| --- | ----------------------------- | --------------------- | -------------------------------------------------------------- |
| 8   | SQL `echo=True` in production | `database.py`         | Now controlled via `SQL_ECHO` env var (default `false`).       |
| 9   | Timestamp type mismatch       | `feedback.py`         | Changed `timestamp: str` → `timestamp: datetime`.              |
| 10  | Silent exception swallowing   | `document_service.py` | Added `self.db.rollback()` + `logger.debug()` in except block. |
| 11  | URL encoding in delete API    | `api.js`              | Added `encodeURIComponent(filename)`.                          |

## Verification

**Static verification passed:**

- ✅ No `async def ingest_document` in `ingestion.py`
- ✅ No `asyncio.get_event_loop` in backend
- ✅ No `CONTAINS '` string interpolation in Cypher queries
- ✅ No `echo=True` hardcoded in database engine

**Runtime verification** requires deploying to staging with PostgreSQL + pgvector + Gemini API key.
