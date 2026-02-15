import logging
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
        
        where_sql = " AND ".join(where_clauses) if where_clauses else "TRUE"
        
        # --- Choose between hybrid or vector-only ---
        use_keyword = bool(user_question and user_question.strip())
        
        if use_keyword:
            params["query_text"] = user_question.strip()
            query = text(f"""
                SELECT 
                    chunk_text,
                    source_file,
                    chunk_index,
                    chunk_metadata,
                    1 - (embedding <=> :query_embedding) AS vector_score,
                    COALESCE(
                        ts_rank(
                            to_tsvector('english', chunk_text),
                            plainto_tsquery('english', :query_text)
                        ),
                        0
                    ) AS keyword_score,
                    (0.7 * (1 - (embedding <=> :query_embedding)))
                    + (0.3 * COALESCE(
                        ts_rank(
                            to_tsvector('english', chunk_text),
                            plainto_tsquery('english', :query_text)
                        ),
                        0
                    )) AS final_score
                FROM document_chunks
                WHERE {where_sql}
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
            result = self.db.execute(query, params)
            
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
            
        except Exception as e:
            raise Exception(f"Retrieval failed: {str(e)}")
