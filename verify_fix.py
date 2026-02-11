import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), "backend"))

from app.config import settings

def verify_fix():
    print("--- Verifying Configuration ---")
    print(f"GENERATION_MAX_TOKENS: {settings.GENERATION_MAX_TOKENS} (Expected: 2048)")
    
    assert settings.GENERATION_MAX_TOKENS == 2048, "GENERATION_MAX_TOKENS mismatch"
    print("Configuration verification PASSED")

if __name__ == "__main__":
    verify_fix()
