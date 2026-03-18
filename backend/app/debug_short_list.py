import google.genai as genai
import os

api_key = os.environ.get("GEMINI_API_KEY")
genai.configure(api_key=api_key)

print("--- Models supporting generateContent ---")
try:
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(f"Name: {m.name}")
except Exception as e:
    print(f"Error: {e}")
print("--- End ---")
