import requests
import json

BASE_URL = "http://localhost:8000"

def debug_query():
    print("Debugging Query...")
    payload = {
        "question": "Where is Paris?",
        "top_k": 3
    }
    try:
        response = requests.post(f"{BASE_URL}/query", json=payload)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Answer: {data.get('answer')}")
            print(f"Num Chunks Retrieved: {data.get('num_chunks_retrieved')}")
            if data.get('retrieved_chunks'):
                print("First Chunk:")
                print(str(data['retrieved_chunks'][0])[:200])
        else:
            print(f"Error Response: {response.text[:500]}")
            
    except Exception as e:
        print(f"EXCEPTION: {e}")

if __name__ == "__main__":
    debug_query()
