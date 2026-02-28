import logging
import time
import json
import uuid
import threading

from typing import List, Dict
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Query, BackgroundTasks
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
from app.services.graph_retrieval_service import GraphRetrievalService
from app.models.query import QueryRequest, QueryResponse, RetrievedChunk
from app.models.feedback import FeedbackRequest, FeedbackResponse
from app.models.document import Feedback, DocumentChunk, Document

logger = logging.getLogger(__name__)

# ── Constants ────────────────────────────────────────────────
MAX_TOP_K = 20           # Hard cap for top_k parameter
RETRIEVAL_TOP_K = 15     # Broader initial retrieval for reranking
RERANK_RETURN = 5        # Reranker returns this many chunks
SLOW_QUERY_THRESHOLD = 3.0  # Seconds
SLOW_RETRIEVAL_THRESHOLD_MS = 500  # ms — warn if retrieval exceeds this

# ── In-process ingestion job tracker (thread-safe via GIL + dict assignment) ───
# Format: {job_id: {"filename": str, "status": str, "error": str|None, "num_chunks": int|None}}
ingestion_jobs: Dict[str, Dict] = {}

# Create FastAPI application
app = FastAPI(
    title="RAG API",
    description="Retrieval-Augmented Generation API",
    version="2.0.0"
)

# Configure CORS
allowed_origins_str = os.getenv(
    "ALLOWED_ORIGINS",
    "https://rag-foundation-pgvector.vercel.app,https://rag-foundation-pgvector.onrender.com,http://localhost:5173,http://localhost:3000"
)
allowed_origins = [origin.strip().rstrip("/") for origin in allowed_origins_str.split(",") if origin.strip()]

# If "*" is explicitly provided, we must disable allow_credentials
if "*" in allowed_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_origin_regex=os.getenv("ALLOWED_ORIGIN_REGEX", r"https://.*\.vercel\.app|https://.*\.onrender\.com"),
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

            # Ingestion error log — permanent record for every pipeline failure
            conn.execute(sa_text("""
                CREATE TABLE IF NOT EXISTS ingestion_errors (
                    id SERIAL PRIMARY KEY,
                    filename TEXT NOT NULL,
                    stage TEXT NOT NULL,
                    error_message TEXT,
                    stack_trace TEXT,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                )
            """))
            conn.commit()

            # Ensure paper_summaries table exists
            conn.execute(sa_text("""
                CREATE TABLE IF NOT EXISTS paper_summaries (
                    id VARCHAR(36) PRIMARY KEY,
                    source_file VARCHAR(255) NOT NULL UNIQUE,
                    problem_statement TEXT,
                    methodology TEXT,
                    datasets TEXT,
                    evaluation_metrics TEXT,
                    key_results TEXT,
                    limitations TEXT,
                    contributions TEXT,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                )
            """))
            conn.commit()

            # Persistent document status table
            conn.execute(sa_text("""
                CREATE TABLE IF NOT EXISTS documents (
                    id VARCHAR(36) PRIMARY KEY,
                    filename VARCHAR(255) NOT NULL,
                    status VARCHAR(20) NOT NULL DEFAULT 'UPLOADED',
                    num_chunks INTEGER,
                    error_message TEXT,
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    updated_at TIMESTAMPTZ DEFAULT NOW()
                )
            """))
            conn.commit()

            # Ensure pgvector IVFFlat index exists for performance
            # IVFFlat requires rows for centroid computation — skip on empty/small tables
            try:
                table_exists = conn.execute(sa_text(
                    "SELECT 1 FROM information_schema.tables WHERE table_name = 'document_chunks'"
                )).fetchone()
                chunk_count = 0
                if table_exists:
                    chunk_count = conn.execute(sa_text("SELECT COUNT(*) FROM document_chunks")).scalar() or 0

                if chunk_count >= 100:
                    conn.execute(sa_text("""
                        CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx
                        ON document_chunks
                        USING ivfflat (embedding vector_cosine_ops)
                        WITH (lists = 100);
                    """))
                    conn.commit()

                    # Run ANALYZE to update planner statistics after index creation
                    conn.execute(sa_text("ANALYZE document_chunks;"))
                    conn.commit()
                else:
                    logger.info(f"Skipping IVFFlat index — only {chunk_count} rows (need >= 100)")
            except Exception as idx_err:
                logger.warning(f"IVFFlat index creation skipped: {idx_err}")
                try:
                    conn.rollback()
                except Exception:
                    pass

            # Auto-migrate: add search_vector generated column if missing
            try:
                col_check = conn.execute(sa_text("""
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'document_chunks' AND column_name = 'search_vector'
                """)).fetchone()
                if not col_check:
                    logger.info("search_vector column missing — running migration...")
                    conn.execute(sa_text("""
                        ALTER TABLE document_chunks
                        ADD COLUMN search_vector tsvector
                        GENERATED ALWAYS AS (to_tsvector('english', chunk_text)) STORED
                    """))
                    conn.commit()
                    logger.info("search_vector column added via migration.")
                else:
                    logger.info("search_vector column already exists.")
            except Exception as sv_err:
                conn.rollback()
                logger.warning(f"search_vector migration skipped: {sv_err}")

            # GIN index on search_vector for full-text speed
            try:
                conn.execute(sa_text("""
                    CREATE INDEX IF NOT EXISTS idx_document_chunks_search_vector
                    ON document_chunks
                    USING gin(search_vector);
                """))
                conn.commit()
                logger.info("GIN index on search_vector ensured.")
            except Exception as gin_err:
                conn.rollback()
                logger.warning(f"GIN index on search_vector skipped (column may not exist): {gin_err}")

        logger.info("Database initialized (tables + vector index + ANALYZE)")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")


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

def _update_doc_status(job_id: str, status: str, num_chunks: int = None, error_msg: str = None):
    """
    Write ingestion job status to the persistent `documents` table.
    Uses its OWN short-lived DB session — completely isolated from the
    ingestion session so a missing `documents` table or any DB error
    can NEVER corrupt the ingestion transaction.
    """
    from app.database import SessionLocal
    _db = SessionLocal()
    try:
        params = {"id": job_id, "st": status}
        set_clauses = "status=:st, updated_at=NOW()"
        if num_chunks is not None:
            set_clauses += ", num_chunks=:nc"
            params["nc"] = num_chunks
        if error_msg is not None:
            set_clauses += ", error_message=:em"
            params["em"] = error_msg[:1000]
        _db.execute(sa_text(f"UPDATE documents SET {set_clauses} WHERE id=:id"), params)
        _db.commit()
    except Exception as e:
        logger.warning(f"[STATUS UPDATE] Could not persist status={status} for job {job_id}: {e}")
        try:
            _db.rollback()
        except Exception:
            pass
    finally:
        _db.close()


def _background_ingest_worker(job_id: str, temp_path: str, filename: str):
    """
    Background worker: runs ingestion in its own DB session.
    Updates both the in-memory ingestion_jobs dict (fast polling)
    AND the persistent `documents` DB row (survives server restarts).

    IMPORTANT: all status DB writes go through _update_doc_status() which
    opens its OWN session — the ingestion session `db` is always clean.
    """
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        # ── Mark PROCESSING (memory + isolated DB write) ──
        ingestion_jobs[job_id]["status"] = "PROCESSING"
        logger.info(f"[JOB {job_id}] PROCESSING started for {filename}")
        _update_doc_status(job_id, "PROCESSING")

        # ── Run ingestion pipeline on clean dedicated session ──
        ingestion_service = DocumentIngestionService(db)
        result = ingestion_service.ingest_document_sync(temp_path, filename)

        num_chunks = result.get("num_chunks") or 0
        ingestion_jobs[job_id].update({
            "status": "COMPLETE",
            "num_chunks": num_chunks,
            "metrics": result.get("metrics"),
        })
        _update_doc_status(job_id, "COMPLETE", num_chunks=num_chunks)
        logger.info(f"[JOB {job_id}] COMPLETE — {num_chunks} chunks for {filename}")
    except Exception as e:
        # Detect the pipeline stage from known error patterns
        raw = str(e)
        if "Failed to load" in raw or "Insufficient extracted text" in raw:
            stage = "parsing"
        elif "embed" in raw.lower() or "429" in raw or "rate" in raw.lower():
            stage = "embedding"
        elif "chunk" in raw.lower():
            stage = "chunking"
        elif "db" in raw.lower() or "insert" in raw.lower() or "commit" in raw.lower():
            stage = "db_insert"
        else:
            stage = "unknown"
        error_msg = f"[{stage}] {raw}"[:1000]
        ingestion_jobs[job_id].update({"status": "FAILED", "error": error_msg})
        logger.error(f"[JOB {job_id}] FAILED for {filename}: {e}")
        try:
            db.rollback()
        except Exception:
            pass
        _update_doc_status(job_id, "FAILED", error_msg=error_msg)
    finally:
        db.close()
        if os.path.exists(temp_path):
            try:
                os.unlink(temp_path)
            except Exception:
                pass


@app.post("/ingest", status_code=202)
async def ingest_document(
    files: List[UploadFile] = File(...),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """
    Upload and ingest multiple documents asynchronously.

    Returns HTTP 202 immediately after files are saved to disk.
    Use GET /ingest/status/{job_id} to poll per-file progress.
    """
    jobs = []
    rejected = []

    for file in files:
        file_extension = Path(file.filename).suffix.lower().lstrip('.')

        if file_extension not in settings.SUPPORTED_FILE_TYPES:
            rejected.append({
                "file": file.filename,
                "error": f"Unsupported file type: .{file_extension}. Supported: {settings.SUPPORTED_FILE_TYPES}"
            })
            continue

        contents = await file.read()
        file_size_mb = len(contents) / (1024 * 1024)

        if file_size_mb > settings.MAX_FILE_SIZE_MB:
            rejected.append({
                "file": file.filename,
                "error": f"File too large: {file_size_mb:.1f}MB. Maximum: {settings.MAX_FILE_SIZE_MB}MB"
            })
            continue

        # Save to temp — do this synchronously (fast)
        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=f".{file_extension}",
            dir=tempfile.gettempdir()
        ) as tmp_file:
            tmp_file.write(contents)
            temp_path = tmp_file.name

        job_id = str(uuid.uuid4())
        ingestion_jobs[job_id] = {
            "job_id": job_id,
            "filename": file.filename,
            "status": "UPLOADED",
            "num_chunks": None,
            "error": None,
            "metrics": None,
        }
        logger.info(f"[JOB {job_id}] UPLOADED — {file.filename} saved to {temp_path}")

        # Persist initial Document row synchronously (fast — just one INSERT)
        from app.database import SessionLocal
        _init_db = SessionLocal()
        try:
            _init_db.execute(
                sa_text("""
                    INSERT INTO documents (id, filename, status)
                    VALUES (:id, :fn, 'UPLOADED')
                    ON CONFLICT (id) DO NOTHING
                """),
                {"id": job_id, "fn": file.filename}
            )
            _init_db.commit()
        except Exception as _ins_err:
            logger.warning(f"Could not persist Document row for {file.filename}: {_ins_err}")
        finally:
            _init_db.close()

        # Schedule background ingestion (uses its own DB session)
        background_tasks.add_task(_background_ingest_worker, job_id, temp_path, file.filename)
        jobs.append({"job_id": job_id, "filename": file.filename})

    return JSONResponse(
        status_code=202,
        content={
            "message": "Files accepted — ingestion running in background",
            "jobs": jobs,
            "rejected": rejected,
        }
    )


@app.get("/ingest/status/{job_id}")
async def ingest_status(job_id: str, db: Session = Depends(get_db)):
    """
    Poll the status of an async ingestion job.
    Checks the in-memory dict first (fastest during active processing),
    then falls back to the persistent `documents` table (survives restarts).
    """
    # Fast path: in-memory dict (updated by the background worker in real-time)
    job = ingestion_jobs.get(job_id)
    if job is not None:
        return job

    # Fallback: check persistent DB (for jobs from previous server instances)
    try:
        row = db.execute(
            sa_text("SELECT id, filename, status, num_chunks, error_message FROM documents WHERE id = :id"),
            {"id": job_id}
        ).fetchone()
        if row:
            return {
                "job_id": row.id,
                "filename": row.filename,
                "status": row.status,
                "num_chunks": row.num_chunks,
                "error": row.error_message,
                "metrics": None,
            }
    except Exception:
        pass

    raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")


@app.get("/ingest/status")
async def list_ingest_statuses(
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    Return recent ingestion job statuses from the persistent `documents` table.
    Useful for viewing all upload history after a server restart.
    """
    try:
        rows = db.execute(sa_text("""
            SELECT id, filename, status, num_chunks, error_message, created_at, updated_at
            FROM documents
            ORDER BY created_at DESC
            LIMIT :limit
        """), {"limit": limit}).fetchall()
        return {
            "jobs": [
                {
                    "job_id": row.id,
                    "filename": row.filename,
                    "status": row.status,
                    "num_chunks": row.num_chunks,
                    "error": row.error_message,
                    "created_at": row.created_at.isoformat() if row.created_at else None,
                    "updated_at": row.updated_at.isoformat() if row.updated_at else None,
                }
                for row in rows
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list statuses: {str(e)}")


@app.get("/ingest/errors")
async def get_ingestion_errors(
    filename: str = Query(None, description="Filter by filename"),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """
    Return recent ingestion errors from the ingestion_errors table.
    Useful for diagnosing why files failed — shows stage, error message, and stack trace.
    """
    try:
        params = {"limit": limit}
        where = ""
        if filename:
            where = "WHERE filename = :fn"
            params["fn"] = filename
        rows = db.execute(sa_text(f"""
            SELECT filename, stage, error_message, stack_trace, created_at
            FROM ingestion_errors
            {where}
            ORDER BY created_at DESC
            LIMIT :limit
        """), params).fetchall()

        # Group by filename
        by_file: dict = {}
        for row in rows:
            fn = row.filename
            if fn not in by_file:
                by_file[fn] = []
            by_file[fn].append({
                "stage": row.stage,
                "error": row.error_message,
                "stack_trace": row.stack_trace,
                "timestamp": row.created_at.isoformat() if row.created_at else None
            })

        return {
            "total_errors": len(rows),
            "errors_by_file": by_file
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch errors: {str(e)}")




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
        deleted_count = doc_service.delete_document(filename)
        
        if deleted_count == 0:
            raise HTTPException(status_code=404, detail=f"Document '{filename}' not found")
            
        return {
            "message": f"Document '{filename}' deleted successfully",
            "chunks_deleted": deleted_count,
            "success": True
        }
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
    
    # ── LATENCY ORCHESTRATION ──
    start_total = time.perf_counter()
    embed_time = 0.0
    retrieval_time = 0.0
    generation_time = 0.0
    
    try:
        # Step 1: Embed question
        start_embed = time.perf_counter()
        embedding_service = EmbeddingService()
        query_embedding = embedding_service.embed_query(request.question)
        embed_time = (time.perf_counter() - start_embed) * 1000
        
        # Structured Summary Comparison Bypass
        is_summary_comparison = False
        summary_chunks = []
        
        if request.selected_documents and len(request.selected_documents) > 1:
            lower_q = request.question.lower()
            if any(w in lower_q for w in ["compare", "contrast", "differentiate"]):
                from app.models.document import PaperSummary
                summaries = db.query(PaperSummary).filter(PaperSummary.source_file.in_(request.selected_documents)).all()
                if len(summaries) == len(request.selected_documents):
                    is_summary_comparison = True
                    for i, summary in enumerate(summaries):
                        chunk_text = f"Problem Statement: {summary.problem_statement}\nMethodology: {summary.methodology}\nDatasets: {summary.datasets}\nEvaluation Metrics: {summary.evaluation_metrics}\nKey Results: {summary.key_results}\nLimitations: {summary.limitations}\nContributions: {summary.contributions}"
                        summary_chunks.append({
                            "chunk_text": chunk_text,
                            "source_file": summary.source_file,
                            "chunk_index": 0,
                            "metadata": {"balanced_mode": True, "is_summary": True},
                            "similarity_score": 1.0,
                            "keyword_score": 0.0,
                            "final_score": 1.0
                        })
                        
        # Step 2: Retrieve top-K chunks
        start_retrieval = time.perf_counter()
        retrieved_chunks = []
        
        if is_summary_comparison:
            logger.info("Using structured summaries for comparison instead of chunk retrieval.")
            retrieved_chunks = summary_chunks
            reranked_chunks = summary_chunks
            rerank_succeeded = True
            retrieval_time = (time.perf_counter() - start_retrieval) * 1000
        else:
            initial_top_k = min(
                request.top_k if request.top_k is not None else RETRIEVAL_TOP_K,
                MAX_TOP_K
            )
            
            # Log document filter state
            if request.selected_documents:
                logger.info(f"Document filter active: {request.selected_documents}")
            else:
                logger.info("No document filter — searching all documents")
            
            # Route Retrieval based on requested mode ("hybrid" default, "vector", "graph")
            mode = getattr(request, 'retrieval_mode', 'hybrid')
            vector_retrieval_ms = 0.0
            graph_retrieval_ms = 0.0

            # 1. Standard Vector/Keyword Hybrid
            # Also runs for "graph" when Neo4j isn't available — transparently falls back
            run_vector = mode in ["hybrid", "vector"] or (mode == "graph" and not settings.NEO4J_ENABLED)
            if run_vector:
                _t_vec = time.perf_counter()
                retrieval_service = RetrievalService(db)
                vector_chunks = retrieval_service.retrieve(
                    query_embedding=query_embedding,
                    top_k=initial_top_k,
                    source_files=request.selected_documents,
                    user_question=request.question,
                )
                vector_retrieval_ms = (time.perf_counter() - _t_vec) * 1000
                retrieved_chunks.extend(vector_chunks)

            # 2. Graph Retrieval (only when Neo4j is configured)
            if mode in ["hybrid", "graph"] and settings.NEO4J_ENABLED:
                _t_graph = time.perf_counter()
                try:
                    from neo4j import GraphDatabase
                    driver = GraphDatabase.driver(
                        settings.NEO4J_URI,
                        auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD)
                    )
                    graph_service = GraphRetrievalService(driver)
                    graph_chunks = graph_service.retrieve(
                        user_question=request.question,
                        source_files=request.selected_documents,
                        top_k=5  # Keep graph context focused
                    )
                    retrieved_chunks.extend(graph_chunks)
                    driver.close()
                except Exception as e:
                    logger.warning(f"Graph retrieval failed: {e}")
                graph_retrieval_ms = (time.perf_counter() - _t_graph) * 1000
            elif mode == "graph" and not settings.NEO4J_ENABLED:
                logger.info("Graph RAG requested but Neo4j is not configured — falling back to hybrid.")

            total_retrieval_so_far = (time.perf_counter() - start_retrieval) * 1000
            logger.info(
                f"[LATENCY] mode={mode} vector_ms={vector_retrieval_ms:.1f} "
                f"graph_ms={graph_retrieval_ms:.1f} "
                f"total_retrieval_ms={total_retrieval_so_far:.1f}"
            )
            logger.info(f"Retrieved {len(retrieved_chunks)} total chunks (Mode: {mode})")
            
            # Step 3: LLM Reranking (part of retrieval flow)
            # Skip reranking in MULTI_DOC_MODE — reranking would globally
            # re-sort chunks and potentially drop entire documents.
            is_multi_doc = any(
                c.get("metadata", {}).get("multi_doc_mode", False)
                for c in retrieved_chunks
            )
            
            if is_multi_doc:
                logger.info("MULTI_DOC_MODE: skipping reranker to preserve per-document balance.")
                reranked_chunks = retrieved_chunks
                rerank_succeeded = False
            else:
                reranker = RerankingService()
                reranked_chunks, rerank_succeeded = reranker.rerank(
                    question=request.question,
                    chunks=retrieved_chunks,
                    top_n=RERANK_RETURN,
                )
            retrieval_time = (time.perf_counter() - start_retrieval) * 1000
            if retrieval_time > SLOW_RETRIEVAL_THRESHOLD_MS:
                logger.warning(
                    f"WARNING: Slow retrieval detected ({retrieval_time:.0f}ms) "
                    f"[mode={mode}, chunks={len(retrieved_chunks)}]"
                )

        # Step 4: Handle "No Context" case
        if len(retrieved_chunks) == 0:
            total_time = (time.perf_counter() - start_total) * 1000
            log_query(db, request.question, int(total_time), 0,
                      request.selected_documents, 0, False)
            
            fallback_msg = "No relevant content was found in the selected documents."
            
            if stream:
                async def refuse_generator():
                    yield fallback_msg
                return StreamingResponse(refuse_generator(), media_type="text/plain")
            
            return QueryResponse(
                answer=fallback_msg,
                retrieved_chunks=[],
                num_chunks_retrieved=0,
                question=request.question,
                confidence=0,
                debug_latency={
                    "embedding_ms": round(embed_time, 2),
                    "retrieval_ms": round(retrieval_time, 2),
                    "generation_ms": 0.0,
                    "total_ms": round(total_time, 2)
                }
            )
        
        # Step 5: Compute confidence
        confidence = compute_confidence(reranked_chunks, rerank_succeeded)
        
        # Step 6: Construct prompt
        structured_types = ["csv", "xlsx", "xls"]
        structured_chunks = [c for c in reranked_chunks if c.get("metadata", {}).get("file_type") in structured_types]
        is_table_response = len(structured_chunks) > 0 and len(structured_chunks) >= len(reranked_chunks) * 0.5
        
        prompt_service = PromptService()
        
        # ── TABLE RESPONSE FLOW ──
        if is_table_response:
            start_generation = time.perf_counter()
            
            all_rows = []
            seen_hashes = set()
            for chunk in structured_chunks:
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
            
            generation_time = (time.perf_counter() - start_generation) * 1000
            total_time = (time.perf_counter() - start_total) * 1000
            
            # Structured Logging
            print(f"\nQuery: {request.question}")
            print(f"Embedding time: {embed_time:.2f}ms")
            print(f"Retrieval time: {retrieval_time:.2f}ms")
            print(f"Generation time: {generation_time:.2f}ms")
            print(f"Total time: {total_time:.2f}ms\n")
            
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
            
            log_query(db, request.question, int(total_time), confidence,
                      request.selected_documents, len(response_chunks), rerank_succeeded)
            
            return QueryResponse(
                answer=summary_answer,
                retrieved_chunks=response_chunks,
                num_chunks_retrieved=len(response_chunks),
                question=request.question,
                confidence=confidence,
                answer_type="table",
                columns=columns,
                rows=all_rows[:50],
                debug_latency={
                    "embedding_ms": round(embed_time, 2),
                    "retrieval_ms": round(retrieval_time, 2),
                    "generation_ms": round(generation_time, 2),
                    "total_ms": round(total_time, 2)
                }
            )
        
        # ── TEXT RESPONSE FLOW ──
        listing_keywords = ["table", "structured", "grid", "csv", "json"]
        is_listing_intent = any(kw in request.question.lower() for kw in listing_keywords)
        
        prompt = prompt_service.construct_prompt(
            retrieved_chunks=reranked_chunks,
            user_question=request.question,
            structured_mode=is_listing_intent
        )
        
        generation_service = GenerationService()
        
        # STREAMING LOGIC
        if stream:
            # For streaming, we log initial timings but total/generation is unknown
            # Logging partial timing
            print(f"\nQuery: {request.question} (Streaming)")
            print(f"Embedding time: {embed_time:.2f}ms")
            print(f"Retrieval time: {retrieval_time:.2f}ms")
            
            log_query(db, request.question, int((time.perf_counter() - start_total) * 1000), confidence,
                      request.selected_documents, len(reranked_chunks), rerank_succeeded)
            
            def stream_with_meta():
                # We can't inject debug_latency JSON here easily without breaking the stream format
                # keeping it simple as requested
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
        
        # STANDARD GENERATION
        start_generation = time.perf_counter()
        raw_answer = generation_service.generate(prompt)
        generation_time = (time.perf_counter() - start_generation) * 1000
        total_time = (time.perf_counter() - start_total) * 1000
        
        # Structured Logging
        print(f"\nQuery: {request.question}")
        print(f"Embedding time: {embed_time:.2f}ms")
        print(f"Retrieval time: {retrieval_time:.2f}ms")
        print(f"Generation time: {generation_time:.2f}ms")
        print(f"Total time: {total_time:.2f}ms\n")
        
        rows = None
        columns = None
        final_answer = raw_answer
        answer_type = "text"
        
        if is_listing_intent:
            try:
                import re
                json_match = re.search(r'\[.*\]', raw_answer.replace('\n', ' '), re.DOTALL)
                
                if json_match:
                    clean_json = json_match.group(0)
                    parsed_data = json.loads(clean_json)
                    
                    if isinstance(parsed_data, list) and len(parsed_data) > 0:
                        rows = parsed_data
                        columns = list(rows[0].keys())
                        answer_type = "table"
                        final_answer = "Here is the structured list you requested:"
                    else:
                        logging.warning("Structured mode returned invalid JSON structure.")
                else:
                     logging.warning("Structured mode could not find JSON array.")
            except Exception as e:
                logging.warning(f"Failed to parse JSON in structured mode: {e}")
        
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
        
        log_query(db, request.question, int(total_time), confidence,
                  request.selected_documents, len(response_chunks), rerank_succeeded)
        
        return QueryResponse(
            answer=final_answer,
            retrieved_chunks=response_chunks,
            num_chunks_retrieved=len(response_chunks),
            question=request.question,
            confidence=confidence,
            answer_type=answer_type,
            columns=columns,
            rows=rows,
            debug_latency={
                "embedding_ms": round(embed_time, 2),
                "retrieval_ms": round(retrieval_time, 2),
                "generation_ms": round(generation_time, 2),
                "total_ms": round(total_time, 2)
            }
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
