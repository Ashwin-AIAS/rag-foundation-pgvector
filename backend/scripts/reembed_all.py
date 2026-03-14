import os
import sys
import logging
import time
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Ensure the backend directory is in the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.document import DocumentChunk
from app.services.gemini_embedding_service import GeminiEmbeddingService

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

def run_migration():
    logger.info("Starting re-embedding migration to gemini-embedding-001...")
    
    embedding_service = GeminiEmbeddingService()
    
    db = SessionLocal()
    try:
        total_chunks = db.query(DocumentChunk).count()
        logger.info(f"Total chunks to re-embed: {total_chunks}")
        
        if total_chunks == 0:
            logger.info("No chunks to process. Exiting.")
            return

        batch_size = 20  # Reduced for low-quota environments
        processed = 0
        
        for offset in range(0, total_chunks, batch_size):
            chunks = db.query(DocumentChunk).order_by(DocumentChunk.id).offset(offset).limit(batch_size).all()
            
            if not chunks:
                break
                
            texts = [chunk.chunk_text for chunk in chunks]
            
            logger.info(f"Processing batch from offset {offset} to {offset + len(chunks)} of {total_chunks}...")
            
            try:
                embeddings = embedding_service.embed_documents(texts, batch_size=batch_size)
                
                for i, chunk in enumerate(chunks):
                    # Assign new normalized 768-D vector
                    chunk.embedding = embeddings[i]
                
                db.commit()
                processed += len(chunks)
                logger.info(f"Successfully processed and committed up to offset {offset + len(chunks)}.")
                
                # Wait longer between batches to respect rate limits
                if offset + batch_size < total_chunks:
                    time.sleep(5)
                
            except Exception as e:
                db.rollback()
                logger.error(f"Failed to process batch at offset {offset}: {e}")
                raise
                
    finally:
        db.close()
        
    logger.info(f"Migration complete. Successfully re-embedded {processed} chunks.")

if __name__ == "__main__":
    run_migration()
