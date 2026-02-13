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
    
    def store_chunks(
        self, 
        chunks: List[Document], 
        embeddings: List[List[float]], 
        source_filename: str
    ) -> int:
        """
        Store document chunks and embeddings in the database.
        
        Args:
            chunks: List of LangChain Document objects
            embeddings: List of embedding vectors
            source_filename: Original filename
            
        Returns:
            Number of chunks stored
        """

        try:
            # check if document exists and delete if so (idempotency)
            existing_chunks = self.db.query(DocumentChunk).filter(
                DocumentChunk.source_file == source_filename
            ).count()
            
            if existing_chunks > 0:
                logging.info(f"Replacing existing document '{source_filename}' with {len(chunks)} new chunks. "
                             f"Deleting {existing_chunks} old chunks.")
                self.db.query(DocumentChunk).filter(
                    DocumentChunk.source_file == source_filename
                ).delete()

            for idx, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
                # Extract metadata from the chunk
                metadata = chunk.metadata.copy()
                metadata["original_filename"] = source_filename
                
                # Create database record
                db_chunk = DocumentChunk(
                    source_file=source_filename,
                    chunk_index=idx,
                    chunk_text=chunk.page_content,
                    embedding=embedding,
                    chunk_metadata=metadata
                )
                
                self.db.add(db_chunk)
            
            self.db.commit()
            return len(chunks)
        except Exception as e:
            self.db.rollback()
            logging.error(f"Failed to store chunks for {source_filename}: {e}")
            raise e
    
    def ingest_document(self, file_path: str, filename: str) -> Dict[str, Any]:
        """
        Complete ingestion pipeline for a document.
        
        Args:
            file_path: Path to the uploaded file
            filename: Original filename
            
        Returns:
            Dictionary with ingestion summary
        """
        # Determine file type
        file_extension = Path(filename).suffix.lower().lstrip('.')
        
        # Load document
        documents = self.load_document(file_path, file_extension)
        
        # Split into chunks
        chunks = self.split_documents(documents)
        
        # Generate embeddings
        texts = [chunk.page_content for chunk in chunks]
        embeddings = self.generate_embeddings(texts)
        
        # Store in database
        num_chunks = self.store_chunks(chunks, embeddings, filename)
        
        return {
            "filename": filename,
            "num_chunks": num_chunks,
            "num_pages": len(documents),
            "status": "success"
        }
    

