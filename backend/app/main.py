import logging
import time
import json

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Query
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text as sa_text
import tempfile
import os
from pathlib import Path

from app.database import check_database_connection, check_pgvector_extension, get_db, engine
from app.config import settings
from app.services.ingestion import DocumentIngestionService
from app.services.embedding_service import EmbeddingService
from app.services.retrieval_service import RetrievalService
from app.services.prompt_service import PromptService
from app.services.generation_service import GenerationService
from app.services.document_service import DocumentService
from app.services.reranking_service import RerankingService
from app.models.query import QueryRequest, QueryResponse, RetrievedChunk
from app.models.feedback import FeedbackRequest, FeedbackResponse
from app.models.document import Feedback, DocumentChunk

logger = logging.getLogger(__name__)

# ── Constants ────────────────────────────────────────────────
MAX_TOP_K = 20           # Hard cap for top_k parameter
RETRIEVAL_TOP_K = 15     # Broader initial retrieval for reranking
RERANK_RETURN = 5        # Reranker returns this many chunks
SLOW_QUERY_THRESHOLD = 3.0  # Seconds

# Create FastAPI application
app = FastAPI(
    title="RAG API",
    description="Retrieval-Augmented Generation API",
    version="2.0.0"
)

# Configure CORS
allowed_origins_str = os.getenv(
    "ALLOWED_ORIGINS",
    "https://rag-foundation-pgvector.vercel.app,http://localhost:5173,http://localhost:3000"
)
allowed_origins = [origin.strip() for origin in allowed_origins_str.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Startup: ensure query_logs table exists ──────────────────
@app.on_event("startup")
def create_query_logs_table():
    """Create the query_logs analytics table if it doesn't exist."""
    try:
        with engine.connect() as conn:
            conn.execute(sa_text("""
                CREATE TABLE IF NOT EXISTS query_logs (
                    id SERIAL PRIMARY KEY,
                    question TEXT NOT NULL,
                    response_time_ms INTEGER NOT NULL,
                    confidence_score INTEGER NOT NULL DEFAULT 0,
                    selected_documents TEXT,
                    num_chunks INTEGER DEFAULT 0,
                    rerank_used BOOLEAN DEFAULT FALSE,
                    timestamp TIMESTAMPTZ DEFAULT NOW()
                )
            """))
            conn.commit()
        logger.info("query_logs table ready")
    except Exception as e:
        logger.error(f"Failed to create query_logs table: {e}")


# ── Utility: confidence scoring ──────────────────────────────
def compute_confidence(
    chunks, rerank_succeeded: bool, min_expected: int = 3
) -> int:
    """
    Compute a confidence score (0–100) from retrieval quality signals.

    - Base = average similarity_score of top chunks * 100
    - +10 if reranking succeeded (higher contextual precision)
    - -15 if fewer than *min_expected* chunks retrieved
    """
    if not chunks:
        return 0

    avg_sim = sum(c["similarity_score"] for c in chunks) / len(chunks)
    score = avg_sim * 100

    if rerank_succeeded:
        score += 10
    if len(chunks) < min_expected:
        score -= 15

    return max(0, min(100, int(round(score))))


# ── Utility: log query ───────────────────────────────────────
def log_query(
    db: Session,
    question: str,
    response_time_ms: int,
    confidence: int,
    selected_documents,
    num_chunks: int,
    rerank_used: bool,
):
    """Insert a row into query_logs."""
    try:
        docs_str = json.dumps(selected_documents) if selected_documents else None
        db.execute(
            sa_text("""
                INSERT INTO query_logs
                    (question, response_time_ms, confidence_score,
                     selected_documents, num_chunks, rerank_used)
                VALUES
                    (:q, :rt, :cs, :sd, :nc, :ru)
            """),
            {
                "q": question,
                "rt": response_time_ms,
                "cs": confidence,
                "sd": docs_str,
                "nc": num_chunks,
                "ru": rerank_used,
            },
        )
        db.commit()
    except Exception as e:
        logger.error(f"Failed to log query: {e}")
        db.rollback()


# ══════════════════════════════════════════════════════════════
# Health / Config endpoints
# ══════════════════════════════════════════════════════════════

@app.get("/")
async def root():
    return {"message": "RAG API is running", "version": "2.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "rag-api"}

@app.get("/db-health")
async def database_health():
    db_connected = check_database_connection()
    pgvector_enabled = check_pgvector_extension()
    return {
        "database_connected": db_connected,
        "pgvector_enabled": pgvector_enabled,
        "status": "healthy" if (db_connected and pgvector_enabled) else "unhealthy"
    }

@app.get("/config")
async def get_config():
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


# ══════════════════════════════════════════════════════════════
# Document Ingestion
# ══════════════════════════════════════════════════════════════

@app.post("/ingest")
async def ingest_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload and ingest a document (PDF, text, CSV, etc.)."""
    file_extension = Path(file.filename).suffix.lower().lstrip('.')
    
    if file_extension not in settings.SUPPORTED_FILE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: .{file_extension}. Supported: {settings.SUPPORTED_FILE_TYPES}"
        )
    
    contents = await file.read()
    file_size_mb = len(contents) / (1024 * 1024)
    
    if file_size_mb > settings.MAX_FILE_SIZE_MB:
        raise HTTPException(
            status_code=400,
            detail=f"File too large: {file_size_mb:.1f}MB. Maximum: {settings.MAX_FILE_SIZE_MB}MB"
        )
    
    try:
        with tempfile.NamedTemporaryFile(
            delete=False, 
            suffix=f".{file_extension}",
            dir=tempfile.gettempdir()
        ) as tmp_file:
            tmp_file.write(contents)
            temp_path = tmp_file.name
        
        ingestion_service = DocumentIngestionService(db)
        result = ingestion_service.ingest(
            file_path=temp_path,
            filename=file.filename
        )
        
        return {
            "message": f"Document '{file.filename}' ingested successfully",
            "chunks_created": result["chunks_created"],
            "filename": file.filename
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Ingestion failed: {str(e)}"
        )
    finally:
        if 'temp_path' in locals() and os.path.exists(temp_path):
            os.unlink(temp_path)


# ══════════════════════════════════════════════════════════════
# Document Management
# ══════════════════════════════════════════════════════════════

@app.get("/documents")
async def list_documents(db: Session = Depends(get_db)):
    """List all ingested documents."""
    try:
        doc_service = DocumentService(db)
        documents = doc_service.list_documents()
        return {"documents": documents, "total": len(documents)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed: {str(e)}")

@app.delete("/documents/{filename}")
async def delete_document(filename: str, db: Session = Depends(get_db)):
    """Delete a document and all its chunks."""
    try:
        doc_service = DocumentService(db)
        result = doc_service.delete_document(filename)
        if not result["success"]:
            raise HTTPException(status_code=404, detail=result.get("message", "Not found"))
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Deletion failed: {str(e)}")


# ══════════════════════════════════════════════════════════════
# RAG Query  (reranking + hybrid search + confidence + logging)
# ══════════════════════════════════════════════════════════════

@app.post("/query", response_model=QueryResponse)
async def query_documents(
    request: QueryRequest,
    stream: bool = Query(False),
    db: Session = Depends(get_db)
):
    """
    Query the RAG system with a question.
    
    Pipeline:
    1. Embed question
    2. Hybrid retrieval (vector 70% + keyword 30%), top_k = 15
    3. LLM reranking → top 5
    4. Construct prompt & generate answer
    5. Compute confidence score
    6. Log analytics
    """
    if not request.question or not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")
    
    start_time = time.time()
    
    try:
        # Step 1: Embed question
        embedding_service = EmbeddingService()
        query_embedding = embedding_service.embed_query(request.question)
        
        # Step 2: Hybrid retrieval with adaptive threshold fallback
        retrieval_service = RetrievalService(db)
        initial_top_k = min(
            request.top_k if request.top_k is not None else RETRIEVAL_TOP_K,
            MAX_TOP_K
        )
        
        # Log document filter state
        if request.selected_documents:
            logger.info(f"Document filter active: {request.selected_documents}")
        else:
            logger.info("No document filter — searching all documents")
        
        # Tier 1 & 2: Adaptive threshold (0.5 → 0.35)
        THRESHOLDS = [settings.SIMILARITY_THRESHOLD, 0.35]
        retrieved_chunks = []
        
        for threshold in THRESHOLDS:
            retrieved_chunks = retrieval_service.retrieve(
                query_embedding=query_embedding,
                top_k=initial_top_k,
                similarity_threshold=threshold,
                source_files=request.selected_documents,
                user_question=request.question,
            )
            logger.info(f"Retrieved {len(retrieved_chunks)} chunks (threshold={threshold})")
            # Debug: log top-5 similarity scores
            for i, c in enumerate(retrieved_chunks[:5]):
                logger.debug(
                    f"  chunk[{i}] sim={c['similarity_score']:.4f} "
                    f"kw={c.get('keyword_score', 0):.4f} "
                    f"final={c.get('final_score', 0):.4f} "
                    f"src={c['source_file']}"
                )
            if len(retrieved_chunks) >= settings.MIN_CHUNKS_REQUIRED:
                break
        
        # Tier 3: No-threshold fallback — just return top_k by similarity
        if len(retrieved_chunks) < settings.MIN_CHUNKS_REQUIRED:
            logger.warning("All threshold-based retrievals returned zero — trying no-threshold fallback")
            retrieved_chunks = retrieval_service.retrieve(
                query_embedding=query_embedding,
                top_k=initial_top_k,
                source_files=request.selected_documents,
                user_question=request.question,
                skip_threshold=True,
            )
            logger.info(f"No-threshold fallback retrieved {len(retrieved_chunks)} chunks")
            for i, c in enumerate(retrieved_chunks[:5]):
                logger.debug(
                    f"  fallback chunk[{i}] sim={c['similarity_score']:.4f} "
                    f"src={c['source_file']}"
                )
        
        # Step 3: Safe LLM fallback — still zero after all retries
        if len(retrieved_chunks) < settings.MIN_CHUNKS_REQUIRED:
            elapsed_ms = int((time.time() - start_time) * 1000)
            log_query(db, request.question, elapsed_ms, 0,
                      request.selected_documents, 0, False)
            
            fallback_msg = "The selected document does not contain enough relevant information for this query."
            
            if stream:
                async def refuse_generator():
                    yield fallback_msg
                return StreamingResponse(refuse_generator(), media_type="text/plain")
            
            return QueryResponse(
                answer=fallback_msg,
                retrieved_chunks=[],
                num_chunks_retrieved=0,
                question=request.question,
                confidence=20,
            )
        
        # Step 4: LLM Reranking
        reranker = RerankingService()
        reranked_chunks, rerank_succeeded = reranker.rerank(
            question=request.question,
            chunks=retrieved_chunks,
            top_n=RERANK_RETURN,
        )
        
        # Step 5: Compute confidence
        confidence = compute_confidence(reranked_chunks, rerank_succeeded)
        
        # Step 6: Construct prompt
        # Check for table response
        csv_chunks = [c for c in reranked_chunks if c.get("metadata", {}).get("file_type") == "csv"]
        is_table_response = len(csv_chunks) > 0 and len(csv_chunks) >= len(reranked_chunks) * 0.5
        
        prompt_service = PromptService()
        
        if is_table_response:
            all_rows = []
            seen_hashes = set()
            for chunk in csv_chunks:
                row_data = chunk.get("metadata", {}).get("row_data", [])
                if isinstance(row_data, list):
                    for row in row_data:
                        row_hash = str(sorted(row.items()))
                        if row_hash not in seen_hashes:
                            all_rows.append(row)
                            seen_hashes.add(row_hash)
            
            columns = list(all_rows[0].keys()) if all_rows else []
            
            prompt = prompt_service.construct_prompt(
                retrieved_chunks=reranked_chunks,
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
                for chunk in reranked_chunks
            ]
            
            elapsed_ms = int((time.time() - start_time) * 1000)
            if elapsed_ms > SLOW_QUERY_THRESHOLD * 1000:
                logger.warning(f"SLOW QUERY ({elapsed_ms}ms): {request.question[:80]}")
            log_query(db, request.question, elapsed_ms, confidence,
                      request.selected_documents, len(response_chunks), rerank_succeeded)
            
            return QueryResponse(
                answer=summary_answer,
                retrieved_chunks=response_chunks,
                num_chunks_retrieved=len(response_chunks),
                question=request.question,
                confidence=confidence,
                answer_type="table",
                columns=columns,
                rows=all_rows[:50]
            )
        
        # Standard Text Response (or Structured Listing)
        listing_keywords = ["list", "show", "display", "table", "jobs", "roles", "applications"]
        is_listing_intent = any(kw in request.question.lower() for kw in listing_keywords)
        
        prompt = prompt_service.construct_prompt(
            retrieved_chunks=reranked_chunks,
            user_question=request.question,
            structured_mode=is_listing_intent
        )
        
        generation_service = GenerationService()
        
        # STREAMING LOGIC
        if stream:
            try:
                # For streaming we can't compute answer-level analytics easily,
                # so we log what we know now
                elapsed_ms = int((time.time() - start_time) * 1000)
                log_query(db, request.question, elapsed_ms, confidence,
                          request.selected_documents, len(reranked_chunks), rerank_succeeded)
                
                # Wrap stream to prepend confidence metadata and guarantee non-empty output
                def stream_with_meta():
                    yield f"__CONFIDENCE__:{confidence}\n"
                    yielded_any = False
                    for token in generation_service.stream_generate(prompt):
                        if token:
                            yielded_any = True
                            yield token
                    if not yielded_any:
                        logger.warning("Streaming generated zero tokens — emitting fallback")
                        yield "No answer could be generated from the selected documents."
                
                return StreamingResponse(
                    stream_with_meta(),
                    media_type="text/plain"
                )
            except Exception as e:
                print(f"Streaming setup failed: {e}")
                logging.error(f"Streaming setup failed: {e}")
                pass
        
        # STANDARD LOGIC
        raw_answer = generation_service.generate(prompt)
        
        rows = None
        columns = None
        final_answer = raw_answer
        answer_type = "text"
        
        if is_listing_intent:
            try:
                clean_json = raw_answer.strip()
                if clean_json.startswith("```json"):
                    clean_json = clean_json[7:]
                if clean_json.endswith("```"):
                    clean_json = clean_json[:-3]
                
                parsed_data = json.loads(clean_json)
                
                if isinstance(parsed_data, list) and len(parsed_data) > 0:
                    rows = parsed_data
                    columns = list(rows[0].keys())
                    answer_type = "table"
                    final_answer = "Here is the structured list you requested:"
                else:
                    logging.warning("Structured mode returned invalid JSON, falling back to text.")
            except json.JSONDecodeError:
                logging.warning("Failed to parse JSON in structured mode, falling back to text.")
        
        response_chunks = [
            RetrievedChunk(
                chunk_text=chunk["chunk_text"],
                source_file=chunk["source_file"],
                chunk_index=chunk["chunk_index"],
                similarity_score=chunk["similarity_score"],
                metadata=chunk.get("metadata")
            )
            for chunk in reranked_chunks
        ]
        
        elapsed_ms = int((time.time() - start_time) * 1000)
        if elapsed_ms > SLOW_QUERY_THRESHOLD * 1000:
            logger.warning(f"SLOW QUERY ({elapsed_ms}ms): {request.question[:80]}")
        log_query(db, request.question, elapsed_ms, confidence,
                  request.selected_documents, len(response_chunks), rerank_succeeded)
        
        return QueryResponse(
            answer=final_answer,
            retrieved_chunks=response_chunks,
            num_chunks_retrieved=len(response_chunks),
            question=request.question,
            confidence=confidence,
            answer_type=answer_type,
            columns=columns,
            rows=rows
        )
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")


# ══════════════════════════════════════════════════════════════
# Analytics Endpoint
# ══════════════════════════════════════════════════════════════

@app.get("/analytics")
async def get_analytics(db: Session = Depends(get_db)):
    """Return aggregated analytics from query_logs."""
    try:
        summary = db.execute(sa_text("""
            SELECT
                COUNT(*) AS total_queries,
                COALESCE(AVG(response_time_ms), 0) AS avg_response_time,
                COALESCE(AVG(confidence_score), 0) AS avg_confidence,
                COALESCE(MAX(response_time_ms), 0) AS max_response_time,
                COALESCE(MIN(confidence_score), 0) AS min_confidence
            FROM query_logs
        """)).fetchone()
        
        # Most queried documents (from the selected_documents JSON column)
        top_docs_result = db.execute(sa_text("""
            SELECT selected_documents, COUNT(*) AS cnt
            FROM query_logs
            WHERE selected_documents IS NOT NULL
            GROUP BY selected_documents
            ORDER BY cnt DESC
            LIMIT 5
        """)).fetchall()
        
        # Recent queries
        recent = db.execute(sa_text("""
            SELECT question, response_time_ms, confidence_score, timestamp
            FROM query_logs
            ORDER BY timestamp DESC
            LIMIT 20
        """)).fetchall()
        
        # Per-day query counts (last 14 days)
        daily = db.execute(sa_text("""
            SELECT DATE(timestamp) AS day, COUNT(*) AS cnt
            FROM query_logs
            WHERE timestamp >= NOW() - INTERVAL '14 days'
            GROUP BY DATE(timestamp)
            ORDER BY day
        """)).fetchall()
        
        return {
            "total_queries": summary.total_queries if summary else 0,
            "avg_response_time_ms": round(float(summary.avg_response_time), 1) if summary else 0,
            "avg_confidence": round(float(summary.avg_confidence), 1) if summary else 0,
            "max_response_time_ms": summary.max_response_time if summary else 0,
            "min_confidence": summary.min_confidence if summary else 0,
            "top_documents": [
                {"documents": row.selected_documents, "count": row.cnt}
                for row in top_docs_result
            ],
            "recent_queries": [
                {
                    "question": row.question,
                    "response_time_ms": row.response_time_ms,
                    "confidence": row.confidence_score,
                    "timestamp": row.timestamp.isoformat() if row.timestamp else None,
                }
                for row in recent
            ],
            "daily_counts": [
                {"day": str(row.day), "count": row.cnt}
                for row in daily
            ],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analytics failed: {str(e)}")


# ══════════════════════════════════════════════════════════════
# Feedback Endpoint
# ══════════════════════════════════════════════════════════════

@app.post("/feedback", response_model=FeedbackResponse)
async def submit_feedback(
    request: FeedbackRequest,
    db: Session = Depends(get_db)
):
    """Submit user feedback on a generated answer."""
    try:
        feedback_record = Feedback(
            question=request.question,
            answer=request.answer,
            feedback=request.feedback,
            num_chunks_retrieved=request.num_chunks_retrieved,
            timestamp=request.timestamp
        )
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
