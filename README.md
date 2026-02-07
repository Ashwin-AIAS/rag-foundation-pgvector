# Local RAG Development Infrastructure

A minimal, clean local-only development infrastructure for building Retrieval-Augmented Generation (RAG) systems.

## Overview

This project provides a foundation for building RAG applications with:
- **Backend**: Python + FastAPI
- **Database**: PostgreSQL with pgvector extension
- **Containerization**: Docker Compose for easy local development

## Prerequisites

- [Docker](https://www.docker.com/get-started) and Docker Compose
- [Git](https://git-scm.com/) (optional, for version control)
- OpenAI API key (get one from [OpenAI Platform](https://platform.openai.com/))

## Quick Start

### 1. Set Up Environment Variables

Copy the example environment file and configure your settings:

```bash
cp .env.example .env
```

Edit `.env` and add your OpenAI API key:

```env
OPENAI_API_KEY=sk-your-actual-api-key-here
```

### 2. Start the Services

```bash
docker-compose up -d
```

This will:
- Pull the necessary Docker images
- Build the FastAPI backend
- Start PostgreSQL with pgvector extension
- Initialize the database with the schema

### 3. Verify the Setup

Check that all services are running:

```bash
docker-compose ps
```

Test the API endpoints:

```bash
# Health check
curl http://localhost:8000/health

# Database health check
curl http://localhost:8000/db-health
```

Expected response from `/db-health`:
```json
{
  "database_connected": true,
  "pgvector_enabled": true,
  "status": "healthy"
}
```

### 4. View Logs

```bash
# All services
docker-compose logs -f

# Backend only
docker-compose logs -f backend

# Database only
docker-compose logs -f postgres
```

### 5. Stop the Services

```bash
docker-compose down
```

To also remove the database volume:

```bash
docker-compose down -v
```

## Project Structure

```
RAG/
├── docker-compose.yml          # Docker Compose configuration
├── .env.example                # Environment variable template
├── .env                        # Your local environment variables (not in git)
├── README.md                   # This file
├── backend/                    # FastAPI application
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── __init__.py
│       ├── main.py             # FastAPI app and endpoints
│       ├── config.py           # Configuration management
│       ├── database.py         # Database connection setup
│       └── models/             # SQLAlchemy models (add as needed)
└── database/
    └── init.sql                # Database initialization script
```

## Architecture

### Backend (FastAPI)

The backend runs on **port 8000** and provides:
- RESTful API endpoints
- Database connection management
- Configuration via environment variables
- Hot-reload for development (changes to `backend/app/` are reflected immediately)

### Database (PostgreSQL + pgvector)

The database runs on **port 5432** and includes:
- pgvector extension for vector similarity search
- `document_chunks` table for storing text chunks with embeddings
- HNSW index for fast similarity search
- Persistent storage via Docker volumes

## Development Workflow

### Making Code Changes

1. Edit files in `backend/app/`
2. Changes are automatically detected and the server reloads
3. Test your changes at `http://localhost:8000`

### Accessing the Database

Connect to PostgreSQL:

```bash
docker-compose exec postgres psql -U raguser -d ragdb
```

Useful SQL commands:

```sql
-- List all tables
\dt

-- Describe document_chunks table
\d document_chunks

-- Check pgvector extension
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Query document chunks
SELECT id, source_file, chunk_index, 
       LEFT(chunk_text, 50) as preview 
FROM document_chunks
LIMIT 10;
```

### API Documentation

FastAPI provides automatic interactive API documentation:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Document Ingestion

The system includes a complete document ingestion pipeline using LangChain to convert PDF and text files into searchable vector embeddings.

### How It Works

1. **Upload**: Send a PDF or text file via the `/ingest` endpoint
2. **Extract**: LangChain loaders extract text from the document
3. **Chunk**: Text is split into manageable chunks (1000 chars with 200 char overlap)
4. **Embed**: OpenAI generates 1536-dimensional embeddings for each chunk
5. **Store**: Chunks and embeddings are saved to PostgreSQL with pgvector

### Upload a Document

```bash
# Upload a PDF file
curl -X POST http://localhost:8000/ingest \
  -F "file=@document.pdf"

# Upload a text file
curl -X POST http://localhost:8000/ingest \
  -F "file=@document.txt"
```

Expected response:
```json
{
  "message": "Document ingested successfully",
  "filename": "document.pdf",
  "num_chunks": 15,
  "num_pages": 3,
  "status": "success"
}
```

### List Ingested Documents

```bash
curl http://localhost:8000/documents
```

Response:
```json
{
  "documents": [
    {
      "filename": "document.pdf",
      "num_chunks": 15,
      "created_at": "2026-02-08T00:00:00"
    }
  ],
  "total": 1
}
```

### Delete a Document

```bash
curl -X DELETE http://localhost:8000/documents/document.pdf
```

### Supported File Types

- **PDF** (`.pdf`) - Multi-page documents
- **Text** (`.txt`) - Plain text files

### Configuration

Customize ingestion behavior via environment variables in `.env`:

```env
CHUNK_SIZE=1000          # Characters per chunk
CHUNK_OVERLAP=200        # Overlap between chunks
MAX_FILE_SIZE_MB=10      # Maximum file size
```

### View Ingested Data

Connect to the database to inspect chunks:

```bash
docker-compose exec postgres psql -U raguser -d ragdb
```

```sql
-- View all chunks
SELECT source_file, chunk_index, 
       LEFT(chunk_text, 100) as preview,
       metadata
FROM document_chunks
ORDER BY source_file, chunk_index;

-- Count chunks per document
SELECT source_file, COUNT(*) as num_chunks
FROM document_chunks
GROUP BY source_file;

-- Verify embeddings
SELECT source_file, 
       array_length(embedding::float[], 1) as embedding_dim
FROM document_chunks
LIMIT 5;
```

## Extending the System

This infrastructure includes a complete document ingestion pipeline. Here are the next steps to build a full RAG system:

### 1. Semantic Search (Next Step)

Add retrieval endpoints to:
- Accept user queries
- Generate query embeddings
- Perform vector similarity search using pgvector
- Return relevant document chunks

### 2. RAG Pipeline

Combine retrieval and generation:
- Retrieve relevant chunks based on query
- Construct prompts with retrieved context
- Call OpenAI API to generate responses
- Return augmented responses to users

### 3. Frontend Integration

- The backend already has CORS enabled
- Build a frontend (React, Vue, etc.)
- Connect to the API at `http://localhost:8000`
- Create UI for document upload and querying

## Troubleshooting

### Services won't start

```bash
# Check logs for errors
docker-compose logs

# Rebuild containers
docker-compose up -d --build
```

### Database connection issues

```bash
# Verify database is healthy
docker-compose exec postgres pg_isready -U raguser

# Check environment variables
docker-compose exec backend env | grep POSTGRES
```

### Port conflicts

If ports 5432 or 8000 are already in use, edit `docker-compose.yml`:

```yaml
ports:
  - "5433:5432"  # Use different host port
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `POSTGRES_USER` | Database username | `raguser` |
| `POSTGRES_PASSWORD` | Database password | `ragpassword` |
| `POSTGRES_DB` | Database name | `ragdb` |
| `OPENAI_API_KEY` | OpenAI API key | (required) |
| `CHUNK_SIZE` | Characters per text chunk | `1000` |
| `CHUNK_OVERLAP` | Overlap between chunks | `200` |
| `MAX_FILE_SIZE_MB` | Maximum upload file size | `10` |

## Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [LangChain Documentation](https://python.langchain.com/)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Docker Compose Documentation](https://docs.docker.com/compose/)

## License

This project is provided as-is for educational and development purposes.
