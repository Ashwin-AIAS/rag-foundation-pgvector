import logging
from sqlalchemy import text
from app.database import engine

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate():
    """
    Add search_vector column to document_chunks table if it doesn't exist.
    """
    try:
        with engine.connect() as conn:
            # Check if column exists
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='document_chunks' AND column_name='search_vector';
            """))
            
            if result.rowcount > 0:
                logger.info("Column 'search_vector' already exists. Skipping migration.")
                return

            logger.info("Adding 'search_vector' column (Computed TSVECTOR)...")
            
            # Add Computed Column
            # Note: 'STORED' means it's computed on write and stored on disk (needed for indexing)
            conn.execute(text("""
                ALTER TABLE document_chunks
                ADD COLUMN search_vector TSVECTOR
                GENERATED ALWAYS AS (to_tsvector('english', chunk_text)) STORED;
            """))
            
            logger.info("Creating GIN index on 'search_vector'...")
            
            # Add GIN Index
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_document_chunks_search_vector
                ON document_chunks
                USING GIN (search_vector);
            """))
            
            conn.commit()
            logger.info("Migration completed successfully!")
            
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        raise

if __name__ == "__main__":
    migrate()
