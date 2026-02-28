# Structured Per-Document Retrieval — Walkthrough

## What Changed

Modified the MULTI_DOC_MODE block in `backend/app/services/retrieval_service.py` to use **structured internal retrieval** instead of a single user-query retrieval.

### Before → After

|                      | Before              | After                                                    |
| -------------------- | ------------------- | -------------------------------------------------------- |
| **Queries per doc**  | 1 (user's question) | 3 (main contribution, methodology, experimental results) |
| **LIMIT per query**  | 3                   | 1                                                        |
| **Total chunks/doc** | up to 3             | up to 3                                                  |
| **Embedding calls**  | 0 extra             | 3 (computed once, reused across docs)                    |

## How It Works

1. When MULTI_DOC_MODE activates (2+ documents selected, non-comparison query):
   - Embeds `"main contribution"`, `"methodology"`, `"experimental results"` once
   - For each document, runs 3 hybrid-search sub-queries with `LIMIT 1` each
   - Deduplicates and tags chunks with `multi_doc_mode: True`
2. Reranking remains skipped in `main.py` to preserve per-document balance
3. The balanced comparison path (compare/contrast keywords) is unchanged

## Verification

- **Syntax check**: Passed ✅
- **No schema changes**: Uses existing `retrieve()` sub-query path
- **Token budget**: Same total chunk count (3 per document) as before
