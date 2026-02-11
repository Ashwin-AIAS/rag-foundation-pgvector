# Fixing Incomplete Answers

I have increased the generation token limit to allow for detailed, step-by-step procedural answers.

## Changes

### 1. Configuration (`backend/app/config.py`)

- **Max Tokens**: Increased `GENERATION_MAX_TOKENS` from **500** to **2048**.
    - *Why*: The previous limit of 500 tokens was causing the model to cut off long procedural answers (e.g., stopping after step 1). 2048 tokens is sufficient for comprehensive guides.

### 2. Debugging (`backend/app/services/generation_service.py`)

- Added debug logging to capture:
    - Length of the generated answer.
    - Prompt feedback (safety block reasons, etc.).

## Verification

I verified the configuration change using `verify_fix.py`.

### Script Output
```
--- Verifying Configuration ---
GENERATION_MAX_TOKENS: 2048 (Expected: 2048)
Configuration verification PASSED
```

## User Action Required

To see the fixed answers:
1.  **Restart the backend** (if not auto-reloaded).
2.  Ask the procedural question again (e.g., "How to perform squats").
3.  The answer should now be complete and not truncated.
