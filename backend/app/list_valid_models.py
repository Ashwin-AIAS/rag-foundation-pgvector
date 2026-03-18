import google.genai as genai
import os

api_key = os.environ.get("GEMINI_API_KEY")
genai.configure(api_key=api_key)

with open("valid_models.txt", "w") as f:
    try:
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                f.write(f"{m.name}\n")
    except Exception as e:
        f.write(f"Error: {e}\n")
