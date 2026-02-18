# Local RAG Development Infrastructure

A clean, local-only development infrastructure for building Retrieval-Augmented Generation (RAG) systems with Google Gemini and a React frontend.

## Overview

This project provides a complete foundation for building RAG applications with:

- **Backend**: Python + FastAPI
- **Frontend**: React + Vite + Tailwind CSS
- **Database**: PostgreSQL with pgvector extension
- **AI Models**: Google Gemini (Embeddings & Generation)
- **Containerization**: Docker Compose for easy local development

## Prerequisites

- [Docker](https://www.docker.com/get-started) and Docker Compose
- [Node.js](https://nodejs.org/) (v18+ for frontend)
- [Git](https://git-scm.com/)
- Google Cloud API key (get one from [Google AI Studio](https://aistudio.google.com/))

## Quick Start

### 1. Set Up Environment Variables

Copy the example environment file and configure your settings:

```bash
cp .env.example .env
```

Edit `.env` and add your Google Gemini API key:

```env
GEMINI_API_KEY=your-gemini-api-key-here
```

### 2. Start the Backend Services

```bash
docker-compose up -d
```

This will:

- Start PostgreSQL with pgvector extension
- Build and start the FastAPI backend (available at `http://localhost:8000`)

### 3. Start the Frontend

Open a new terminal and navigate to the `frontend` directory:

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:5173`.

### 4. Verify the Setup

**Backend Health Check:**

```bash
curl http://localhost:8000/health
```

**Database Health Check:**

```bash
curl http://localhost:8000/db-health
```

Expected response:

```json
{
  "database_connected": true,
  "pgvector_enabled": true,
  "status": "healthy"
}
```

## Project Structure

```
RAG/
├── docker-compose.yml          # Backend services configuration
├── .env.example                # Environment variable template
├── .env                        # Local environment variables
├── README.md                   # This file
├── backend/                    # FastAPI application
│   ├── app/
│   │   ├── main.py             # API endpoints
│   │   ├── config.py           # Configuration (Gemini, DB, etc.)
│   │   ├── database.py         # Database connection
│   │   └── services/           # Business logic (Ingestion, Generation)
├── database/                   # Database initialization
└── frontend/                   # React application
    ├── src/
    │   ├── components/         # UI Components (Upload, Chat)
    │   ├── services/           # API integration
    │   └── App.jsx             # Main application logic
```

## Architecture

### Backend (FastAPI)

The backend runs on **port 8000** and handles:

- Document ingestion and processing
- Vector embedding generation using `text-embedding-004`
- Similarity search via `pgvector`
- Response generation using `gemini-1.5-flash`

### Frontend (React)

The frontend runs on **port 5173** (dev) and provides:

- Drag-and-drop file upload
- Interactive chat interface
- Real-time processing status
- Source citations for answers

### Database (PostgreSQL + pgvector)

Runs on **port 5432** and stores:

- Document chunks
- Vector embeddings (768 dimensions)
- Document metadata

## Document Ingestion

The system supports ingesting the following file types:

- **PDF** (`.pdf`)
- **Text** (`.txt`)
- **Word** (`.docx`)
- **Markdown** (`.md`)
- **CSV** (`.csv`)
- **Excel** (`.xlsx`, `.xls`)

### How It Works

1. **Upload**: Files are sent to `/ingest`.
2. **Extract & Chunk**: Text is extracted and split into chunks (default 1000 chars).
3. **Embed**: Google's `text-embedding-004` model generates embeddings.
4. **Store**: Chunks and embeddings are saved to PostgreSQL.

### API Usage

```bash
curl -X POST http://localhost:8000/ingest \
  -F "file=@document.pdf"
```

## Environment Variables

| Variable                 | Description              | Default                     |
| ------------------------ | ------------------------ | --------------------------- |
| `GEMINI_API_KEY`         | Google AI Studio API Key | (required)                  |
| `GEMINI_MODEL`           | Generation Model         | `gemini-1.5-flash`          |
| `GEMINI_EMBEDDING_MODEL` | Embedding Model          | `models/text-embedding-004` |
| `POSTGRES_USER`          | DB User                  | `raguser`                   |
| `POSTGRES_PASSWORD`      | DB Password              | `ragpassword`               |
| `POSTGRES_DB`            | DB Name                  | `ragdb`                     |
| `CHUNK_SIZE`             | Characters per chunk     | `1000`                      |
| `CHUNK_OVERLAP`          | Overlap characters       | `150`                       |

## Troubleshooting

### Services won't start

```bash
docker-compose logs -f
```

### Database connection issues

Ensure the `postgres` container is healthy:

```bash
docker-compose ps
```

## License

MIT
