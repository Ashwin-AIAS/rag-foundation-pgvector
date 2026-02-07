from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import tempfile
import os
from pathlib import Path

from app.database import check_database_connection, check_pgvector_extension, get_db
from app.config import settings
from app.services.ingestion import DocumentIngestionService

# Create FastAPI application
app = FastAPI(
    title="RAG API",
    description="Retrieval-Augmented Generation API",
    version="1.0.0"
)

# Configure CORS for future frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "RAG API is running",
        "version": "1.0.0"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "rag-api"
    }

@app.get("/db-health")
async def database_health():
    """Check database connection and pgvector extension"""
    db_connected = check_database_connection()
    pgvector_enabled = check_pgvector_extension()
    
    return {
        "database_connected": db_connected,
        "pgvector_enabled": pgvector_enabled,
        "status": "healthy" if (db_connected and pgvector_enabled) else "unhealthy"
    }

@app.get("/config")
async def get_config():
    """Get non-sensitive configuration info"""
    return {
        "database_host": settings.POSTGRES_HOST,
        "database_port": settings.POSTGRES_PORT,
        "database_name": settings.POSTGRES_DB,
        "openai_configured": bool(settings.OPENAI_API_KEY),
        "chunk_size": settings.CHUNK_SIZE,
        "chunk_overlap": settings.CHUNK_OVERLAP,
        "max_file_size_mb": settings.MAX_FILE_SIZE_MB,
        "supported_file_types": settings.SUPPORTED_FILE_TYPES
    }


# Document Ingestion Endpoints

@app.post("/ingest")
async def ingest_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload and ingest a document (PDF or text file).
    
    The document will be:
    1. Validated for file type and size
    2. Split into chunks
    3. Embedded using OpenAI
    4. Stored in the database
    """
    # Validate file type
    file_extension = Path(file.filename).suffix.lower().lstrip('.')
    if file_extension not in settings.SUPPORTED_FILE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Supported types: {settings.SUPPORTED_FILE_TYPES}"
        )
    
    # Validate file size
    file.file.seek(0, 2)  # Seek to end
    file_size_mb = file.file.tell() / (1024 * 1024)
    file.file.seek(0)  # Reset to beginning
    
    if file_size_mb > settings.MAX_FILE_SIZE_MB:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {settings.MAX_FILE_SIZE_MB}MB"
        )
    
    # Save uploaded file temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix=f".{file_extension}") as tmp_file:
        content = await file.read()
        tmp_file.write(content)
        tmp_file_path = tmp_file.name
    
    try:
        # Ingest the document
        ingestion_service = DocumentIngestionService(db)
        result = ingestion_service.ingest_document(tmp_file_path, file.filename)
        
        return {
            "message": "Document ingested successfully",
            **result
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")
    
    finally:
        # Clean up temporary file
        if os.path.exists(tmp_file_path):
            os.unlink(tmp_file_path)


@app.get("/documents")
async def list_documents(db: Session = Depends(get_db)):
    """
    List all ingested documents with statistics.
    """
    ingestion_service = DocumentIngestionService(db)
    documents = ingestion_service.list_documents()
    
    return {
        "documents": documents,
        "total": len(documents)
    }


@app.delete("/documents/{filename}")
async def delete_document(filename: str, db: Session = Depends(get_db)):
    """
    Delete all chunks for a specific document.
    """
    ingestion_service = DocumentIngestionService(db)
    deleted_count = ingestion_service.delete_document(filename)
    
    if deleted_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return {
        "message": "Document deleted successfully",
        "filename": filename,
        "chunks_deleted": deleted_count
    }


# Future RAG endpoints:
# - POST /query - Query documents with semantic search
# - GET /documents/{filename}/chunks - Retrieve chunks for a specific document
