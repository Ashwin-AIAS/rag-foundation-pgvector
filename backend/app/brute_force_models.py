import requests
import os

api_key = os.environ.get("GEMINI_API_KEY")
candidates = [
    "gemini-pro",
    "gemini-1.0-pro",
    "gemini-1.5-pro",
    "gemini-1.5-flash",
    "gemini-1.5-pro-latest",
    "gemini-1.5-flash-latest",
    "gemini-ultra",
    "gemini-1.0-pro-001"
]

print("Testing candidates...")
for model in candidates:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    try:
        resp = requests.post(url, json={"contents": [{"parts": [{"text": "Hello"}]}]})
        print(f"{model}: {resp.status_code}")
        if resp.status_code == 200:
            print(f"  SUCCESS! {resp.text[:100]}")
    except Exception as e:
        print(f"{model}: Error {e}")
