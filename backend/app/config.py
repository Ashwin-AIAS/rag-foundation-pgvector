import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Settings:
    """Application configuration settings"""
    
    # Database settings
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "raguser")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "ragpassword")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "ragdb")
    POSTGRES_HOST: str = os.getenv("POSTGRES_HOST", "postgres")
    POSTGRES_PORT: str = os.getenv("POSTGRES_PORT", "5432")
    
    # Gemini API settings
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    
    # Neo4j settings
    NEO4J_URI: str = os.getenv("NEO4J_URI", "bolt://127.0.0.1:7687")
    NEO4J_USER: str = os.getenv("NEO4J_USER", "neo4j")
    NEO4J_PASSWORD: str = os.getenv("NEO4J_PASSWORD", "password")
    
    # Document ingestion settings
    CHUNK_SIZE: int = int(os.getenv("CHUNK_SIZE", "700"))
    CHUNK_OVERLAP: int = int(os.getenv("CHUNK_OVERLAP", "100"))
    MAX_FILE_SIZE_MB: int = int(os.getenv("MAX_FILE_SIZE_MB", "15"))
    SUPPORTED_FILE_TYPES: list = ["pdf", "txt", "docx", "md", "csv", "xlsx", "xls"]
    
    # RAG retrieval settings
    TOP_K: int = int(os.getenv("TOP_K", "5"))
    SIMILARITY_THRESHOLD: float = float(os.getenv("SIMILARITY_THRESHOLD", "0.7"))
    MIN_CHUNKS_REQUIRED: int = int(os.getenv("MIN_CHUNKS_REQUIRED", "1"))
    
    # RAG generation settings
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
    GEMINI_EMBEDDING_MODEL: str = os.getenv("GEMINI_EMBEDDING_MODEL", "models/text-embedding-004")
    GENERATION_TEMPERATURE: float = float(os.getenv("GENERATION_TEMPERATURE", "0.0"))
    GENERATION_MAX_TOKENS: int = int(os.getenv("GENERATION_MAX_TOKENS", "8192"))
    
    @property
    def database_url(self) -> str:
        """Construct database URL from components or use raw URL if provided"""
        # Check for direct URL (common in managed services like Render/Railway/Neon)
        if os.getenv("DATABASE_URL"):
            return os.getenv("DATABASE_URL")
            
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

# Create a global settings instance
settings = Settings()
