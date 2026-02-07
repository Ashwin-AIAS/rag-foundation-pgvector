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
    
    # OpenAI settings
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    
    # Document ingestion settings
    CHUNK_SIZE: int = int(os.getenv("CHUNK_SIZE", "1000"))
    CHUNK_OVERLAP: int = int(os.getenv("CHUNK_OVERLAP", "200"))
    MAX_FILE_SIZE_MB: int = int(os.getenv("MAX_FILE_SIZE_MB", "10"))
    SUPPORTED_FILE_TYPES: list = ["pdf", "txt"]
    
    @property
    def database_url(self) -> str:
        """Construct database URL from components"""
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

# Create a global settings instance
settings = Settings()
