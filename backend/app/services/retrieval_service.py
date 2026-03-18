import logging
import time
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.config import settings

logger = logging.getLogger(__name__)


class RetrievalService:
    """
    Service for retrieving relevant document chunks using hybrid search.
    
    Combines pgvector cosine similarity (70%) with PostgreSQL full-text
    keyword search (30%) for more robust retrieval.
    
    Always returns top-K most similar chunks — no threshold filtering
    in SQL.  The caller decides what to do with low-similarity results.
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    def retrieve(
        self,
        query_embedding: List[float],
        top_k: int = None,
        source_files: List[str] = None,
        user_question: str = None,
        **_kwargs,
    ) -> List[Dict[str, Any]]:
        """
        Hybrid retrieval: vector similarity + keyword full-text search.
        
        final_score = 0.7 * vector_score + 0.3 * keyword_score
        
        Always returns the top_k results ordered by final_score DESC.
        No minimum-similarity WHERE clause is applied.
        """
        if top_k is None:
            top_k = settings.TOP_K
            
        is_subquery = _kwargs.get("_is_balanced_subquery", False)
        
        # --- MULTI-DOCUMENT MODE ---
        # When multiple documents are selected and this is NOT a balanced
        # sub-query, ensure every document contributes context by retrieving
        # per-document chunks.  The existing "balanced comparison" path
        # (compare/contrast keywords) does deeper section-level retrieval
        # and is preserved below.
        if not is_subquery and source_files and len(source_files) > 1:
            lower_q = (user_question or "").lower()
            is_comparison_query = any(
                w in lower_q for w in ["compare", "contrast", "differentiate"]
            )
            
            if not is_comparison_query:
                logger.info(
                    f"MULTI_DOC_MODE activated for {len(source_files)} documents."
                )
                all_chunks = []

                # Structured retrieval queries — one chunk each per document
                from app.services.embedding_service import EmbeddingService
                emb_service = EmbeddingService()
                structured_queries = [
                    "main contribution",
                    "methodology",
                    "experimental results",
                ]
                query_embeddings = [emb_service.embed_query(q) for q in structured_queries]

                for sf in source_files:
                    sf_chunks = []
                    for q_text, q_emb in zip(structured_queries, query_embeddings):
                        sf_chunks.extend(self.retrieve(
                            q_emb,
                            top_k=1,
                            source_files=[sf],
                            user_question=q_text,
                            _is_balanced_subquery=True,
                        ))

                    # Deduplicate and tag with multi_doc_mode
                    seen_texts = set()
                    for c in sf_chunks:
                        if c["chunk_text"] not in seen_texts:
                            seen_texts.add(c["chunk_text"])
                            if not c.get("metadata"):
                                c["metadata"] = {}
                            c["metadata"]["multi_doc_mode"] = True
                            all_chunks.append(c)

                logger.info(
                    f"MULTI_DOC_MODE collected {len(all_chunks)} chunks "
                    f"across {len(source_files)} documents."
                )
                return all_chunks
        
        # --- Balanced Retrieval Mode (compare/contrast keywords) ---
        if not is_subquery and user_question and source_files and len(source_files) > 1:
            lower_q = user_question.lower()
            if any(w in lower_q for w in ["compare", "contrast", "differentiate"]):
                logger.info("Balanced comparison retrieval activated with Structural Coverage.")
                all_chunks = []
                for sf in source_files:
                    # Determine if section metadata exists by running a quick check
                    has_sections = False
                    try:
                        res = self.db.execute(text("SELECT 1 FROM document_chunks WHERE source_file = :sf AND chunk_metadata->>'section' IS NOT NULL LIMIT 1"), {"sf": sf}).fetchone()
                        if res:
                            has_sections = True
                    except Exception:
                        self.db.rollback()
                        
                    sf_chunks = []
                    
                    if has_sections:
                        logger.info(f"Section metadata found for {sf}. Retrieving structurally.")
                        # 1 abstract/intro
                        sf_chunks.extend(self.retrieve(query_embedding, top_k=1, source_files=[sf], user_question=user_question, _is_balanced_subquery=True, _section_filter=["Abstract", "Introduction"]))
                        # 2 methodology
                        sf_chunks.extend(self.retrieve(query_embedding, top_k=2, source_files=[sf], user_question=user_question, _is_balanced_subquery=True, _section_filter=["Method", "Methodology"]))
                        # 2 results/evaluation
                        sf_chunks.extend(self.retrieve(query_embedding, top_k=2, source_files=[sf], user_question=user_question, _is_balanced_subquery=True, _section_filter=["Results", "Experiments", "Conclusion"]))
                    else:
                        logger.info(f"No section metadata for {sf}. Running targeted subqueries.")
                        # Lazy import to avoid circular dependencies if any
                        from app.services.embedding_service import EmbeddingService
                        emb_service = EmbeddingService()
                        
                        # Query A: "problem statement"
                        qa_emb = emb_service.embed_query("problem statement")
                        sf_chunks.extend(self.retrieve(qa_emb, top_k=2, source_files=[sf], user_question="problem statement", _is_balanced_subquery=True))
                        
                        # Query B: "methodology"
                        qb_emb = emb_service.embed_query("methodology")
                        sf_chunks.extend(self.retrieve(qb_emb, top_k=2, source_files=[sf], user_question="methodology", _is_balanced_subquery=True))
                        
                        # Query C: "experimental results"
                        qc_emb = emb_service.embed_query("experimental results")
                        sf_chunks.extend(self.retrieve(qc_emb, top_k=2, source_files=[sf], user_question="experimental results", _is_balanced_subquery=True))
                    
                    # Ensure no duplicates and flag metadata
                    unique_chunks = []
                    seen_texts = set()
                    for c in sf_chunks:
                        if c["chunk_text"] not in seen_texts:
                            seen_texts.add(c["chunk_text"])
                            if not c.get("metadata"):
                                c["metadata"] = {}
                            c["metadata"]["balanced_mode"] = True
                            unique_chunks.append(c)
                            
                    all_chunks.extend(unique_chunks[:5]) # Enforce max 5 per paper
                return all_chunks[:10]
        
        embedding_str = "[" + ",".join(str(x) for x in query_embedding) + "]"
        
        # --- Build WHERE clauses (source-file filter only) ---
        where_clauses = []
        params: Dict[str, Any] = {
            "query_embedding": embedding_str,
            "limit": top_k,
        }
        
        if source_files and len(source_files) > 0:
            file_params = {}
            file_placeholders = []
            for i, sf in enumerate(source_files):
                key = f"sf_{i}"
                file_params[key] = sf
                file_placeholders.append(f":{key}")
            where_clauses.append(f"source_file IN ({','.join(file_placeholders)})")
            params.update(file_params)
            
        section_filter = _kwargs.get("_section_filter")
        if section_filter:
            sec_clauses = []
            for i, sec in enumerate(section_filter):
                sec_clauses.append(f"chunk_metadata->>'section' ILIKE :sec_{i}")
                params[f"sec_{i}"] = f"%{sec}%"
            if sec_clauses:
                where_clauses.append("(" + " OR ".join(sec_clauses) + ")")
        
        where_sql = " AND ".join(where_clauses) if where_clauses else "TRUE"
        
        # --- Choose between hybrid or vector-only ---
        use_keyword = bool(user_question and user_question.strip())
        
        if use_keyword:
            params["query_text"] = user_question.strip()
            query = text(f"""
                WITH vector_search AS (
                    SELECT 
                        id, 
                        chunk_text,
                        source_file,
                        chunk_index,
                        chunk_metadata,
                        1 - (embedding <=> :query_embedding) AS vector_score,
                        ROW_NUMBER() OVER (ORDER BY embedding <=> :query_embedding) AS vector_rank
                    FROM document_chunks
                    WHERE {where_sql}
                    ORDER BY embedding <=> :query_embedding
                    LIMIT :limit * 4
                ),
                keyword_search AS (
                    SELECT 
                        id,
                        ts_rank(search_vector, plainto_tsquery('english', :query_text)) AS keyword_score,
                        ROW_NUMBER() OVER (ORDER BY ts_rank(search_vector, plainto_tsquery('english', :query_text)) DESC) AS keyword_rank
                    FROM document_chunks
                    WHERE {where_sql}
                      AND search_vector @@ plainto_tsquery('english', :query_text)
                    ORDER BY keyword_score DESC
                    LIMIT :limit * 4
                )
                SELECT 
                    COALESCE(v.chunk_text, k_full.chunk_text) AS chunk_text,
                    COALESCE(v.source_file, k_full.source_file) AS source_file,
                    COALESCE(v.chunk_index, k_full.chunk_index) AS chunk_index,
                    COALESCE(v.chunk_metadata, k_full.chunk_metadata) AS chunk_metadata,
                    COALESCE(v.vector_score, 0) AS vector_score,
                    COALESCE(k.keyword_score, 0) AS keyword_score,
                    COALESCE(1.0 / (60 + v.vector_rank), 0.0) + 
                    COALESCE(1.0 / (60 + k.keyword_rank), 0.0) AS final_score
                FROM vector_search v
                FULL OUTER JOIN keyword_search k ON v.id = k.id
                LEFT JOIN document_chunks k_full ON k.id = k_full.id
                ORDER BY final_score DESC
                LIMIT :limit
            """)
        else:
            query = text(f"""
                SELECT 
                    chunk_text,
                    source_file,
                    chunk_index,
                    chunk_metadata,
                    1 - (embedding <=> :query_embedding) AS vector_score,
                    0 AS keyword_score,
                    1 - (embedding <=> :query_embedding) AS final_score
                FROM document_chunks
                WHERE {where_sql}
                ORDER BY embedding <=> :query_embedding
                LIMIT :limit
            """)
        
        try:
            # Attempt Hybrid Search (requires search_vector column)
            start_q = time.perf_counter()
            result = self.db.execute(query, params)
            elapsed = (time.perf_counter() - start_q) * 1000
            if elapsed > 2000:
                logger.warning(f"Hybrid retrieval took {elapsed:.0f}ms (threshold 2000ms)")
        except Exception as e:
            # CRITICAL FIX: Rollback the failed transaction immediately
            self.db.rollback()
            
            # Fallback for Missing Column (e.g. Production DB not updated)
            if "UndefinedColumn" in str(e) or "does not exist" in str(e):
                logger.warning(f"Hybrid search failed (Schema Mismatch). Rolling back and switching to fallback. Error: {e}")
                
                if use_keyword:
                    logger.info("Fallback Mode: Active (On-the-fly tsvector calculation)")
                    # Reconstruct query using to_tsvector() instead of search_vector column
                    query = text(f"""
                        WITH vector_search AS (
                            SELECT 
                                id, 
                                chunk_text,
                                source_file,
                                chunk_index,
                                chunk_metadata,
                                1 - (embedding <=> :query_embedding) AS vector_score,
                                ROW_NUMBER() OVER (ORDER BY embedding <=> :query_embedding) AS vector_rank
                            FROM document_chunks
                            WHERE {where_sql}
                            ORDER BY embedding <=> :query_embedding
                            LIMIT :limit * 4
                        ),
                        keyword_search AS (
                            SELECT 
                                id,
                                ts_rank(to_tsvector('english', chunk_text), plainto_tsquery('english', :query_text)) AS keyword_score,
                                ROW_NUMBER() OVER (ORDER BY ts_rank(to_tsvector('english', chunk_text), plainto_tsquery('english', :query_text)) DESC) AS keyword_rank
                            FROM document_chunks
                            WHERE {where_sql}
                              AND to_tsvector('english', chunk_text) @@ plainto_tsquery('english', :query_text)
                            ORDER BY keyword_score DESC
                            LIMIT :limit * 4
                        )
                        SELECT 
                            COALESCE(v.chunk_text, k_full.chunk_text) AS chunk_text,
                            COALESCE(v.source_file, k_full.source_file) AS source_file,
                            COALESCE(v.chunk_index, k_full.chunk_index) AS chunk_index,
                            COALESCE(v.chunk_metadata, k_full.chunk_metadata) AS chunk_metadata,
                            COALESCE(v.vector_score, 0) AS vector_score,
                            COALESCE(k.keyword_score, 0) AS keyword_score,
                            COALESCE(1.0 / (60 + v.vector_rank), 0.0) + 
                            COALESCE(1.0 / (60 + k.keyword_rank), 0.0) AS final_score
                        FROM vector_search v
                        FULL OUTER JOIN keyword_search k ON v.id = k.id
                        LEFT JOIN document_chunks k_full ON k.id = k_full.id
                        ORDER BY final_score DESC
                        LIMIT :limit
                    """)
                    try:
                        result = self.db.execute(query, params)
                    except Exception as fallback_e:
                        self.db.rollback() # Ensure cleanliness even after fallback failure
                        
                        # Check if failure is due to 'chunk_metadata' column missing (Old Schema)
                        if "chunk_metadata" in str(fallback_e) and ("UndefinedColumn" in str(fallback_e) or "does not exist" in str(fallback_e)):
                             logger.warning("chunk_metadata column missing. Trying legacy 'metadata' column.")
                             
                             # Reconstruct query using 'metadata' instead of 'chunk_metadata'
                             query = text(f"""
                                WITH vector_search AS (
                                    SELECT 
                                        id, 
                                        chunk_text,
                                        source_file,
                                        chunk_index,
                                        metadata AS chunk_metadata,
                                        1 - (embedding <=> :query_embedding) AS vector_score,
                                        ROW_NUMBER() OVER (ORDER BY embedding <=> :query_embedding) AS vector_rank
                                    FROM document_chunks
                                    WHERE {where_sql}
                                    ORDER BY embedding <=> :query_embedding
                                    LIMIT :limit * 4
                                ),
                                keyword_search AS (
                                    SELECT 
                                        id,
                                        ts_rank(to_tsvector('english', chunk_text), plainto_tsquery('english', :query_text)) AS keyword_score,
                                        ROW_NUMBER() OVER (ORDER BY ts_rank(to_tsvector('english', chunk_text), plainto_tsquery('english', :query_text)) DESC) AS keyword_rank
                                    FROM document_chunks
                                    WHERE {where_sql}
                                      AND to_tsvector('english', chunk_text) @@ plainto_tsquery('english', :query_text)
                                    ORDER BY keyword_score DESC
                                    LIMIT :limit * 4
                                )
                                SELECT 
                                    COALESCE(v.chunk_text, k_full.chunk_text) AS chunk_text,
                                    COALESCE(v.source_file, k_full.source_file) AS source_file,
                                    COALESCE(v.chunk_index, k_full.chunk_index) AS chunk_index,
                                    COALESCE(v.chunk_metadata, k_full.metadata) AS chunk_metadata,
                                    COALESCE(v.vector_score, 0) AS vector_score,
                                    COALESCE(k.keyword_score, 0) AS keyword_score,
                                    COALESCE(1.0 / (60 + v.vector_rank), 0.0) + 
                                    COALESCE(1.0 / (60 + k.keyword_rank), 0.0) AS final_score
                                FROM vector_search v
                                FULL OUTER JOIN keyword_search k ON v.id = k.id
                                LEFT JOIN document_chunks k_full ON k.id = k_full.id
                                ORDER BY final_score DESC
                                LIMIT :limit
                            """)
                             result = self.db.execute(query, params)
                        else:
                            logger.error(f"Fallback query FAILED: {fallback_e}")
                            raise fallback_e
                else:
                    # If not using keyword, the error shouldn't happen unless something else is wrong
                    raise e
            else:
                # If it's not a column error, re-raise
                raise e

        chunks = []
        for row in result:
            chunks.append({
                "chunk_text": row.chunk_text,
                "source_file": row.source_file,
                "chunk_index": row.chunk_index,
                "metadata": row.chunk_metadata,
                "similarity_score": float(row.vector_score),
                "keyword_score": float(row.keyword_score),
                "final_score": float(row.final_score),
            })
        
        return chunks
