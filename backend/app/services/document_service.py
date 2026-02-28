import logging

from sqlalchemy.orm import Session
from sqlalchemy import func, text as sa_text
from typing import List, Dict, Any
from app.models.document import DocumentChunk

logger = logging.getLogger(__name__)


class DocumentService:
    """
    Service for managing uploaded documents.
    Handles deletion and listing of documents.
    """

    def __init__(self, db: Session):
        self.db = db

    def delete_document(self, filename: str) -> int:
        """
        Delete all chunks for a specific document and clean up related tables.

        Args:
            filename: Source filename to delete

        Returns:
            Number of chunks deleted
        """
        deleted = self.db.query(DocumentChunk).filter(
            DocumentChunk.source_file == filename
        ).delete()

        # Clean up related tables (documents status + paper_summaries)
        try:
            self.db.execute(
                sa_text("DELETE FROM documents WHERE filename = :fn"),
                {"fn": filename}
            )
        except Exception:
            pass  # Table may not exist on older deployments

        try:
            self.db.execute(
                sa_text("DELETE FROM paper_summaries WHERE source_file = :fn"),
                {"fn": filename}
            )
        except Exception:
            pass  # Table may not exist

        self.db.commit()
        return deleted

    def list_documents(self) -> List[Dict[str, Any]]:
        """
        List all ingested documents with statistics and ingestion status.

        Joins the persistent `documents` table (added in Feb 2026) to surface
        per-file ingestion status (COMPLETE / FAILED / PROCESSING / UPLOADED).
        Falls back gracefully for documents ingested before the table existed.

        Returns:
            List of document summaries
        """
        # Get chunk stats per document
        chunk_rows = self.db.query(
            DocumentChunk.source_file,
            func.count(DocumentChunk.id).label('num_chunks'),
            func.min(DocumentChunk.created_at).label('created_at')
        ).group_by(DocumentChunk.source_file).all()

        # Get status per filename from the persistent documents table
        # Use raw SQL so we don't fail if the table hasn't been created yet
        status_map: Dict[str, str] = {}
        try:
            rows = self.db.execute(sa_text(
                "SELECT filename, status FROM documents"
            )).fetchall()
            for row in rows:
                # Keep the most recent / terminal status per filename
                # (COMPLETE/FAILED wins over earlier UPLOADED/PROCESSING)
                existing = status_map.get(row.filename)
                if existing in ("COMPLETE", "FAILED"):
                    continue
                status_map[row.filename] = row.status
        except Exception:
            # Table may not exist yet on first boot — degrade gracefully
            try:
                self.db.rollback()
            except Exception:
                pass
            logger.debug("documents table query failed — degrading gracefully")

        return [
            {
                "filename": row.source_file,
                "num_chunks": row.num_chunks,
                "created_at": row.created_at.isoformat() if row.created_at else None,
                "status": status_map.get(row.source_file, "COMPLETE"),  # legacy = assume COMPLETE
            }
            for row in chunk_rows
        ]
