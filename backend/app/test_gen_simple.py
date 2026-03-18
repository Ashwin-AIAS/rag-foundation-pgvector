import google.genai as genai
import os
import sys

# Hardcode key for testing if env var fails, but try env first
api_key = os.environ.get("GEMINI_API_KEY")
if not api_key:
    print("ERROR: GEMINI_API_KEY not found in env")
    sys.exit(1)

genai.configure(api_key=api_key)

print(f"GenAI Version: {genai.__version__}")
print("--- Checking Flash Models ---")
try:
    found = False
    for m in genai.list_models():
        if 'flash' in m.name:
             print(f"Found: {m.name}")
             print(f"  Methods: {m.supported_generation_methods}")
             found = True
    if not found:
        print("No 'flash' models found.")
except Exception as e:
    print(f"List Error: {e}")

print("--- Done ---")
