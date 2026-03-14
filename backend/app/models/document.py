from sqlalchemy import Column, Integer, String, Text, TIMESTAMP, Index, UniqueConstraint, Computed
from sqlalchemy.dialects.postgresql import JSONB, TSVECTOR
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector
from app.database import Base


class Document(Base):
    """
    Persistent tracking record for every upload/ingestion job.

    Status lifecycle: UPLOADED → PROCESSING → COMPLETE | FAILED | DUPLICATE | EMPTY
    Survives server restarts unlike the in-memory ingestion_jobs dict.
    """
    __tablename__ = "documents"

    id = Column(String(36), primary_key=True, index=True)          # UUID string
    filename = Column(String(255), nullable=False, index=True)
    status = Column(String(20), nullable=False, default="UPLOADED")  # UPLOADED/PROCESSING/COMPLETE/FAILED/DUPLICATE
    num_chunks = Column(Integer, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<Document(id={self.id}, filename={self.filename}, status={self.status})>"


class DocumentChunk(Base):
    """
    SQLAlchemy model for document chunks with embeddings.
    
    Each row represents a chunk of text extracted from an uploaded document,
    along with its vector embedding for semantic search.
    """
    __tablename__ = "document_chunks"
    
    id = Column(Integer, primary_key=True, index=True)
    source_file = Column(String(255), nullable=False, index=True)
    chunk_index = Column(Integer, nullable=False)
    chunk_text = Column(Text, nullable=False)
    embedding = Column(Vector(768))  # Gemini gemini-embedding-001 produces 768-dimensional embeddings
    chunk_metadata = Column(JSONB)  # Renamed from 'metadata' to avoid SQLAlchemy reserved keyword
    
    # Computed column for hybrid search (matches DB migration)
    # Note: 'persisted=True' corresponds to 'STORED' in PostgreSQL
    # COMMENTED OUT to prevent "UndefinedColumn" errors in SQLAlchemy.
    # The column exists in DB and is used via raw SQL in retrieval_service.py.
    # search_vector = Column(TSVECTOR, Computed("to_tsvector('english', chunk_text)", persisted=True))
    
    created_at = Column(TIMESTAMP, server_default=func.now())
    
    # Ensure unique chunks per document
    __table_args__ = (
        UniqueConstraint('source_file', 'chunk_index', name='uq_source_chunk'),
        Index('idx_document_chunks_metadata', 'chunk_metadata', postgresql_using='gin'),
    )
    
    def __repr__(self):
        return f"<DocumentChunk(id={self.id}, source={self.source_file}, chunk={self.chunk_index})>"


class Feedback(Base):
    """
    SQLAlchemy model for user feedback on generated answers.
    
    Stores user ratings (positive/negative) on RAG system responses.
    This data is for analysis only and does NOT modify system behavior.
    """
    __tablename__ = "feedback"
    
    id = Column(Integer, primary_key=True, index=True)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    feedback = Column(String(10), nullable=False)  # 'positive' or 'negative'
    num_chunks_retrieved = Column(Integer, nullable=False)
    timestamp = Column(TIMESTAMP, nullable=False)  # When user gave feedback
    created_at = Column(TIMESTAMP, server_default=func.now())  # When record was created
    
    def __repr__(self):
        return f"<Feedback(id={self.id}, feedback={self.feedback}, chunks={self.num_chunks_retrieved})>"

class PaperSummary(Base):
    """
    SQLAlchemy model for structured research paper summaries.
    
    Stores the extracted sections of a research paper at ingestion,
    for use in balanced multi-document comparison.
    """
    __tablename__ = "paper_summaries"
    
    id = Column(String(36), primary_key=True, index=True)
    source_file = Column(String(255), nullable=False, index=True, unique=True)
    problem_statement = Column(Text)
    methodology = Column(Text)
    datasets = Column(Text)
    evaluation_metrics = Column(Text)
    key_results = Column(Text)
    limitations = Column(Text)
    contributions = Column(Text)
    created_at = Column(TIMESTAMP, server_default=func.now())
    
    def __repr__(self):
        return f"<PaperSummary(id={self.id}, source_file={self.source_file})>"
