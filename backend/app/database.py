from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings
import os

# Create database engine
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,  # Verify connections before using them
    echo=os.getenv("SQL_ECHO", "false").lower() == "true",
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for ORM models
Base = declarative_base()

def get_db():
    """
    Dependency function to get database session.
    Use with FastAPI's Depends() for automatic session management.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def check_database_connection() -> bool:
    """
    Check if database connection is working.
    Returns True if connection is successful, False otherwise.
    """
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return True
    except Exception as e:
        print(f"Database connection failed: {e}")
        return False

def check_pgvector_extension() -> bool:
    """
    Check if pgvector extension is enabled.
    Returns True if extension is available, False otherwise.
    """
    try:
        with engine.connect() as connection:
            result = connection.execute(
                text("SELECT * FROM pg_extension WHERE extname = 'vector'")
            )
            return result.rowcount > 0
    except Exception as e:
        print(f"pgvector check failed: {e}")
        return False

def create_performance_indexes(db_engine):
    with db_engine.connect() as conn:
        try:
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_chunks_embedding
                ON document_chunks
                USING ivfflat (embedding vector_cosine_ops)
                WITH (lists = 100)
            """))
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_chunks_fts
                ON document_chunks
                USING GIN (to_tsvector('english', content))
            """))
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_chunks_filename
                ON document_chunks (filename)
            """))
            conn.commit()
        except Exception as e:
            print(f"Index creation skipped (may already exist): {e}")
