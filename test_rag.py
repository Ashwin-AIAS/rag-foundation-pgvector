import requests
import json

BASE_URL = "http://localhost:8000"

def test_ingestion():
    print("Testing Ingestion...")
    try:
        # Create a dummy text file
        with open("test_doc.txt", "w") as f:
            f.write("The capital of France is Paris. The capital of Germany is Berlin.")
        
        files = {'file': ('test_doc.txt', open('test_doc.txt', 'rb'), 'text/plain')}
        response = requests.post(f"{BASE_URL}/ingest", files=files)
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            print("SUCCESS: Ingestion worked.")
            data = response.json()
            # print keys only
            print(f"Response Keys: {list(data.keys())}")
            if 'chunks' in data:
                print(f"Number of chunks: {len(data['chunks'])}")
            return True
        else:
            print("FAILURE: Ingestion failed.")
            print(f"Error Response First 500 chars: {response.text[:500]}")
            return False
            
    except Exception as e:
        print(f"EXCEPTION: {e}")
        return False

if __name__ == "__main__":
    test_ingestion()
