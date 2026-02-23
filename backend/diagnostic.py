import sys
import os
import json
from sqlalchemy import text
from app.database import SessionLocal, engine
from app.services.retrieval_service import RetrievalService
from app.services.embedding_service import EmbeddingService

def run_diagnostics():
    db = SessionLocal()
    report = {
        "chunk_distribution": {},
        "avg_chunk_length": {},
        "hybrid_fallback_detected": False,
        "retrieval_balance": {},
        "context_token_distribution": {},
        "suspected_root_cause": ""
    }

    try:
        # 1 & 2 & 3. Count total chunks and avg length
        stats_query = text("""
            SELECT source_file, COUNT(*), AVG(LENGTH(chunk_text))
            FROM document_chunks
            GROUP BY source_file
        """)
        result = db.execute(stats_query).fetchall()
        
        all_papers = []
        for row in result:
            source = row[0]
            count = row[1]
            avg_len = row[2]
            report["chunk_distribution"][source] = count
            report["avg_chunk_length"][source] = round(avg_len, 2)
            all_papers.append(source)
            
        if len(all_papers) < 2:
            print(json.dumps({"error": "Need at least 2 papers in DB to diagnose"}))
            return
            
        paperA, paperB = all_papers[0], all_papers[1]
        
        # 4. Verify search_vector
        try:
            db.execute(text("SELECT search_vector FROM document_chunks LIMIT 1"))
        except Exception as e:
            db.rollback()
            report["hybrid_fallback_detected"] = True

        # Emulate comparison query
        # 5, 6, 7
        embed_service = EmbeddingService()
        query_text = "Compare these two papers"
        q_emb = embed_service.embed_query(query_text)
        
        retrieval = RetrievalService(db)
        docs = retrieval.retrieve(
            query_embedding=q_emb,
            top_k=15, # Before balanced limit
            source_files=[paperA, paperB],
            user_question=query_text
        )
        
        countA = sum(1 for d in docs if d["source_file"] == paperA)
        countB = sum(1 for d in docs if d["source_file"] == paperB)
        
        report["retrieval_balance"][f"{paperA}_chunks"] = countA
        report["retrieval_balance"][f"{paperB}_chunks"] = countB
        
        lenA = sum(len(d["chunk_text"]) for d in docs if d["source_file"] == paperA)
        lenB = sum(len(d["chunk_text"]) for d in docs if d["source_file"] == paperB)
        
        report["context_token_distribution"][paperA] = lenA
        report["context_token_distribution"][paperB] = lenB
        
        # Root cause logic
        if abs(countA - countB) > 2:
            report["suspected_root_cause"] = "Retrieval imbalance detected. One paper dominates the top-K due to similarity skew."
        elif "hybrid_fallback_detected" in report and report["hybrid_fallback_detected"]:
             report["suspected_root_cause"] = "Schema mismatch. Missing search_vector triggered fallback causing slow/imbalanced results."
        else:
             report["suspected_root_cause"] = "No structural imbalance found. Check generation prompt configuration."

        print("=== JSON REPORT START ===")
        print(json.dumps(report, indent=2))
        print("=== JSON REPORT END ===")
        
    finally:
        db.close()

if __name__ == "__main__":
    run_diagnostics()
