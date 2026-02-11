import os
import logging
from typing import List, Dict, Any
from pathlib import Path
from sqlalchemy.orm import Session

from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_community.document_loaders import Docx2txtLoader  # For Word documents
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.schema import Document

from app.services.gemini_embedding_service import GeminiEmbeddingService
from app.models.document import DocumentChunk
from app.config import settings


class DocumentIngestionService:
    """
    Service for ingesting documents into the RAG system.
    
    Handles the complete pipeline:
    1. Load documents (PDF or text)
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
    
    def load_document(self, file_path: str, file_type: str) -> List[Document]:
        """
        Load a document using appropriate LangChain loader.
        
        Args:
            file_path: Path to the document file
            file_type: File extension (e.g., 'pdf', 'txt', 'docx')
            
        Returns:
            List of LangChain Document objects
        """
        if file_type == "pdf":
            loader = PyPDFLoader(file_path)
        elif file_type == "txt":
            loader = TextLoader(file_path, encoding="utf-8")
        elif file_type == "docx":
            loader = Docx2txtLoader(file_path)
        else:
            raise ValueError(f"Unsupported file type: {file_type}")
        
        documents = loader.load()
        return documents
    
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
    

