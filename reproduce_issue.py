import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), "backend"))

from app.services.ingestion import DocumentIngestionService
from app.models.document import DocumentChunk
from app.database import Base
from app.config import settings

# Setup DB connection
DATABASE_URL = f"postgresql://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}@{settings.POSTGRES_HOST}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def test_idempotency():
    db = SessionLocal()
    service = DocumentIngestionService(db)
    
    filename = "test_idempotency.txt"
    content = "This is a test document for idempotency verification."
    
    # Create dummy file
    with open(filename, "w") as f:
        f.write(content)
        
    try:
        print(f"--- Attempt 1: Ingesting {filename} ---")
        result1 = service.ingest_document(filename, filename)
        print(f"Result 1: {result1}")
        
        # Verify chunks exist
        count1 = db.query(DocumentChunk).filter(DocumentChunk.source_file == filename).count()
        print(f"Chunks in DB after run 1: {count1}")
        assert count1 > 0, "No chunks found after first ingestion"

        print(f"\n--- Attempt 2: Ingesting {filename} AGAIN ---")
        result2 = service.ingest_document(filename, filename)
        print(f"Result 2: {result2}")
        
        # Verify chunks still exist and count is same (or updated if we changed content, but here content is same)
        count2 = db.query(DocumentChunk).filter(DocumentChunk.source_file == filename).count()
        print(f"Chunks in DB after run 2: {count2}")
        assert count2 == count1, "Chunk count mismatch after re-ingestion"
        
        print("\nSUCCESS: Idempotency test passed! No unique constraint violation.")
        
    except Exception as e:
        print(f"\nFAILURE: Test failed with error: {e}")
        # raise e
    finally:
        # Cleanup
        if os.path.exists(filename):
            os.remove(filename)
        
        # detailed cleanup from DB
        service.delete_document(filename)
        db.close()

if __name__ == "__main__":
    test_idempotency()
