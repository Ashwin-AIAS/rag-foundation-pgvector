import os
from typing import List, Dict, Any
from pathlib import Path
from sqlalchemy.orm import Session

from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain.schema import Document

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
        self.embeddings = OpenAIEmbeddings(
            openai_api_key=settings.OPENAI_API_KEY,
            model="text-embedding-ada-002"
        )
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
            file_type: File extension (e.g., 'pdf', 'txt')
            
        Returns:
            List of LangChain Document objects
        """
        if file_type == "pdf":
            loader = PyPDFLoader(file_path)
        elif file_type == "txt":
            loader = TextLoader(file_path, encoding="utf-8")
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
                metadata=metadata
            )
            
            self.db.add(db_chunk)
        
        self.db.commit()
        return len(chunks)
    
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
    
    def delete_document(self, filename: str) -> int:
        """
        Delete all chunks for a specific document.
        
        Args:
            filename: Source filename to delete
            
        Returns:
            Number of chunks deleted
        """
        deleted = self.db.query(DocumentChunk).filter(
            DocumentChunk.source_file == filename
        ).delete()
        self.db.commit()
        return deleted
    
    def list_documents(self) -> List[Dict[str, Any]]:
        """
        List all ingested documents with statistics.
        
        Returns:
            List of document summaries
        """
        from sqlalchemy import func
        
        results = self.db.query(
            DocumentChunk.source_file,
            func.count(DocumentChunk.id).label('num_chunks'),
            func.min(DocumentChunk.created_at).label('created_at')
        ).group_by(DocumentChunk.source_file).all()
        
        return [
            {
                "filename": row.source_file,
                "num_chunks": row.num_chunks,
                "created_at": row.created_at.isoformat()
            }
            for row in results
        ]
