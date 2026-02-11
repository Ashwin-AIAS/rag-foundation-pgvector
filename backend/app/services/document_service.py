
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any
from app.models.document import DocumentChunk

class DocumentService:
    """
    Service for managing uploaded documents.
    Handles deletion and listing of documents.
    """
    
    def __init__(self, db: Session):
        self.db = db
        
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
        results = self.db.query(
            DocumentChunk.source_file,
            func.count(DocumentChunk.id).label('num_chunks'),
            func.min(DocumentChunk.created_at).label('created_at')
        ).group_by(DocumentChunk.source_file).all()
        
        return [
            {
                "filename": row.source_file,
                "num_chunks": row.num_chunks,
                "created_at": row.created_at.isoformat() if row.created_at else None
            }
            for row in results
        ]
