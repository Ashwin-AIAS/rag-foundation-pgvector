import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=api_key)

model_name = os.getenv("GEMINI_MODEL")
print(f"Testing model: {model_name}")

try:
    model = genai.GenerativeModel(f"models/{model_name}")
    response = model.generate_content("Hello, can you hear me?")
    print(f"Success! Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
