import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), "backend"))

from app.config import settings
from app.services.prompt_service import PromptService

def verify_changes():
    print("--- Verifying Configuration ---")
    print(f"CHUNK_SIZE: {settings.CHUNK_SIZE} (Expected: 1000)")
    print(f"CHUNK_OVERLAP: {settings.CHUNK_OVERLAP} (Expected: 150)")
    print(f"TOP_K: {settings.TOP_K} (Expected: 8)")
    
    assert settings.CHUNK_SIZE == 1000, "CHUNK_SIZE mismatch"
    assert settings.CHUNK_OVERLAP == 150, "CHUNK_OVERLAP mismatch"
    assert settings.TOP_K == 8, "TOP_K mismatch"
    print("Configuration verification PASSED")
    
    print("\n--- Verifying System Instructions ---")
    service = PromptService()
    instructions = service._build_system_instructions()
    print(instructions)
    
    assert "format the answer as a clear, numbered list" in instructions, "Procedural instruction missing"
    assert "merged coherently from multiple chunks" in instructions, "Coherence instruction missing"
    print("System instructions verification PASSED")

if __name__ == "__main__":
    verify_changes()
