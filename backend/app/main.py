from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import tempfile
import os
from pathlib import Path

from app.database import check_database_connection, check_pgvector_extension, get_db
from app.config import settings
from app.services.ingestion import DocumentIngestionService
from app.services.embedding_service import EmbeddingService
from app.services.retrieval_service import RetrievalService
from app.services.prompt_service import PromptService
from app.services.prompt_service import PromptService
from app.services.generation_service import GenerationService
from app.services.document_service import DocumentService
from app.models.query import QueryRequest, QueryResponse, RetrievedChunk
from app.models.feedback import FeedbackRequest, FeedbackResponse

from app.models.document import Feedback, DocumentChunk

# Create FastAPI application
app = FastAPI(
    title="RAG API",
    description="Retrieval-Augmented Generation API",
    version="1.0.0"
)



# Configure CORS for future frontend integration
# In production, set ALLOWED_ORIGINS env var to the frontend URL
allowed_origins_str = os.getenv("ALLOWED_ORIGINS", "*")
allowed_origins = [origin.strip() for origin in allowed_origins_str.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
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
        "gemini_configured": bool(settings.GEMINI_API_KEY),
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
    document_service = DocumentService(db)
    documents = document_service.list_documents()
    
    return {
        "documents": documents,
        "total": len(documents)
    }


@app.delete("/documents/{filename}")
async def delete_document(filename: str, db: Session = Depends(get_db)):
    """
    Delete all chunks for a specific document.
    """
    document_service = DocumentService(db)
    deleted_count = document_service.delete_document(filename)
    
    if deleted_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return {
        "message": "Document deleted successfully",
        "filename": filename,
        "chunks_deleted": deleted_count
    }


# RAG Query Endpoint

@app.post("/query", response_model=QueryResponse)
async def query_documents(
    request: QueryRequest,
    db: Session = Depends(get_db)
):
    """
    Query the RAG system with a question.
    
    This endpoint executes the complete RAG workflow:
    1. Convert question to embedding
    2. Retrieve relevant document chunks
    3. Construct grounded prompt
    4. Generate answer using OpenAI
    
    The system enforces strict grounding constraints:
    - Only uses information from retrieved documents
    - Refuses to answer if context is insufficient
    - Does not use external knowledge or make assumptions
    """
    # Validate question
    if not request.question or not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")
    
    try:
        # Step 1: Convert question to embedding
        embedding_service = EmbeddingService()
        query_embedding = embedding_service.embed_query(request.question)
        
        # Step 2: Retrieve relevant chunks
        retrieval_service = RetrievalService(db)
        top_k = request.top_k if request.top_k is not None else settings.TOP_K
        retrieved_chunks = retrieval_service.retrieve(
            query_embedding=query_embedding,
            top_k=top_k
        )
        
        # Step 3: Check if we have sufficient context
        if len(retrieved_chunks) < settings.MIN_CHUNKS_REQUIRED:
            # Not enough relevant context found
            return QueryResponse(
                answer="I cannot answer this question based on the available documents.",
                retrieved_chunks=[],
                num_chunks_retrieved=0,
                question=request.question
            )
        
        # Step 4: Construct prompt with retrieved context
        prompt_service = PromptService()
        prompt = prompt_service.construct_prompt(
            retrieved_chunks=retrieved_chunks,
            user_question=request.question
        )
        
        # Step 5: Generate answer
        generation_service = GenerationService()
        answer = generation_service.generate(prompt)
        
        # Step 6: Format response
        response_chunks = [
            RetrievedChunk(
                chunk_text=chunk["chunk_text"],
                source_file=chunk["source_file"],
                chunk_index=chunk["chunk_index"],
                similarity_score=chunk["similarity_score"],
                metadata=chunk.get("metadata")
            )
            for chunk in retrieved_chunks
        ]
        
        return QueryResponse(
            answer=answer,
            retrieved_chunks=response_chunks,
            num_chunks_retrieved=len(response_chunks),
            question=request.question
        )
    
    except ValueError as e:
        # Validation errors
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # Internal errors (embedding, retrieval, or generation failures)
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")


# Feedback Endpoint

@app.post("/feedback", response_model=FeedbackResponse)
async def submit_feedback(
    request: FeedbackRequest,
    db: Session = Depends(get_db)
):
    """
    Submit user feedback on a generated answer.
    
    This endpoint stores user ratings (positive/negative) for analysis.
    Feedback does NOT modify system behavior, retrieval, or generation.
    It is purely for observational analysis and quality monitoring.
    """
    try:
        # Create feedback record
        feedback_record = Feedback(
            question=request.question,
            answer=request.answer,
            feedback=request.feedback,
            num_chunks_retrieved=request.num_chunks_retrieved,
            timestamp=request.timestamp
        )
        
        # Store in database
        db.add(feedback_record)
        db.commit()
        db.refresh(feedback_record)
        
        return FeedbackResponse(
            status="received",
            feedback_id=feedback_record.id,
            message="Thank you for your feedback"
        )
    
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to store feedback: {str(e)}"
        )


# Future endpoints:
# - GET /documents/{filename}/chunks - Retrieve chunks for a specific document
# - GET /feedback/stats - Get feedback statistics (for admin/analysis)

@app.get("/debug/chunks-count")
def chunks_count(db: Session = Depends(get_db)):
    total = db.query(DocumentChunk).count()
    with_embedding = (
        db.query(DocumentChunk)
        .filter(DocumentChunk.embedding != None)
        .count()
    )
    return {
        "total_chunks": total,
        "chunks_with_embeddings": with_embedding
    }
