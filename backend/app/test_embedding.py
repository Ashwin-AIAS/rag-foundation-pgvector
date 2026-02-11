import google.generativeai as genai
import os
import sys

api_key = os.environ.get("GEMINI_API_KEY")
if not api_key:
    print("No API Key")
    sys.exit(1)

genai.configure(api_key=api_key)

print("--- Testing Embedding (retrieval_query) ---")
try:
    emb_model = "models/gemini-embedding-001"
    res = genai.embed_content(
        model=emb_model,
        content="test query",
        task_type="retrieval_query",
        output_dimensionality=768
    )
    print("Embedding Success")
    print(f"Dimension: {len(res['embedding'])}")
except Exception as e:
    print(f"Embedding Failed: {e}")
