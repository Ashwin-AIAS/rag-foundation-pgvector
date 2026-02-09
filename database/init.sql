-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Table for storing document chunks with embeddings
-- Each row represents a chunk of text from an uploaded document
CREATE TABLE IF NOT EXISTS document_chunks (
    id SERIAL PRIMARY KEY,
    source_file VARCHAR(255) NOT NULL,
    chunk_index INTEGER NOT NULL,
    chunk_text TEXT NOT NULL,
    embedding vector(1536),  -- OpenAI text-embedding-ada-002 produces 1536-dimensional embeddings
    chunk_metadata JSONB,  -- Renamed from metadata to avoid SQLAlchemy reserved keyword
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique chunks per document
    UNIQUE(source_file, chunk_index)
);

-- Create an index for faster vector similarity search
-- Using HNSW (Hierarchical Navigable Small World) algorithm
CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx 
ON document_chunks 
USING hnsw (embedding vector_cosine_ops);

-- Create an index on source_file for faster document retrieval
CREATE INDEX IF NOT EXISTS document_chunks_source_file_idx 
ON document_chunks (source_file);

-- Create an index on chunk_metadata for faster filtering
CREATE INDEX IF NOT EXISTS document_chunks_metadata_idx 
ON document_chunks 
USING gin (chunk_metadata);
