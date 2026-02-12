# RAG Application Deployment Guide

This guide details how to deploy the full-stack RAG application to a public environment.

## Logic Overview
- **Database**: Managed PostgreSQL with `pgvector` extension (Neon, Supabase, or Render).
- **Backend**: Python FastAPI container on Render or Railway.
- **Frontend**: Static React site on Vercel.

---

## 1. Database Setup (Neon/Supabase)

We need a PostgreSQL database with the `vector` extension enabled.

1.  **Create an Account**: Sign up for [Neon](https://neon.tech) or [Supabase](https://supabase.com).
2.  **Create a Project**: Create a new project (e.g., `rag-production`).
3.  **Get Connection String**: Copy the **Connection String** (e.g., `postgres://user:pass@host/db`).
    *   *Note: Ensure it is the direct connection string (port 5432), not the pooled one if using PgBouncer, though for low traffic pooled is fine too.*
4.  **Enable pgvector**: Run this SQL command in the provider's SQL editor:
    ```sql
    CREATE EXTENSION IF NOT EXISTS vector;
    ```
5.  **Initialize Schema**:
    *   Export your local schema or run the following SQL (derived from `database/init.sql`):
    ```sql
    CREATE TABLE IF NOT EXISTS document_chunks (
        id SERIAL PRIMARY KEY,
        source_file TEXT NOT NULL,
        chunk_index INTEGER NOT NULL,
        chunk_text TEXT NOT NULL,
        embedding VECTOR(768),  -- Adjust dimension if not using Gemini (768) or OpenAI (1536)
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx ON document_chunks 
    USING hnsw (embedding vector_cosine_ops);
    
    CREATE TABLE IF NOT EXISTS feedback (
        id SERIAL PRIMARY KEY,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        feedback VARCHAR(10) NOT NULL,
        num_chunks_retrieved INTEGER,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    ```
    *   *Check your specific embedding model dimension!*
        *   Gemini `text-embedding-004`: **768**
        *   OpenAI `text-embedding-3-small`: **1536**

---

## 2. Backend Deployment (Render)

We will use Render to host the Dockerized backend.

1.  **Push to GitHub**: Ensure your code is in a GitHub repository.
2.  **Create Web Service**: In [Render Dashboard](https://dashboard.render.com), clicking **New +** -> **Web Service**.
3.  **Connect Repo**: Select your repository.
4.  **Configuration**:
    *   **Root Directory**: `.` (or leave empty)
    *   **Runtime**: Docker
    *   **Instance Type**: Free (or Starter)
5.  **Environment Variables**: Add the following:
    *   `DATABASE_URL`: *[Connection string from Step 1]*
    *   `GEMINI_API_KEY`: *[Your Gemini API Key]*
    *   `GEMINI_MODEL`: `gemini-1.5-flash` (or your choice)
    *   `GEMINI_EMBEDDING_MODEL`: `models/text-embedding-004`
    *   `ALLOWED_ORIGINS`: `*` (initially, then update to frontend URL later)
    *   `PORT`: `10000` (Render sets this automatically, but good to be explicit)
6.  **Deploy**: Click **Create Web Service**.
7.  **Copy URL**: Once deployed, copy the backend URL (e.g., `https://rag-backend.onrender.com`).

---

## 3. Frontend Deployment (Vercel)

We will deploy the Vite React app to Vercel.

1.  **Vercel Dashboard**: Go to [Vercel](https://vercel.com) and click **Add New** -> **Project**.
2.  **Import Repo**: Select your GitHub repository.
3.  **Configuration**:
    *   **Framework Preset**: Vite
    *   **Root Directory**: `frontend` (Important! Click "Edit" next to Root Directory and select the `frontend` folder).
4.  **Environment Variables**:
    *   `VITE_API_BASE_URL`: *[Your Backend URL from Step 2]* (e.g., `https://rag-backend.onrender.com`)
        *   *Note: Do NOT add a trailing slash.*
5.  **Deploy**: Click **Deploy**.
6.  **Get URL**: Copy your new frontend URL (e.g., `https://rag-frontend.vercel.app`).

---

## 4. Final Configuration

1.  **Secure Backend**: Go back to Render -> Environment Variables.
2.  **Update CORS**: Change `ALLOWED_ORIGINS` from `*` to your Vercel URL (e.g., `https://rag-frontend.vercel.app`).
    *   *This prevents unauthorized sites from calling your API.*

## 5. Verification

1.  Open the Vercel URL.
2.  Upload a test PDF.
3.  Wait for ingestion (backend logs in Render will show progress).
4.  Ask a question.
5.  Receive an answer!
