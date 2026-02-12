from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings

# Create database engine
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,  # Verify connections before using them
    echo=True  # Log SQL queries (disable in production)
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

def init_db():
    """
    TEMPORARY: Reset database schema to match SQLAlchemy models.
    This drops all tables and recreates them.
    REMOVE in production and replace with migrations.
    """
    # Import models so they are registered with Base.metadata
    from app.models import document  # Contains DocumentChunk and Feedback
    
    print("WARNING: Resetting database schema (TEMPORARY DEV MODE)")
    Base.metadata.drop_all(bind=engine)
    print("Tables dropped.")
    Base.metadata.create_all(bind=engine)
    print("Tables recreated.")
