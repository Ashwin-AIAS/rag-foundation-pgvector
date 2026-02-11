# Procedural Answer Quality Improvements

I have updated the RAG system to better handle procedural questions (e.g., "how to...") by adjusting chunking, retrieval, and prompt instructions.

## Changes

### 1. Configuration (`backend/app/config.py`)

- **Chunk Size**: Increased from 500 to **1000** tokens.
- **Chunk Overlap**: Set to **150** tokens.
    - *Why*: Larger chunks preserve more context and keep steps together.
- **Top K**: Increased from 5 to **8** chunks.
    - *Why*: Retrieves more steps of a procedure if they are spread across multiple chunks.

### 2. Prompt Engineering (`backend/app/services/prompt_service.py`)

- Added explicit system instructions:
    > "If the question asks 'how to' or for a procedure, format the answer as a clear, numbered list."
    > "Ensure all procedural steps are complete sentences and merged coherently."

## Verification

I verified the configuration and prompt changes using `verify_config_and_prompt.py`.

### Script Output
```
--- Verifying Configuration ---
CHUNK_SIZE: 1000 (Expected: 1000)
CHUNK_OVERLAP: 150 (Expected: 150)
TOP_K: 8 (Expected: 8)
Configuration verification PASSED

--- Verifying System Instructions ---
...
6. If the question asks "how to" or for a procedure, format the answer as a clear, numbered list.
7. Ensure all procedural steps are complete sentences and merged coherently from multiple chunks.
...
System instructions verification PASSED
```

## User Action Required

To see the full benefit of these changes, you should:
1.  **Restart the backend** (if not auto-reloaded).
2.  **Re-upload your procedural documents** so they are re-chunked with the new 1000-token size.
3.  Ask a question like "How do I [task]?"
