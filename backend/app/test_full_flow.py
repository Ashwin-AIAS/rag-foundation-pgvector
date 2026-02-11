import google.generativeai as genai
import os
import sys

api_key = os.environ.get("GEMINI_API_KEY")
if not api_key:
    print("No API Key")
    sys.exit(1)

print(f"GenAI Version: {genai.__version__}")
with open("models.txt", "w") as f:
    try:
        for m in genai.list_models():
            f.write(f"Name: {m.name}\n")
            f.write(f"Methods: {m.supported_generation_methods}\n")
            f.write("-" * 20 + "\n")
    except Exception as e:
        f.write(f"Error: {e}\n")

print("Models listed to models.txt")
