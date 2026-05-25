import os
import sys
import time
from dotenv import load_dotenv

# Add parent directory to path so app modules can be imported
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import settings
from app.database import create_db_engine, check_database_connection, check_pgvector_extension
from sqlalchemy import text

def run_diagnostics():
    load_dotenv()
    
    print("=" * 60)
    print("DATABASE DIAGNOSTICS & HANDSHAKE VERIFICATION")
    print("=" * 60)
    
    # 1. Print Config Status
    print(f"USE_GCP_DB:                     {settings.USE_GCP_DB}")
    print(f"GCP_PROJECT_ID:                 {settings.GCP_PROJECT_ID}")
    print(f"DB_INSTANCE_CONNECTION_NAME:    {settings.DB_INSTANCE_CONNECTION_NAME or '[NOT CONFIGURED]'}")
    print(f"DB_IAM_USER:                    {settings.DB_IAM_USER or '[NOT CONFIGURED - USING STANDARD AUTH]'}")
    print(f"DATABASE_URL:                   {settings.database_url if not settings.USE_GCP_DB else 'Using Cloud SQL Connector'}")
    print("-" * 60)
    
    # 2. Test Connection
    print("Initializing Database Engine...")
    start_time = time.perf_counter()
    try:
        engine = create_db_engine()
        print("Engine created successfully.")
    except Exception as e:
        print(f"FAILED to initialize engine: {e}")
        return
        
    print("Connecting and executing handshake (SELECT 1)...")
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            val = result.scalar()
            latency = (time.perf_counter() - start_time) * 1000
            print(f"SUCCESS! Handshake returned: {val}")
            print(f"Connection Latency: {latency:.2f} ms")
    except Exception as e:
        print(f"FAILED to connect to database: {e}")
        print("\nPossible solutions:")
        if settings.USE_GCP_DB:
            print("1. Verify DB_INSTANCE_CONNECTION_NAME matches your GCP Cloud SQL instance.")
            print("2. Ensure the Cloud SQL Admin API is enabled in your Google Cloud Project.")
            print("3. Verify you have run 'gcloud auth application-default login' successfully.")
        else:
            print("1. Ensure your local PostgreSQL Docker container is running.")
            print("2. Verify local credentials in your .env file.")
        return
        
    # 3. Test pgvector Extension
    print("-" * 60)
    print("Checking pgvector Extension...")
    try:
        with engine.connect() as conn:
            ext_result = conn.execute(
                text("SELECT extname, extversion FROM pg_extension WHERE extname = 'vector'")
            ).fetchone()
            
            if ext_result:
                print(f"SUCCESS! pgvector version '{ext_result[1]}' is enabled in the database.")
            else:
                print("WARNING: pgvector extension is NOT enabled in the database.")
                print("Run: CREATE EXTENSION IF NOT EXISTS vector;")
    except Exception as e:
        print(f"FAILED to check pgvector extension: {e}")

    print("=" * 60)

if __name__ == "__main__":
    run_diagnostics()
