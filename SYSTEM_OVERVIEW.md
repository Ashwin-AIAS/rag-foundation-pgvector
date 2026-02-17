# RAG Application: System Overview

## Core Functionality
Your Retrieval-Augmented Generation (RAG) system is a powerful **document intelligence platform**. It allows users to upload various document types, semantic search across them, and receive grounded, citation-backed answers.

## Key Features

### 1. Multi-Format Ingestion
The system can process and understand a wide range of file types:
*   **Structured Data**: 
    *   **Excel (`.xlsx`, `.xls`)**: Automatically parses rows and columns.
    *   **CSV**: Handles various encodings (UTF-8, Latin-1) and structured data.
*   **Unstructured Documents**:
    *   **PDF**: Extracts text from research papers, reports, resumes.
    *   **Word (`.docx`)**: Processes formatted documents.
    *   **Text / Markdown**: Handles raw text files and documentation.

### 2. Adaptive Response Format
The AI adapts its output based on the **source document type**:
*   **Table Mode**: When the answer comes from **Excel or CSV** files, the system automatically formats the response as a **Structured Table** (Rows & Columns), making data analysis intuitive.
*   **Chat Mode**: When the answer comes from **PDF, Word, or Text** files, the system employs a natural, **ChatGPT-like conversational style**, using paragraphs and bullet points for readability.

### 3. Advanced Search & Retrieval
*   **Hybrid Search**: Combines semantic understanding (vector search) with keyword matching.
*   **LLM Reranking**: Uses a sophisticated reranker to prioritize the most relevant chunks before generating an answer.
*   **Confidence Scoring**: Provides a confidence score (Low/Mid/High) for every answer to gauge reliability.

### 4. Grounding & Citations
*   **No Hallucinations**: The system is strictly grounded in your documents. If the answer isn't there, it says so.
*   **Citations**: Every claim is backed by a specific source document and chunk index.

## Practical Applications

### 🎯 Recruitment & HR (Your Use Case)
*   **Resume Screening**: Upload 100+ logical CVs (PDFs). _Ask: "List candidates with Python exp."_ -> Get a list.
*   **Job Tracking**: Upload your "Jobs Tracking" Excel sheet. _Ask: "Which companies rejected me?"_ -> Get a structured table.

### 📚 Research & Academia
*   **Literature Review**: Upload 50 research papers. _Ask: "Summarize the key findings on LLM bias."_ -> Get a synthesized report with citations.

### ⚖️ Legal & Compliance
*   **Contract Analysis**: Upload contracts. _Ask: "What are the termination clauses?"_ -> Get specific extracts.

### 🏢 Corporate Knowledge Base
*   **Internal Wikis**: Index all company policy documents. _Ask: "What is the travel reimbursement policy?"_ -> Get an instant, accurate answer.

## Technical Stack
*   **Frontend**: React, TailwindCSS, Framer Motion (Cyberpunk UI)
*   **Backend**: FastAPI, Python, LangChain
*   **Database**: PostgreSQL with `pgvector` extension
*   **AI Models**: Google Gemini Pro (Reasoning), Gemini Text Embedding (Search)
*   **Deployment**:  Docker (Backend), Vercel (Frontend)
