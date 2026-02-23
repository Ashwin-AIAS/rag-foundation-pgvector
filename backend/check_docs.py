import sqlalchemy
from sqlalchemy import create_engine, text
import json
import os
from dotenv import load_dotenv

load_dotenv()
POSTGRES_USER = os.getenv("POSTGRES_USER", "raguser")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "ragpassword")
POSTGRES_DB = os.getenv("POSTGRES_DB", "ragdb")
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "postgres")
POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")

# Check for direct URL (common in managed services like Render/Railway/Neon)
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    DATABASE_URL = f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"

try:
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        result = conn.execute(text("SELECT source_file, COUNT(*) as cnt FROM document_chunks GROUP BY source_file"))
        docs = [row[0] for row in result]
        print(json.dumps(docs))
except Exception as e:
    print(f"Error: {e}")
