import google.generativeai as genai
import sys
import os
sys.path.append('/app')
from app.config import settings

genai.configure(api_key=settings.GEMINI_API_KEY)

print("Listing available models:")
for m in genai.list_models():
    print(f"name: {m.name}")
    print(f"supported_generation_methods: {m.supported_generation_methods}")

print("\nTesting generation with current config:")
model_name = f"models/{settings.GEMINI_MODEL}"
print(f"Attempting valid model: {model_name}")
try:
    model = genai.GenerativeModel(model_name)
    response = model.generate_content("Hello")
    print(f"Success: {response.text}")
except Exception as e:
    print(f"Error with {model_name}: {e}")

print("\nTesting generation WITHOUT prefix:")
model_name_no_prefix = settings.GEMINI_MODEL
print(f"Attempting valid model: {model_name_no_prefix}")
try:
    model = genai.GenerativeModel(model_name_no_prefix)
    response = model.generate_content("Hello")
    print(f"Success: {response.text}")
except Exception as e:
    print(f"Error with {model_name_no_prefix}: {e}")
