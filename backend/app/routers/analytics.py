import logging
import re
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config import settings
from app.services.bigquery_service import BigQueryService
from app.services.generation_service import GenerationService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analytics", tags=["analytics"])

class AnalyticsRequest(BaseModel):
    prompt: str

@router.post("/query")
async def run_analytical_query(request: AnalyticsRequest):
    """
    Translates a natural language prompt into a BigQuery SQL query based on 
    active database schemas, executes the query, and returns the result set.
    """
    if not settings.GCP_PROJECT_ID:
        raise HTTPException(
            status_code=400,
            detail="GCP_PROJECT_ID must be configured in settings to run BigQuery queries."
        )

    bq_service = BigQueryService()
    if not bq_service.client:
        raise HTTPException(
            status_code=500,
            detail="BigQuery Client could not be initialized. Check credentials."
        )

    # 1. Fetch available BigQuery tables and columns to provide schema context to Gemini
    try:
        dataset_ref = bq_service.client.dataset(bq_service.dataset_id)
        tables = bq_service.client.list_tables(dataset_ref)
        
        schema_context = []
        for table in tables:
            full_table = bq_service.client.get_table(table.reference)
            columns = [f"{field.name} ({field.field_type})" for field in full_table.schema]
            schema_context.append(
                f"Table: `{bq_service.client.project}.{bq_service.dataset_id}.{table.table_id}`\n"
                f"Columns: {', '.join(columns)}"
            )
            
        if not schema_context:
            raise HTTPException(
                status_code=400,
                detail="No structured tables found in BigQuery. Please upload a CSV/Excel file first."
            )
            
        schema_prompt_context = "\n\n".join(schema_context)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to gather BigQuery schema context: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to inspect BigQuery schemas: {str(e)}"
        )

    # 2. Build LLM prompt to translate NL to SQL
    prompt = f"""You are a senior BigQuery SQL engineer. Convert the user's natural language request into a valid BigQuery SQL query.

### Database Schema Context:
{schema_prompt_context}

### Instructions:
1. Generate ONLY a valid BigQuery SQL query.
2. Do NOT wrap the query in markdown code blocks like ```sql ... ```. Return raw text only.
3. Ensure table names are referenced with their full path (e.g., `project.dataset.table_name`).
4. Return only the SQL query. Do not include any conversational text or comments.

### User Request:
"{request.prompt}"
"""

    # 3. Call Gemini to generate the SQL query
    try:
        gen_service = GenerationService()
        sql_query = gen_service.generate(prompt)
        
        # Clean up any potential markdown wraps if the model ignored instructions
        sql_query = sql_query.strip()
        sql_query = re.sub(r"^```sql\s*", "", sql_query, flags=re.IGNORECASE)
        sql_query = re.sub(r"^```\s*", "", sql_query, flags=re.IGNORECASE)
        sql_query = re.sub(r"\s*```$", "", sql_query, flags=re.IGNORECASE)
        sql_query = sql_query.strip()
        
    except Exception as gen_err:
        logger.error(f"Failed to generate SQL from prompt: {gen_err}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to translate request into SQL: {str(gen_err)}"
        )

    # 4. Execute the SQL Query on BigQuery
    result = bq_service.execute_query(sql_query)
    
    if result.get("status") == "error":
        raise HTTPException(
            status_code=400,
            detail={
                "message": f"Generated SQL query failed to execute: {result.get('message')}",
                "generated_sql": sql_query
            }
        )
        
    return {
        "status": "success",
        "generated_sql": sql_query,
        "rows_returned": result.get("rows_returned", 0),
        "data": result.get("data", [])
    }
