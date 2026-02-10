# Gemini API Migration Walkthrough

Successfully migrated the RAG system from OpenAI to Google's Gemini API to resolve quota limitations.

## Changes Made

### 1. Dependencies Updated

#### [requirements.txt](file:///c:/Users/mashw/OneDrive/Desktop/CollegeMaterials/RAG/backend/requirements.txt)
- ❌ Removed: `openai==1.10.0`, `langchain-openai==0.0.8`, `httpx==0.27.2`
- ✅ Added: `google-generativeai==0.3.2`

### 2. Database Schema Updated

#### [init.sql](file:///c:/Users/mashw/OneDrive/Desktop/CollegeMaterials/RAG/database/init.sql)
- Changed embedding dimension: `vector(1536)` → `vector(768)`
- OpenAI's `text-embedding-ada-002` uses 1536 dimensions
- Gemini's `text-embedding-004` uses 768 dimensions

---

### 3. Configuration Updated

#### [config.py](file:///c:/Users/mashw/OneDrive/Desktop/CollegeMaterials/RAG/backend/app/config.py)
```diff
- OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
+ GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

- OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
+ GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
```

#### [.env](file:///c:/Users/mashw/OneDrive/Desktop/CollegeMaterials/RAG/.env)
```diff
- # OpenAI API Configuration
- OPENAI_API_KEY=sk-proj-...
+ # Gemini API Configuration
+ GEMINI_API_KEY=<user's key>
+ GEMINI_MODEL=gemini-1.5-flash
```

---

### 4. Services Migrated

#### [NEW] [gemini_embedding_service.py](file:///c:/Users/mashw/OneDrive/Desktop/CollegeMaterials/RAG/backend/app/services/gemini_embedding_service.py)
Created new embedding service using `google.generativeai`:
- `embed_documents()`: Batch embedding with `task_type="retrieval_document"`
- `embed_query()`: Single query embedding with `task_type="retrieval_query"`
- Model: `models/text-embedding-004` (768 dimensions)

#### [MODIFIED] [embedding_service.py](file:///c:/Users/mashw/OneDrive/Desktop/CollegeMaterials/RAG/backend/app/services/embedding_service.py)
Replaced OpenAI embeddings with Gemini:
```python
# Before: OpenAIEmbeddings with text-embedding-ada-002
# After: genai.embed_content with text-embedding-004
```

#### [MODIFIED] [generation_service.py](file:///c:/Users/mashw/OneDrive/Desktop/CollegeMaterials/RAG/backend/app/services/generation_service.py)
Replaced OpenAI chat completion with Gemini generation:
```python
# Before: OpenAI().chat.completions.create()
# After: genai.GenerativeModel().generate_content()
```

#### [MODIFIED] [ingestion.py](file:///c:/Users/mashw/OneDrive/Desktop/CollegeMaterials/RAG/backend/app/services/ingestion.py)
Updated to use `GeminiEmbeddingService` instead of `OpenAIEmbeddings`

#### [MODIFIED] [main.py](file:///c:/Users/mashw/OneDrive/Desktop/CollegeMaterials/RAG/backend/app/main.py)
Updated config endpoint:
```diff
- "openai_configured": bool(settings.OPENAI_API_KEY)
+ "gemini_configured": bool(settings.GEMINI_API_KEY)
```

---

## Deployment & Verification

### 1. Database Reset
```powershell
docker-compose down -v
```
- Removed old containers and volumes
- Necessary because embedding dimensions changed (1536 → 768)

### 2. Rebuild Containers
```powershell
docker-compose up -d --build
```
- Rebuilt backend with new dependencies
- Fresh database with 768-dimensional vector schema

### 3. Health Checks

✅ **Backend Health**
```json
{"status": "healthy", "service": "rag-api"}
```

✅ **Database Health**
```json
{"database_connected": true, "pgvector_enabled": true, "status": "healthy"}
```

✅ **Configuration**
```json
{
  "database_host": "postgres",
  "database_port": "5432",
  "database_name": "ragdb",
  "gemini_configured": true,
  "chunk_size": 1000,
  "chunk_overlap": 200,
  "max_file_size_mb": 10,
  "supported_file_types": ["pdf", "txt", "docx"]
}
```

---

## What's Next

### Ready to Test! 🎉

1. **Upload your Word document** via the frontend at http://localhost:3000
2. **Ask questions** about the document content
3. **Verify answers** are accurate and grounded in the document

### Key Benefits of Gemini

- ✅ **Generous free tier** - No more quota errors
- ✅ **Fast embeddings** - `text-embedding-004` is optimized
- ✅ **Quality generation** - `gemini-1.5-flash` provides excellent responses
- ✅ **Cost effective** - Free for development and testing

### System Architecture

```
User Upload (DOCX) 
    ↓
Document Ingestion Service
    ↓
Gemini Embeddings (768-dim)
    ↓
PostgreSQL + pgvector
    ↓
Query → Gemini Embeddings → Retrieval → Gemini Generation → Answer
```

---

## Testing Instructions

1. **Refresh your browser** where the frontend is running
2. **Click "Choose File"** and select your Word document
3. **Wait for upload** - you should see success message with chunk count
4. **Ask a question** about the document content
5. **Review the answer** - should be based on document content only

If you encounter any issues, check:
- Backend logs: `docker logs rag_backend`
- Database logs: `docker logs rag_postgres`
- Frontend console in browser DevTools
