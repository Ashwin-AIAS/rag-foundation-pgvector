import google.generativeai as genai
import os
import sys

api_key = os.environ.get("GEMINI_API_KEY")
genai.configure(api_key=api_key)

print(f"GenAI Version: {genai.__version__}")

target_models = ['gemini-pro', 'gemini-1.5-flash', 'gemini-1.0-pro']

print("--- Searching for Target Models ---")
for m in genai.list_models():
    for target in target_models:
        if target in m.name:
            print(f"\nFOUND: {m.name}")
            print(f"  Methods: {m.supported_generation_methods}")
            print(f"  Description: {m.description}")
            
print("--- Done ---")
