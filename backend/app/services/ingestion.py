import os
import logging
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

from app.services.gemini_embedding_service import GeminiEmbeddingService
from app.models.document import DocumentChunk
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
                df = pd.read_csv(file_path)
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
        Split documents into smaller chunks.
        
        Args:
            documents: List of LangChain Document objects
            
        Returns:
            List of chunked Document objects
        """
        chunks = self.text_splitter.split_documents(documents)
        return chunks
    
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
        existing = self.db.query(DocumentChunk).filter(
            DocumentChunk.source_file == filename
        ).first()
        
        if existing:
            logging.warning(f"Duplicate document detected: {filename}")
            # Raise a specific exception or return a status that can be handled as 409
            # Since this is a service method, we'll raise a ValueError that the controller can catch
            # Or better, we define a custom DuplicateDocumentError in the controller or here.
            # For now, we'll use ValueError with a specific message.
            raise ValueError(f"Document '{filename}' already exists.")

        # Determine file type
        file_extension = Path(filename).suffix.lower().lstrip('.')
        
        # 2. Load document (Blocking I/O, so we might want to run in thread if huge, 
        # but for simplicity and since libraries are sync, we call directly or could use run_in_executor)
        # For this step, standard call is fine as we are in an async def but doing blocking calls.
        # Ideally: documents = await run_in_threadpool(self.load_document, file_path, file_extension)
        documents = self.load_document(file_path, file_extension)
        
        if not documents:
            return {"filename": filename, "status": "empty", "num_chunks": 0}

        # 3. Split into chunks
        chunks = self.split_documents(documents)
        logging.info(f"Split {filename} into {len(chunks)} chunks.")
        
        # 4. Generate embeddings in batches
        texts = [chunk.page_content for chunk in chunks]
        embeddings = []
        
        # We'll batch here if the service doesn't handled it, but we updated the service to take a list.
        # We will log progress.
        total_chunks = len(texts)
        batch_size = 20
        
        for i in range(0, total_chunks, batch_size):
            batch_texts = texts[i:i + batch_size]
            logging.info(f"Embedding batch {i//batch_size + 1}/{(total_chunks + batch_size - 1)//batch_size} for {filename}")
            
            # Call embedding service (still sync for now as per library, but batched)
            batch_embeddings = self.embeddings.embed_documents(batch_texts)
            embeddings.extend(batch_embeddings)

        # 5. Store in database (Bulk insert)
        logging.info(f"Storing {len(chunks)} chunks for {filename}...")
        num_chunks = self.store_chunks(chunks, embeddings, filename)
        
        logging.info(f"Ingestion complete for {filename}")
        
        return {
            "filename": filename,
            "num_chunks": num_chunks,
            "num_pages": len(documents),
            "status": "success"
        }

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
            
            return len(db_chunks)
        except Exception as e:
            self.db.rollback()
            logging.error(f"Failed to store chunks for {source_filename}: {e}")
            raise e
    

