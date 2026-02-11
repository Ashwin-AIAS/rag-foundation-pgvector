import sys
import os
import traceback

# Add /app to path
sys.path.append('/app')

try:
    from app.services.generation_service import GenerationService
    
    print("Initializing GenerationService...")
    service = GenerationService()
    print(f"Model Name: {service.model.model_name}")
    
    print("Testing generate...")
    try:
        res = service.generate("Hello, are you there?")
        print(f"Success: {res}")
    except Exception as e:
        print(f"Generate Failed: {e}")
        with open("error.log", "w") as f:
            traceback.print_exc(file=f)
            
except Exception as e:
    print(f"Import/Init Failed: {e}")
    with open("error.log", "w") as f:
        traceback.print_exc(file=f)
