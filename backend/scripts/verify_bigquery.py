import os
import sys
from dotenv import load_dotenv

# Add parent directory to path so app modules can be imported
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import settings
from app.services.bigquery_service import BigQueryService

def verify_bigquery_setup():
    load_dotenv()
    
    print("=" * 60)
    print("GOOGLE CLOUD BIGQUERY DIAGNOSTICS & SCHEMAS")
    print("=" * 60)
    
    print(f"GCP_PROJECT_ID:     {settings.GCP_PROJECT_ID}")
    print(f"USE_GCP_DB:         {settings.USE_GCP_DB}")
    print("-" * 60)
    
    if not settings.GCP_PROJECT_ID:
        print("ERROR: GCP_PROJECT_ID is not configured in your .env file.")
        return

    print("Initializing BigQuery Analytical Service...")
    try:
        bq_service = BigQueryService()
        if not bq_service.client:
            print("ERROR: BigQuery Client is disabled or failed to initialize.")
            return
        print("SUCCESS! BigQuery Client created successfully.")
    except Exception as e:
        print(f"FAILED to initialize BigQuery Service: {e}")
        print("\nPossible solutions:")
        print("1. Ensure you have run 'gcloud auth application-default login' successfully.")
        print("2. If using a service account key, verify that GOOGLE_APPLICATION_CREDENTIALS points to credentials.json.")
        return

    print(f"Fetching tables in dataset '{bq_service.dataset_id}'...")
    try:
        dataset_ref = bq_service.client.dataset(bq_service.dataset_id)
        tables = list(bq_service.client.list_tables(dataset_ref))
        
        print(f"SUCCESS! Accessible dataset: '{bq_service.dataset_id}'")
        print(f"Found {len(tables)} table(s):")
        for idx, table in enumerate(tables):
            full_table = bq_service.client.get_table(table.reference)
            columns = [f"{field.name} ({field.field_type})" for field in full_table.schema]
            print(f"  {idx+1}. Table: `{table.table_id}`")
            print(f"     Rows:    {full_table.num_rows}")
            print(f"     Columns: {', '.join(columns)}")
            
        if not tables:
            print("  (No tables found. Upload a CSV/Excel file via the RAG ingest pipeline to auto-create them.)")
            
    except Exception as e:
        print(f"FAILED to access dataset '{bq_service.dataset_id}': {e}")
        print("\nPossible solutions:")
        print("1. Ensure the BigQuery API is enabled in your Google Cloud Project.")
        print("2. Verify your credentials have 'BigQuery Admin' or 'BigQuery Data Editor' permissions.")
        
    print("=" * 60)

if __name__ == "__main__":
    verify_bigquery_setup()
