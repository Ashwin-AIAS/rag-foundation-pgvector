import os
import sys
from dotenv import load_dotenv

# Add parent directory to path so app modules can be imported
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import settings
from google.cloud import storage

def verify_gcs_connection():
    load_dotenv()
    
    print("=" * 60)
    print("GOOGLE CLOUD STORAGE (GCS) BUCKET SCANNER")
    print("=" * 60)
    
    print(f"GCP_PROJECT_ID:     {settings.GCP_PROJECT_ID}")
    print(f"GCS_BUCKET_NAME:    {settings.GCS_BUCKET_NAME or '[NOT CONFIGURED]'}")
    print("-" * 60)
    
    if not settings.GCP_PROJECT_ID:
        print("ERROR: GCP_PROJECT_ID is not configured in your .env file.")
        return

    if not settings.GCS_BUCKET_NAME:
        print("INFO: GCS_BUCKET_NAME is not configured in your .env file.")
        print("To test GCS ingestion, please add a valid bucket name to GCS_BUCKET_NAME in your .env.")
        return

    print("Initializing Google Cloud Storage Client...")
    try:
        # Client automatically resolves credentials (ADC or GOOGLE_APPLICATION_CREDENTIALS)
        client = storage.Client(project=settings.GCP_PROJECT_ID)
        print("Storage Client created successfully.")
    except Exception as e:
        print(f"FAILED to initialize Storage Client: {e}")
        print("\nPossible solutions:")
        print("1. Ensure you have run 'gcloud auth application-default login' successfully.")
        print("2. If using a service account key, verify that GOOGLE_APPLICATION_CREDENTIALS env var points to your credentials.json file.")
        return

    print(f"Connecting to bucket '{settings.GCS_BUCKET_NAME}' and listing blobs...")
    try:
        bucket = client.bucket(settings.GCS_BUCKET_NAME)
        blobs = list(client.list_blobs(bucket, max_results=10))
        
        print(f"SUCCESS! Accessible bucket: '{settings.GCS_BUCKET_NAME}'")
        print(f"Found {len(blobs)} blob(s) (displaying up to 10):")
        for idx, blob in enumerate(blobs):
            size_kb = blob.size / 1024 if blob.size else 0
            print(f"  {idx+1}. {blob.name} ({size_kb:.2f} KB) - Updated: {blob.updated}")
            
        if not blobs:
            print("  (Bucket is empty. Drop files into this bucket to trigger ingestion.)")
            
    except Exception as e:
        print(f"FAILED to connect to bucket: {e}")
        print("\nPossible solutions:")
        print("1. Ensure the bucket name is spelled correctly.")
        print("2. Verify that your authenticated credentials have the 'Storage Object Admin' or 'Storage Object Viewer' role on this bucket.")
        print("3. Ensure the bucket belongs to the project or permissions are configured correctly.")
        
    print("=" * 60)

if __name__ == "__main__":
    verify_gcs_connection()
