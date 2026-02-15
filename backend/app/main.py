from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Query
from fastapi.responses import StreamingResponse, JSONResponse
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
allowed_origins_str = os.getenv("ALLOWED_ORIGINS", "https://rag-foundation-pgvector.vercel.app,http://localhost:5173,http://localhost:3000")
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
            status_code=413,
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
        # Use await as ingest_document is now async
        result = await ingestion_service.ingest_document(tmp_file_path, file.filename)
        
        return {
            "message": "Document ingested successfully",
            **result
        }
    
    except ValueError as e:
        # Check if it's a known value error or duplicate
        if "already exists" in str(e):
             raise HTTPException(status_code=409, detail=str(e))
        raise HTTPException(status_code=400, detail=str(e))
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
    stream: bool = Query(False), # Explicit query param to prevent 422 errors
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
            top_k=top_k,
            source_files=request.selected_documents
        )
        
        # Step 3: Check if we have sufficient context
        if len(retrieved_chunks) < settings.MIN_CHUNKS_REQUIRED:
            # Not enough relevant context found
            if stream:
                # For streaming, we yield the refusal message
                async def refuse_generator():
                    yield "I cannot answer this question based on the available documents."
                return StreamingResponse(refuse_generator(), media_type="text/plain")
            
            return QueryResponse(
                answer="I cannot answer this question based on the available documents.",
                retrieved_chunks=[],
                num_chunks_retrieved=0,
                question=request.question
            )
        
        # Step 4: Construct prompt or Table Response
        
        # Check if we should return a table
        # We return a table ONLY if:
        # 1. We have retrieved chunks
        # 2. visualising the data as a table is appropriate (heuristics: >50% chunks are CSV)
        
        csv_chunks = [c for c in retrieved_chunks if c.get("metadata", {}).get("file_type") == "csv"]
        is_table_response = len(csv_chunks) > 0 and len(csv_chunks) >= len(retrieved_chunks) * 0.5
        
        prompt_service = PromptService()
        
        if is_table_response:
            # Construct Table Response
            # ... (Existing table logic remains relatively same, likely no streaming for tables yet)
            # For simplicity, if it's a table response, we ignore stream=True for the actual data structure part
            # OR we just return the standard JSON response because streaming a JSON object is complex.
            # Let's fallback to standard JSON for table responses even if stream=True is requested.
            
            all_rows = []
            seen_hashes = set()
            
            for chunk in csv_chunks:
                row_data = chunk.get("metadata", {}).get("row_data", [])
                if isinstance(row_data, list):
                    for row in row_data:
                        # Simple dedup based on string representation
                        row_hash = str(sorted(row.items()))
                        if row_hash not in seen_hashes:
                            all_rows.append(row)
                            seen_hashes.add(row_hash)
            
            # Determine columns from the first row (or union of all keys)
            columns = []
            if all_rows:
                # Naive: use keys from first row
                columns = list(all_rows[0].keys())
                
            # We still generate a summary text answer
            prompt = prompt_service.construct_prompt(
                retrieved_chunks=retrieved_chunks,
                user_question=request.question
            )
            generation_service = GenerationService()
            summary_answer = generation_service.generate(prompt)
             
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
            
            # Return standard JSON response for tables
            return QueryResponse(
                answer=summary_answer, # Providing summary + structured data
                retrieved_chunks=response_chunks,
                num_chunks_retrieved=len(response_chunks),
                question=request.question,
                answer_type="table",
                columns=columns,
                rows=all_rows[:50] # Limit rows to avoid massive payloads
            )

        # Standard Text Response (or Structured Listing)
        
        # Intent Detection: Listing
        listing_keywords = ["list", "show", "display", "table", "jobs", "roles", "applications"]
        is_listing_intent = any(kw in request.question.lower() for kw in listing_keywords)
        
        prompt = prompt_service.construct_prompt(
            retrieved_chunks=retrieved_chunks,
            user_question=request.question,
            structured_mode=is_listing_intent
        )
        
        generation_service = GenerationService()

        # STREAMING LOGIC
        if stream:
            try:
                # We need to ensure we can actually start the stream.
                # If stream_generate immediately raises, we catch it here.
                # However, once StreamingResponse starts, exceptions inside the generator
                # will break the stream.
                return StreamingResponse(
                    generation_service.stream_generate(prompt),
                    media_type="text/plain"
                )
            except Exception as e:
                print(f"Streaming setup failed: {e}")
                logging.error(f"Streaming setup failed: {e}")
                # Fallback to normal execution if immediate failure
                pass 

        # STANDARD LOGIC (Fallback or requested)
        raw_answer = generation_service.generate(prompt)
        
        # Step 6: Parse structured response if needed
        rows = None
        columns = None
        final_answer = raw_answer
        answer_type = "text"
        
        if is_listing_intent:
            try:
                import json
                # Clean potential markdown code blocks
                clean_json = raw_answer.strip()
                if clean_json.startswith("```json"):
                    clean_json = clean_json[7:]
                if clean_json.endswith("```"):
                    clean_json = clean_json[:-3]
                
                parsed_data = json.loads(clean_json)
                
                if isinstance(parsed_data, list) and len(parsed_data) > 0:
                    rows = parsed_data
                    # Use keys from first object as columns
                    columns = list(rows[0].keys())
                    answer_type = "table"
                    final_answer = "Here is the structured list you requested:"
                else:
                    # Fallback if structure is invalid
                    logging.warning("Structured mode returned invalid JSON structure, falling back to text.")
            except json.JSONDecodeError:
                # Fallback to text
                logging.warning("Failed to parse JSON in structured mode, falling back to text.")
        
        # Step 7: Format response
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
            answer=final_answer,
            retrieved_chunks=response_chunks,
            num_chunks_retrieved=len(response_chunks),
            question=request.question,
            answer_type=answer_type,
            columns=columns,
            rows=rows
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
