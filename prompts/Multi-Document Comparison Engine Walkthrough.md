# Walkthrough: Multi-Document Comparison Engine

I have successfully refactored the RAG system into a research-grade multi-document comparison engine while ensuring full backward compatibility with the existing hybrid search and API contract.

## Changes Made

### 1. Section-Aware Chunking (Task 1)

- Updated `CHUNK_SIZE` to 700 and `CHUNK_OVERLAP` to 100 in `config.py`.
- Modified `DocumentIngestionService.split_documents` to detect common research paper sections (e.g., Abstract, Introduction, Method, Results) using regex.
- Assigned the detected section to the `chunk_metadata["section"]` field before passing blocks to the `RecursiveCharacterTextSplitter`.

### 2. Structured Paper Summary Table (Task 2 & 3)

- Created the `PaperSummary` SQLAlchemy model in `app/models/document.py` to store key extracted fields (problem statement, methodology, evaluation metrics, limitations, etc.).
- Embedded a `CREATE TABLE IF NOT EXISTS paper_summaries` block in `main.py`’s startup event, exactly mirroring how `query_logs` is created ensuring migration safety.
- Updated `DocumentIngestionService` to perform a single summarization LLM call per ingested paper using `GenerationService`. The robust JSON parser safely extracts and commits these summaries to the database during ingestion.

### 3. Balanced Retrieval Mode (Task 4)

- Modified `RetrievalService.retrieve` to detect comparison intent (e.g., words like `compare`, `contrast`) when multiple files are selected by the user.
- If comparison is detected, the service automatically splits the retrieval into multiple independent subqueries for each `source_file` (with a strict `LIMIT 5` per paper) to ensure balanced representation and preventing one highly-ranked paper from drowning out the other.
- Added a `balanced_mode = True` metadata flag to the returned chunks.

### 4. Comparison Prompt Structure (Task 5)

- Updated `PromptService._build_context_section` to gracefully intercept the `balanced_mode` flag. If active, it groups chunks by paper, formatting the context cleanly as `--- Paper A ---`, `--- Paper B ---`.
- Implemented a specialized analytical comparison prompt in `PromptService._build_question_section` instructing the LLM to span methodologies, dataset metrics, and limitations.

### 5. Structured Summary Comparison Mode (Task 6)

- In the `/query` endpoint in `main.py`, added an optimization layer _before_ chunk retrieval: If exactly the selected papers have pre-computed summaries in the `paper_summaries` table, the system bypasses dense pgvector chunk retrieval and formatting, replacing it with the highly condensed structured summaries as mock chunks.

## Validation Results

- The application was carefully updated to preserve all existing `try/except/rollback` fallback loops (especially in hybrid vector search mismatch scenarios).
- The REST API signatures `/ingest` and `/query` are 100% unchanged.
- You can now test it by uploading two research papers and querying **"Differentiate these two papers"**.
