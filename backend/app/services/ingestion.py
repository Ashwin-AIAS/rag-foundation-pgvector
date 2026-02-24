import os
import logging
import time
from typing import List, Dict, Any
from pathlib import Path
from sqlalchemy.orm import Session

import docx  # python-docx
import pandas as pd
import pytesseract
from pdf2image import convert_from_path
from PIL import Image
import io

from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.schema import Document

import re
import json
import uuid
from app.services.gemini_embedding_service import GeminiEmbeddingService
from app.services.generation_service import GenerationService
from app.services.graph_extraction_service import GraphExtractionService
from app.models.document import DocumentChunk, PaperSummary
from app.config import settings


class DocumentIngestionService:
    """
    Service for ingesting documents into the RAG system.
    
    Handles the complete pipeline:
    1. Load documents (PDF, DOCX, TXT, MD, CSV)
    2. Split into chunks
    3. Generate embeddings
    4. Store in database
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.embeddings = GeminiEmbeddingService()
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.CHUNK_SIZE,
            chunk_overlap=settings.CHUNK_OVERLAP,
            length_function=len,
            separators=["\n\n", "\n", " ", ""]
        )
        
        # Init Neo4j Driver optionally for GraphRAG
        self.graph_extractor = None
        try:
            from neo4j import GraphDatabase
            driver = GraphDatabase.driver(
                settings.NEO4J_URI, 
                auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD)
            )
            self.graph_extractor = GraphExtractionService(driver)
            logging.info("GraphExtractionService initialized successfully.")
        except Exception as e:
            logging.warning(f"Neo4j driver not initialized. Graph RAG disabled during ingestion: {e}")
    
    def _perform_ocr(self, file_path: str) -> str:
        """Perform OCR on a PDF file using Tesseract."""
        try:
            logging.info(f"Starting OCR for {file_path}")
            images = convert_from_path(file_path)
            full_text = ""
            for i, image in enumerate(images):
                text = pytesseract.image_to_string(image)
                full_text += text + "\n"
            return full_text
        except Exception as e:
            logging.error(f"OCR failed: {e}")
            raise ValueError(f"OCR processing failed: {str(e)}")

    def load_document(self, file_path: str, file_type: str) -> List[Document]:
        """
        Load a document using appropriate loader.
        
        Args:
            file_path: Path to the document file
            file_type: File extension (e.g., 'pdf', 'txt', 'docx')
            
        Returns:
            List of LangChain Document objects
        """
        if file_type == "pdf":
            loader = PyPDFLoader(file_path)
            docs = loader.load()
            
            # Check for empty or very short text indicating scanned PDF
            total_text_len = sum(len(d.page_content) for d in docs)
            if total_text_len < 200:
                logging.info(f"PDF text length {total_text_len} is too short. Triggering OCR fallback.")
                ocr_text = self._perform_ocr(file_path)
                return [Document(page_content=ocr_text, metadata={"source": file_path, "file_type": "pdf", "ingestion_method": "ocr"})]
            
            return docs
            
        elif file_type in ["txt", "md"]:
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    text = f.read()
                return [Document(page_content=text, metadata={"source": file_path, "file_type": file_type})]
            except UnicodeDecodeError:
                # Fallback to distinct encoding if utf-8 fails
                with open(file_path, "r", encoding="latin-1") as f:
                    text = f.read()
                return [Document(page_content=text, metadata={"source": file_path, "file_type": file_type})]
                
        elif file_type == "docx":
            try:
                doc = docx.Document(file_path)
                full_text = []
                for paragraph in doc.paragraphs:
                    full_text.append(paragraph.text)
                text = "\n".join(full_text)
                return [Document(page_content=text, metadata={"source": file_path, "file_type": "docx"})]
            except Exception as e:
                logging.error(f"Error loading DOCX file: {e}")
                raise ValueError(f"Failed to load DOCX file: {str(e)}")

        elif file_type == "csv":
            try:
                # Try different encodings for CSV files (Excel often uses cp1252/latin1)
                encodings_to_try = ['utf-8', 'latin1', 'cp1252', 'iso-8859-1']
                df = None
                
                for encoding in encodings_to_try:
                    try:
                        df = pd.read_csv(file_path, encoding=encoding)
                        break
                    except UnicodeDecodeError:
                        continue
                        
                if df is None:
                    raise ValueError("Failed to decode CSV with supported encodings (utf-8, latin1, cp1252)")
                documents = []
                # Process in chunks of rows to avoid huge single documents
                row_chunk_size = 20
                
                for i in range(0, len(df), row_chunk_size):
                    chunk_df = df.iloc[i:i+row_chunk_size]
                    text_block = ""
                    chunk_rows = []
                    
                    for _, row in chunk_df.iterrows():
                        # Create readable text for embedding
                        row_dict = row.to_dict()
                        # Handle NaN values
                        clean_row = {k: v for k, v in row_dict.items() if pd.notna(v)}
                        chunk_rows.append(clean_row)
                        
                        row_text = "\n".join([f"{col}: {val}" for col, val in clean_row.items()])
                        text_block += row_text + "\n\n---\n\n"
                    
                    documents.append(Document(
                        page_content=text_block, 
                        metadata={
                            "source": file_path, 
                            "file_type": "csv", 
                            "row_start": i,
                            "row_data": chunk_rows  # Store raw data for table reconstruction
                        }
                    ))
                return documents
            except Exception as e:
                logging.error(f"Error loading CSV file: {e}")
                raise ValueError(f"Failed to load CSV file: {str(e)}")

        elif file_type in ["xlsx", "xls"]:
            try:
                # Use openpyxl for xlsx (default) or xlrd for xls (if installed/needed)
                # Pandas read_excel handles this automatically if deps are present
                df = pd.read_excel(file_path)
                
                # Convert date columns to string to avoid serialization issues
                for col in df.select_dtypes(include=['datetime64']).columns:
                    df[col] = df[col].astype(str)
                    
                documents = []
                # Process in chunks of rows to avoid huge single documents
                row_chunk_size = 20
                
                for i in range(0, len(df), row_chunk_size):
                    chunk_df = df.iloc[i:i+row_chunk_size]
                    text_block = ""
                    chunk_rows = []
                    
                    for _, row in chunk_df.iterrows():
                        # Create readable text for embedding
                        row_dict = row.to_dict()
                        # Handle NaN values
                        clean_row = {k: v for k, v in row_dict.items() if pd.notna(v)}
                        chunk_rows.append(clean_row)
                        
                        row_text = "\n".join([f"{col}: {val}" for col, val in clean_row.items()])
                        text_block += row_text + "\n\n---\n\n"
                    
                    documents.append(Document(
                        page_content=text_block, 
                        metadata={
                            "source": file_path, 
                            "file_type": file_type, 
                            "row_start": i,
                            "row_data": chunk_rows  # Store raw data for table reconstruction
                        }
                    ))
                return documents
            except Exception as e:
                logging.error(f"Error loading Excel file: {e}")
                raise ValueError(f"Failed to load Excel file: {str(e)}")
                
        else:
            raise ValueError(f"Unsupported file type: {file_type}")
    
    def split_documents(self, documents: List[Document]) -> List[Document]:
        """
        Split documents into smaller chunks handling section-aware splitting.
        """
        final_chunks = []
        
        # Regex to detect standard research paper sections
        section_pattern = re.compile(
            r'^(?:\d+\.?\d*\s*)?(Abstract|Introduction|Related Work|Method(?:ology)?|Experiments|Results|Conclusion)\b.*$',
            re.IGNORECASE | re.MULTILINE
        )
        
        for doc in documents:
            text = doc.page_content
            matches = list(section_pattern.finditer(text))
            
            blocks = []
            if not matches:
                blocks.append(("General", text))
            else:
                last_idx = 0
                current_section = "General"
                for match in matches:
                    start_idx = match.start()
                    if start_idx > last_idx:
                        blocks.append((current_section, text[last_idx:start_idx].strip()))
                    current_section = match.group(1).title()
                    if current_section == "Methodology":
                        current_section = "Method"
                    last_idx = match.end()
                
                if last_idx < len(text):
                    blocks.append((current_section, text[last_idx:].strip()))
            
            # Now split each block
            for section, block_text in blocks:
                if not block_text:
                    continue
                block_doc = Document(page_content=block_text, metadata={**doc.metadata, "section": section})
                block_chunks = self.text_splitter.split_documents([block_doc])
                final_chunks.extend(block_chunks)
                
        return final_chunks
    
    def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for a list of texts.
        
        Args:
            texts: List of text strings
            
        Returns:
            List of embedding vectors
        """
        embeddings = self.embeddings.embed_documents(texts)
        return embeddings
    
    async def ingest_document(self, file_path: str, filename: str) -> Dict[str, Any]:
        """
        Complete ingestion pipeline for a document.
        
        Args:
            file_path: Path to the uploaded file
            filename: Original filename
            
        Returns:
            Dictionary with ingestion summary
        """
        # 1. Duplicate Detection
        start_total = time.perf_counter()
        
        existing = self.db.query(DocumentChunk).filter(
            DocumentChunk.source_file == filename
        ).first()
        
        if existing:
            logging.warning(f"Duplicate document detected: {filename}")
            raise ValueError(f"Document '{filename}' already exists.")

        # Determine file type
        file_extension = Path(filename).suffix.lower().lstrip('.')
        
        # 2. Load document
        start_read = time.perf_counter()
        documents = self.load_document(file_path, file_extension)
        file_read_ms = (time.perf_counter() - start_read) * 1000
        
        if not documents:
            return {"filename": filename, "status": "empty", "num_chunks": 0}

        # Summary Extraction
        full_text = "\n".join(d.page_content for d in documents)
        paper_id = str(uuid.uuid4())
        
        # Only extract summaries for papers (e.g. not CSV/Excel unless they look like papers, 
        # but to be safe we extract for all or if length > some threshold. We'll extract for all text/pdf.)
        if file_extension in ["pdf", "txt", "md", "docx"]:
            self._extract_and_store_summary(full_text, filename, paper_id)

        # 3. Split into chunks
        start_chunk = time.perf_counter()
        
        for d in documents:
            d.metadata["paper_id"] = paper_id
            
        chunks = self.split_documents(documents)
        chunking_ms = (time.perf_counter() - start_chunk) * 1000
        logging.info(f"Split {filename} into {len(chunks)} chunks.")
        
        # 4. Generate embeddings in batches
        texts = [chunk.page_content for chunk in chunks]
        
        start_embed = time.perf_counter()
        
        # Outer batching removed to prevent double batching and reduce API calls.
        # The embedding service itself handles batching efficiently.
        logging.info(f"Generating embeddings for {len(texts)} chunks of {filename}...")
        embeddings = self.embeddings.embed_documents(texts)
            
        embedding_ms = (time.perf_counter() - start_embed) * 1000

        # 5. Store in database (Bulk insert)
        logging.info(f"Storing {len(chunks)} chunks for {filename}...")
        start_db = time.perf_counter()
        num_chunks = self.store_chunks(chunks, embeddings, filename)
        db_insert_ms = (time.perf_counter() - start_db) * 1000
        
        total_ms = (time.perf_counter() - start_total) * 1000
        
        metrics = {
            "file_read_ms": round(file_read_ms, 2),
            "chunking_ms": round(chunking_ms, 2),
            "embedding_ms": round(embedding_ms, 2),
            "db_insert_ms": round(db_insert_ms, 2),
            "total_ms": round(total_ms, 2)
        }
        
        logging.info(f"INGEST_METRICS: {metrics}")
        logging.info(f"Ingestion complete for {filename}")
        
        return {
            "filename": filename,
            "num_chunks": num_chunks,
            "num_pages": len(documents),
            "status": "success",
            "metrics": metrics
        }

    def _extract_and_store_summary(self, text: str, filename: str, paper_id: str):
        """Extract structured summary using LLM and store in database."""
        prompt = f"""Extract the following structured information from this research paper:

- Problem statement
- Core contribution
- Methodology summary
- Datasets used
- Evaluation metrics
- Key experimental results
- Limitations
- Main contributions

Return valid JSON only. Format:
{{
  "problem_statement": "...",
  "contributions": "...",
  "methodology": "...",
  "datasets": "...",
  "evaluation_metrics": "...",
  "key_results": "...",
  "limitations": "..."
}}

Paper text (truncate if needed):
{text[:40000]}
"""
        gen_service = GenerationService()
        try:
            logging.info(f"Extracting structured summary for {filename}...")
            response = gen_service.generate(prompt)
            match = re.search(r'\{.*\}', response.replace('\n', ' '), re.DOTALL)
            if match:
                data = json.loads(match.group(0))
                summary = PaperSummary(
                    id=paper_id,
                    source_file=filename,
                    problem_statement=data.get("problem_statement"),
                    methodology=data.get("methodology"),
                    datasets=data.get("datasets"),
                    evaluation_metrics=data.get("evaluation_metrics"),
                    key_results=data.get("key_results"),
                    limitations=data.get("limitations"),
                    contributions=data.get("contributions")
                )
                self.db.add(summary)
                self.db.commit()
                logging.info(f"Successfully stored PaperSummary for {filename}")
            else:
                logging.warning(f"Could not parse JSOn for summary of {filename}")
        except Exception as e:
            logging.error(f"Failed to extract summary for {filename}: {e}")
            self.db.rollback()

    def _background_graph_extract(self, chunks: List[Document], source_filename: str):
        """Run graph extraction in the background to prevent blocking the upload."""
        if not self.graph_extractor:
            return
            
        logging.info(f"Starting background graph extraction for {source_filename} (Combined first 10 chunks)")
        
        combined_text = ""
        for idx, chunk in enumerate(chunks):
            if idx >= 10:
                break
            # Add chunk text with clear separation for the LLM
            combined_text += f"\n--- Section {idx+1} ---\n{chunk.page_content}\n"
                
        if combined_text:
            try:
                # Still add a small delay to space out multiple parallel uploads safely
                time.sleep(2.0) 
                
                self.graph_extractor.extract_and_store(
                    text=combined_text[:35000],  # cap length just in case
                    source_file=source_filename, 
                    chunk_index=0
                )
            except Exception as graph_err:
                logging.error(f"Background graph extraction failed for {source_filename}: {graph_err}")
                
        logging.info(f"Background graph extraction completed for {source_filename}")

    def store_chunks(
        self, 
        chunks: List[Document], 
        embeddings: List[List[float]], 
        source_filename: str
    ) -> int:
        """
        Store document chunks and embeddings in the database using bulk insert.
        """
        try:
            # We already checked for duplicates in ingest_document, so we proceed to insert.
            # However, if we want to be safe against race conditions, we could accept that.
            # But the requirement says "Commit once per document".
            
            db_chunks = []
            for idx, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
                metadata = chunk.metadata.copy()
                metadata["original_filename"] = source_filename
                
                db_chunk = DocumentChunk(
                    source_file=source_filename,
                    chunk_index=idx,
                    chunk_text=chunk.page_content,
                    embedding=embedding,
                    chunk_metadata=metadata
                )
                db_chunks.append(db_chunk)
                
            # Bulk save
            self.db.add_all(db_chunks)
            self.db.commit()
            
            # Start background graph extraction AFTER database commit
            if self.graph_extractor:
                import threading
                threading.Thread(
                    target=self._background_graph_extract,
                    args=(chunks, source_filename),
                    daemon=True
                ).start()
            
            return len(db_chunks)
        except Exception as e:
            self.db.rollback()
            logging.error(f"Failed to store chunks for {source_filename}: {e}")
            raise e
    

