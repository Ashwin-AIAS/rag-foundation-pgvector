import os
import logging
import pandas as pd
from google.cloud import bigquery
from google.cloud.exceptions import NotFound

from app.config import settings

logger = logging.getLogger(__name__)

class BigQueryService:
    """
    Service to manage BigQuery datasets, load structured CSV/Excel files dynamically,
    and execute analytical queries on your RAG tracking logs and documents.
    """
    def __init__(self):
        self.client = None
        self.dataset_id = "rag_analytics"
        
        if settings.GCP_PROJECT_ID:
            try:
                # Client automatically resolves credentials (ADC or credentials.json)
                self.client = bigquery.Client(project=settings.GCP_PROJECT_ID)
                logger.info(f"BigQueryService initialized for GCP project: {settings.GCP_PROJECT_ID}")
                self._ensure_dataset_exists()
            except Exception as e:
                logger.error(f"Failed to initialize BigQuery client: {e}")
        else:
            logger.warning("GCP_PROJECT_ID not configured in Settings — BigQuery service disabled.")

    def _ensure_dataset_exists(self):
        """Ensures the analytics dataset exists in BigQuery."""
        if not self.client:
            return
            
        dataset_ref = bigquery.DatasetReference(settings.GCP_PROJECT_ID, self.dataset_id)
        try:
            self.client.get_dataset(dataset_ref)
            logger.info(f"BigQuery dataset '{self.dataset_id}' verified.")
        except NotFound:
            dataset = bigquery.Dataset(dataset_ref)
            dataset.location = "US"  # Default location
            try:
                self.client.create_dataset(dataset)
                logger.info(f"BigQuery dataset '{self.dataset_id}' successfully created in US location.")
            except Exception as e:
                logger.error(f"Failed to create BigQuery dataset: {e}")

    def upload_file_to_table(self, file_path: str, filename: str) -> dict:
        """
        Dynamically load a CSV or Excel file into a BigQuery table with automatic schema inference.
        Uses stream-based file upload for CSV to bypass large PyArrow dependencies.
        """
        if not self.client:
            raise ValueError("BigQuery client not initialized.")

        # Table name should be clean, lowercase, alphanumeric, without extensions
        table_name = filename.lower().replace(" ", "_")
        for ext in [".csv", ".xlsx", ".xls"]:
            if table_name.endswith(ext):
                table_name = table_name[:-len(ext)]
        table_name = "".join(c for c in table_name if c.isalnum() or c == "_")

        table_ref = self.client.dataset(self.dataset_id).table(table_name)
        file_extension = os.path.splitext(file_path)[1].lower()

        # Job configuration for automatic schema detection
        job_config = bigquery.LoadJobConfig(
            write_disposition="WRITE_TRUNCATE",  # Overwrite table if it exists
            autodetect=True
        )

        try:
            # 1. High-efficiency CSV Stream Upload (No PyArrow/Pandas required)
            if file_extension == ".csv":
                logger.info(f"Uploading CSV file directly via file stream to BigQuery table '{self.dataset_id}.{table_name}'...")
                job_config.source_format = bigquery.SourceFormat.CSV
                job_config.skip_leading_rows = 1  # Skip CSV header
                
                with open(file_path, "rb") as source_file:
                    job = self.client.load_table_from_file(source_file, table_ref, job_config=job_config)
                    job.result()  # Wait for upload
                    
                table = self.client.get_table(table_ref)
                logger.info(f"SUCCESS! BigQuery table '{self.dataset_id}.{table_name}' created/updated with {table.num_rows} rows.")
                return {
                    "status": "success",
                    "table": f"{self.dataset_id}.{table_name}",
                    "rows_loaded": table.num_rows,
                    "columns": [field.name for field in table.schema]
                }

            # 2. Excel DataFrame upload (Requires Pandas + PyArrow fallback)
            elif file_extension in [".xlsx", ".xls"]:
                logger.info(f"Uploading Excel file using Pandas to BigQuery table '{self.dataset_id}.{table_name}'...")
                df = pd.read_excel(file_path)
                
                # Clean DataFrame column names (alphanumeric + underscores)
                df.columns = [
                    "".join(c if c.isalnum() else "_" for c in col.strip().lower())
                    for col in df.columns
                ]
                
                try:
                    job = self.client.load_table_from_dataframe(df, table_ref, job_config=job_config)
                    job.result()
                except ImportError as imp_err:
                    logger.error("Pandas DataFrame load to BigQuery requires 'pyarrow'. Please install pyarrow.")
                    raise ImportError("Pandas load to BigQuery requires 'pyarrow'. Install it or convert your file to CSV.") from imp_err

                logger.info(f"SUCCESS! BigQuery table '{self.dataset_id}.{table_name}' created/updated.")
                return {
                    "status": "success",
                    "table": f"{self.dataset_id}.{table_name}",
                    "rows_loaded": len(df),
                    "columns": list(df.columns)
                }
            else:
                raise ValueError(f"Unsupported file type for BigQuery: {file_extension}")

        except Exception as e:
            logger.error(f"Failed to load file to BigQuery: {e}")
            return {"status": "error", "message": str(e)}

    def execute_query(self, sql_query: str) -> dict:
        """
        Execute an analytical SQL query on BigQuery.
        Returns a list of structured row dictionaries.
        """
        if not self.client:
            raise ValueError("BigQuery client not initialized.")
            
        try:
            logger.info(f"Executing BigQuery SQL: {sql_query}")
            query_job = self.client.query(sql_query)
            results = query_job.result()
            
            rows = [dict(row) for row in results]
            
            # Format row datetimes to ISO strings for easy JSON serialization
            for row in rows:
                for key, val in row.items():
                    if hasattr(val, "isoformat"):
                        row[key] = val.isoformat()
                        
            return {
                "status": "success",
                "rows_returned": len(rows),
                "data": rows
            }
        except Exception as e:
            logger.error(f"BigQuery SQL query execution failed: {e}")
            return {"status": "error", "message": str(e)}
