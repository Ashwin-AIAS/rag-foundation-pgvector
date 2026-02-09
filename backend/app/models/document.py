from sqlalchemy import Column, Integer, String, Text, TIMESTAMP, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector
from app.database import Base


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
    embedding = Column(Vector(1536))  # OpenAI ada-002 embedding dimension
    chunk_metadata = Column(JSONB)  # Renamed from 'metadata' to avoid SQLAlchemy reserved keyword
    created_at = Column(TIMESTAMP, server_default=func.now())
    
    # Ensure unique chunks per document
    __table_args__ = (
        UniqueConstraint('source_file', 'chunk_index', name='uq_source_chunk'),
        Index('idx_document_chunks_metadata', 'chunk_metadata', postgresql_using='gin'),
    )
    
    def __repr__(self):
        return f"<DocumentChunk(id={self.id}, source={self.source_file}, chunk={self.chunk_index})>"
