# Multi-Document Retrieval — Walkthrough

## Problem

When multiple documents are selected and a user asks a cross-document question (e.g. _"How are all these papers related?"_), the system retrieved top-k chunks **globally**. Some documents ended up with zero representation in the context, causing incomplete answers.

## What Changed

### 1. `retrieval_service.py` — Per-Document Retrieval

- When `len(source_files) > 1` and the query is **not** a compare/contrast query, `MULTI_DOC_MODE` activates
- Retrieves **3 chunks per document** by looping through each source file
- Tags every chunk with `"multi_doc_mode": True` metadata
- Returns the combined list — no global ranking

### 2. `prompt_service.py` — Grouped Context + Analysis Prompt

- Detects `multi_doc_mode` metadata → uses grouped context format (`--- Paper A (filename) ---`)
- Adds a dedicated prompt instructing the LLM to analyze each document's topic/contribution/domain, then identify themes, differences, and relationships in a structured table

### 3. `main.py` — Skip Reranker

- The LLM reranker globally re-sorts chunks and keeps only top-5
- In multi-doc mode, this would drop documents — so the reranker is skipped

## Safety Compliance

| Rule                                | Status |
| ----------------------------------- | ------ |
| No increase to global top-k         | ✅     |
| No change to embedding model        | ✅     |
| No database schema changes          | ✅     |
| Existing hybrid search intact       | ✅     |
| Existing balanced comparison intact | ✅     |
