# Autonomous RAG Planner Integration Walkthrough

This document outlines the changes made to integrate the 4-phase autonomous RAG planner from the provided PDF guide.

## Changes Made
- **Created Planner Prompts:** Added `PHASE1_PROMPT`, `PHASE2_PROMPT`, `PHASE3_PROMPT`, and `PHASE4_PROMPT` as string constants in `backend/app/services/prompt_service.py`. These prompts are meticulously calibrated for pgvector and Gemini embeddings, as specified in the PDF.
- **Implemented Fallback Mechanism:** Added the `DEFAULT_PLAN` object and a local `safe_parse` function to safely parse the JSON objects returned by the LLM, ensuring the system can degrade gracefully if JSON format is broken.
- **Created `build_autonomous_plan` Pattern:** Added the chained async function to `PromptService` that walks through Classification (Phase 1), Tool Routing (Phase 2), Parameter Optimization (Phase 3), and Self-Reflection (Phase 4).
- **Retained Backwards Compatibility:** The existing `construct_prompt` method and its structural companions (`_build_context_section`, `_build_system_instructions`) were left unchanged and appended below the new `build_autonomous_plan` to prevent the live API backend (`/query` endpoint in `app/main.py`) from breaking immediately pending full pipeline adaptation.

## Validation Strategy
- Executed `python -m py_compile app/services/prompt_service.py` to assert that the file's syntax remains flawless after the extensive rewrite.
- Verified that `json` and `logging` modules are natively imported and accessible.
- Validated that the `GenerationService` import works successfully, resolving internal module imports directly.

## Next Steps for the User
To fully switch to the new autonomous mode, `backend/app/main.py`'s `/query` endpoint will need to be refactored to:
1. Call `await prompt_service.build_autonomous_plan(request.question, top_reranker_score)` instead of explicitly forming an exact `top_k=15` single search.
2. Route the RAG pipeline dynamically via `plan["primary_tool"]` and implement the reflection iteration cap as defined by `plan["max_reflection_loops"]`.
