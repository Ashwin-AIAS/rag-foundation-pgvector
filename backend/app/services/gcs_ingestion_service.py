import os
import logging
from pathlib import Path
from sqlalchemy.orm import Session
from google.cloud import storage

from app.config import settings
from app.services.ingestion import DocumentIngestionService

logger = logging.getLogger(__name__)

class GCSIngestionService:
    """
    Service to fetch, download, and ingest documents directly from a Google Cloud Storage bucket
    into the RAG system vector store.
    """
    def __init__(self, db: Session):
        self.db = db
        self.ingestion_service = DocumentIngestionService(db)
        
        self.client = None
        if settings.GCP_PROJECT_ID:
            try:
                # GCS Client will automatically resolve credentials from ADC or credentials.json
                self.client = storage.Client(project=settings.GCP_PROJECT_ID)
                logger.info(f"GCSIngestionService initialized for GCP project: {settings.GCP_PROJECT_ID}")
            except Exception as e:
                logger.error(f"Failed to initialize GCS storage client: {e}")
        else:
            logger.warning("GCP_PROJECT_ID not configured in Settings — GCS ingestion disabled.")

    def ingest_from_bucket(self) -> dict:
        """
        Scan the GCS bucket, download any supported files, ingest them via pgvector,
        and clean up temporary downloads.
        """
        if not self.client:
            logger.error("GCS Client is not initialized. Check GCP_PROJECT_ID setting.")
            return {"status": "error", "message": "GCS Client is not initialized."}

        bucket_name = settings.GCS_BUCKET_NAME
        if not bucket_name:
            logger.warning("GCS_BUCKET_NAME is not configured. Scanning skipped.")
            return {"status": "skipped", "message": "GCS_BUCKET_NAME not set in configurations."}

        try:
            bucket = self.client.bucket(bucket_name)
            blobs = self.client.list_blobs(bucket)

            processed_files = []
            skipped_duplicates = []
            failed_files = []

            # Create an in-workspace temporary download folder
            temp_download_dir = Path("temp_gcs_downloads")
            temp_download_dir.mkdir(exist_ok=True)

            for blob in blobs:
                filename = blob.name
                file_extension = Path(filename).suffix.lower().lstrip('.')

                # Process only supported file types
                if file_extension not in settings.SUPPORTED_FILE_TYPES:
                    logger.info(f"[GCS] Skipping unsupported blob: {filename}")
                    continue

                temp_file_path = temp_download_dir / filename
                # Re-create subdirectories inside temp folder if path contains folders
                temp_file_path.parent.mkdir(parents=True, exist_ok=True)

                try:
                    logger.info(f"[GCS] Fetching blob: {filename}...")
                    blob.download_to_filename(str(temp_file_path))

                    # Feed GCS file directly to DocumentIngestionService
                    result = self.ingestion_service.ingest_document(
                        file_path=str(temp_file_path),
                        filename=filename
                    )

                    status = result.get("status")
                    if status == "duplicate":
                        skipped_duplicates.append(filename)
                        logger.info(f"[GCS] Skipped duplicate file: {filename}")
                    elif status == "success":
                        processed_files.append(filename)
                        logger.info(f"[GCS] Successfully ingested file: {filename}")
                    else:
                        reason = result.get("diagnostics", {}).get("parse_stage_status", "Unknown failure")
                        failed_files.append((filename, f"Ingestion status: {status}. Reason: {reason}"))
                        logger.warning(f"[GCS] Ingestion result anomaly for {filename}: {status}")

                except Exception as blob_err:
                    logger.error(f"[GCS] Error ingesting blob {filename}: {blob_err}")
                    failed_files.append((filename, str(blob_err)))
                finally:
                    # Clean up local temporary file
                    if temp_file_path.exists():
                        try:
                            os.remove(temp_file_path)
                        except Exception as rm_err:
                            logger.error(f"[GCS] Failed to clean up temp file {temp_file_path}: {rm_err}")

            # Remove empty temporary folder
            try:
                if temp_download_dir.exists() and not any(temp_download_dir.iterdir()):
                    os.rmdir(temp_download_dir)
            except Exception:
                pass

            return {
                "status": "success",
                "bucket": bucket_name,
                "ingested_count": len(processed_files),
                "ingested_files": processed_files,
                "duplicate_count": len(skipped_duplicates),
                "duplicate_files": skipped_duplicates,
                "failed_count": len(failed_files),
                "failed_files": failed_files
            }

        except Exception as bucket_err:
            logger.error(f"[GCS ERROR] Failed to access/scan bucket {bucket_name}: {bucket_err}")
            return {"status": "error", "bucket": bucket_name, "message": str(bucket_err)}
