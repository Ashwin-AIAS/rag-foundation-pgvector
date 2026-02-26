# RAG System — Full-Stack Retrieval-Augmented Generation

A full-stack Retrieval-Augmented Generation (RAG) system built with **FastAPI**, **React**, **PostgreSQL + pgvector**, and **Google Gemini** — deployed on **Render** (backend) and **Vercel** (frontend).

## Features

- **Document Ingestion** — Upload PDF, DOCX, TXT, Markdown, CSV, and Excel files with background processing and real-time status tracking
- **Semantic Retrieval** — Vector similarity search powered by pgvector and Gemini `text-embedding-004`
- **Hybrid Retrieval** — Combine vector search with keyword-based full-text search for better recall
- **Graph RAG** _(optional)_ — Knowledge graph extraction and retrieval via Neo4j (auto-detected; disabled gracefully if unavailable)
- **Reranking** — Cross-encoder reranking for improved answer relevance
- **Grounded Generation** — Context-aware answers with source citations using Gemini 1.5 Flash
- **Conversation History** — Multi-turn conversations with context-aware follow-up
- **Feedback System** — Thumbs up/down feedback on answers for quality tracking
- **Admin Analytics** — Dashboard with ingestion stats, query metrics, and feedback overview
- **Document Management** — View, select, and delete uploaded documents

## Tech Stack

| Layer        | Technology                               |
| ------------ | ---------------------------------------- |
| **Backend**  | Python, FastAPI                          |
| **Frontend** | React, Vite                              |
| **Database** | PostgreSQL + pgvector                    |
| **Graph DB** | Neo4j _(optional, auto-detected)_        |
| **AI**       | Google Gemini (Embeddings & Generation)  |
| **Hosting**  | Render (backend + DB), Vercel (frontend) |

## Quick Start

### Prerequisites

- [Docker](https://www.docker.com/get-started) and Docker Compose (for local development)
- [Node.js](https://nodejs.org/) v18+
- [Git](https://git-scm.com/)
- Google Gemini API key — get one from [Google AI Studio](https://aistudio.google.com/)

### 1. Clone & Configure

```bash
git clone https://github.com/Ashwin-AIAS/rag-foundation-pgvector.git
cd rag-foundation-pgvector
cp .env.example .env
```

Edit `.env` and add your Gemini API key:

```env
GEMINI_API_KEY=your-gemini-api-key-here
```

### 2. Start the Backend (Docker)

```bash
docker-compose up -d
```

This starts PostgreSQL (with pgvector) and the FastAPI backend at `http://localhost:8000`.

### 3. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:5173`.

### 4. Verify

```bash
# Backend health
curl http://localhost:8000/health

# Database health
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
├── docker-compose.yml              # Local dev services
├── .env.example                    # Environment variable template
├── DEPLOYMENT.md                   # Production deployment guide
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py                 # API endpoints & routing
│       ├── config.py               # Settings (DB, Gemini, Neo4j, etc.)
│       ├── database.py             # PostgreSQL connection
│       ├── models/
│       │   └── document.py         # Document status model
│       └── services/
│           ├── ingestion.py        # Document parsing, chunking, embedding
│           ├── retrieval_service.py # Vector + hybrid retrieval
│           ├── reranking_service.py # Cross-encoder reranking
│           ├── generation_service.py# Gemini answer generation
│           ├── prompt_service.py   # Prompt templates
│           ├── document_service.py # Document CRUD & status
│           ├── gemini_embedding_service.py  # Batch embedding with rate limiting
│           ├── graph_extraction_service.py  # Neo4j knowledge graph builder
│           └── graph_retrieval_service.py   # Graph-based retrieval
└── frontend/
    ├── package.json
    └── src/
        ├── App.jsx                 # Main application
        ├── index.css               # Styling
        ├── services/
        │   └── api.js              # Backend API integration
        └── components/
            ├── FileUpload.jsx      # Drag-and-drop upload with status
            ├── QuestionInput.jsx   # Query input with retrieval mode selector
            ├── AnswerDisplay.jsx   # Markdown answers with source citations
            ├── DocumentSelector.jsx# Document filter & management
            ├── ConversationHistory.jsx  # Multi-turn chat history
            ├── HistoryItem.jsx     # Individual conversation entry
            ├── FeedbackButtons.jsx # Thumbs up/down feedback
            ├── AdminAnalytics.jsx  # Analytics dashboard
            ├── LoadingOverlay.jsx  # Processing indicator
            └── Toast.jsx           # Notification toasts
```

## Architecture

### Document Ingestion Pipeline

1. **Upload** → Files are sent to `/upload` and saved immediately (HTTP 202)
2. **Background Processing** → Parsing, chunking, and embedding run asynchronously
3. **Embed** → Google Gemini `text-embedding-004` generates 768-dim vectors (with retry & rate limiting)
4. **Store** → Chunks + embeddings are saved to PostgreSQL with per-chunk transaction safety

### Retrieval Modes

| Mode       | Description                                          |
| ---------- | ---------------------------------------------------- |
| **Vector** | Cosine similarity search via pgvector                |
| **Hybrid** | Vector search + full-text keyword search combined    |
| **Graph**  | Knowledge graph traversal via Neo4j _(if available)_ |

### Generation

Answers are generated by **Gemini 1.5 Flash** with:

- Retrieved context chunks as grounding
- Source citations linking back to original documents
- Configurable temperature and max token settings

## Deployment

The app is deployed to production using:

- **Backend**: Render (Docker web service)
- **Database**: Render PostgreSQL (with pgvector)
- **Frontend**: Vercel (static Vite build)

See [DEPLOYMENT.md](DEPLOYMENT.md) for the full deployment guide.

## Environment Variables

| Variable                 | Description              | Default                     |
| ------------------------ | ------------------------ | --------------------------- |
| `GEMINI_API_KEY`         | Google AI Studio API Key | _(required)_                |
| `GEMINI_MODEL`           | Generation model         | `gemini-1.5-flash`          |
| `GEMINI_EMBEDDING_MODEL` | Embedding model          | `models/text-embedding-004` |
| `DATABASE_URL`           | Full PostgreSQL URL      | _(auto-built from parts)_   |
| `POSTGRES_USER`          | DB user                  | `raguser`                   |
| `POSTGRES_PASSWORD`      | DB password              | `ragpassword`               |
| `POSTGRES_DB`            | DB name                  | `ragdb`                     |
| `CHUNK_SIZE`             | Characters per chunk     | `1200`                      |
| `CHUNK_OVERLAP`          | Overlap between chunks   | `150`                       |
| `TOP_K`                  | Chunks to retrieve       | `5`                         |
| `SIMILARITY_THRESHOLD`   | Min cosine similarity    | `0.7`                       |
| `NEO4J_URI`              | Neo4j connection URI     | `bolt://127.0.0.1:7687`     |

## Troubleshooting

### Services won't start

```bash
docker-compose logs -f
```

### Database connection issues

```bash
docker-compose ps
```

Ensure the `postgres` container is healthy.

### Neo4j not available

Neo4j is **optional**. If unavailable, the system automatically disables Graph RAG mode and continues with Vector and Hybrid retrieval.

## License

MIT
