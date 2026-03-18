import sys
import os
import traceback
import google.genai as genai

# Add /app to path
sys.path.append('/app')

try:
    from app.config import settings
    genai.configure(api_key=settings.GEMINI_API_KEY)
    
    model_name = "models/gemini-pro"
    print(f"Testing model: {model_name}")
    model = genai.GenerativeModel(model_name)
    
    print("Testing generate_content WITHOUT config...")
    try:
        res = model.generate_content("Hello")
        print(f"Success: {res.text}")
    except Exception as e:
        print(f"Generate Failed: {e}")
        # print full traceback to stdout
        traceback.print_exc()

except Exception as e:
    print(f"Init Failed: {e}")
