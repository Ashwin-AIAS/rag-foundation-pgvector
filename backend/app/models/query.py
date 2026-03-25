from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Literal


class QueryRequest(BaseModel):
    """
    Request model for the query endpoint.
    """
    question: str = Field(
        ...,
        description="The user's question to answer using RAG",
        min_length=1,
        example="What is the company's vacation policy?"
    )
    hero_mode: Optional[Literal["stark", "rogers", "goindor", "panther", "banner"]] = Field(
        "stark",
        description="Hero persona and audio cue profile to use"
    )
    top_k: Optional[int] = Field(
        None,
        description="Number of document chunks to retrieve (overrides default)",
        ge=1,
        le=20,
        example=5
    )
    selected_documents: Optional[List[str]] = Field(
        None,
        description="Optional list of source filenames to restrict retrieval to"
    )
    retrieval_mode: str = Field(
        "hybrid",
        description="Retrieval strategy to use: 'hybrid', 'vector', or 'graph'"
    )


class RetrievedChunk(BaseModel):
    """
    Model representing a single retrieved document chunk.
    """
    chunk_text: str = Field(..., description="The text content of the chunk")
    source_file: str = Field(..., description="Original document filename")
    chunk_index: int = Field(..., description="Position in the original document")
    similarity_score: float = Field(..., description="Cosine similarity score (0-1)")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")


class QueryResponse(BaseModel):
    """
    Response model for the query endpoint.
    """
    answer: str = Field(..., description="The generated answer")
    retrieved_chunks: List[RetrievedChunk] = Field(
        ...,
        description="Document chunks used to generate the answer"
    )
    num_chunks_retrieved: int = Field(..., description="Number of chunks retrieved")
    question: str = Field(..., description="The original question")
    confidence: int = Field(0, description="Confidence score 0-100")
    suggested_questions: Optional[List[str]] = Field(
        default=[],
        description="3 suggested follow-up questions"
    )
    answer_type: str = Field("text", description="Type of answer: 'text' or 'table'")
    columns: Optional[List[str]] = Field(None, description="Column names for table response")
    rows: Optional[List[Dict[str, Any]]] = Field(None, description="Rows for table response")
    debug_latency: Optional[Dict[str, float]] = Field(None, description="Latency breakdown in ms")

