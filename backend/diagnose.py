import logging
logging.disable(logging.CRITICAL)  # Suppress SQLAlchemy echo
from app.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()

# 1. Check chunks per document  
rows = db.execute(text(
    "SELECT source_file, count(*) as cnt, count(search_vector) as sv_cnt "
    "FROM document_chunks GROUP BY source_file"
)).fetchall()

print("=== Document Chunks ===")
for row in rows:
    print(f"  {row[0]}: chunks={row[1]}, search_vectors={row[2]}")

# 2. Check if CUDA doc exists with exact name
cuda_rows = db.execute(text(
    "SELECT DISTINCT source_file FROM document_chunks "
    "WHERE source_file ILIKE '%cuda%'"
)).fetchall()
print(f"\n=== CUDA documents found ===")
for row in cuda_rows:
    print(f"  '{row[0]}'")

# 3. Test a simple retrieval query
print("\n=== Testing retrieval with search_vector ===")
try:
    test = db.execute(text(
        "SELECT chunk_text, "
        "ts_rank(search_vector, plainto_tsquery('english', 'install cuda')) AS rank "
        "FROM document_chunks "
        "WHERE source_file ILIKE '%cuda%' "
        "ORDER BY rank DESC LIMIT 3"
    )).fetchall()
    for row in test:
        print(f"  rank={row[1]:.4f} text={row[0][:80]}...")
    print(f"  Total results: {len(test)}")
except Exception as e:
    print(f"  ERROR: {e}")

db.close()
