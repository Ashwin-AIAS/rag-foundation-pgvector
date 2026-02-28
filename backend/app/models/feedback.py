from pydantic import BaseModel, Field
from typing import Literal
from datetime import datetime


class FeedbackRequest(BaseModel):
    """
    User feedback on a generated answer.
    
    This model captures user satisfaction with RAG system responses.
    Feedback is stored for analysis only and does NOT modify system behavior.
    """
    question: str = Field(..., description="The original user question")
    answer: str = Field(..., description="The generated answer that was rated")
    feedback: Literal["positive", "negative"] = Field(
        ..., 
        description="User rating: 'positive' (helpful) or 'negative' (not helpful)"
    )
    num_chunks_retrieved: int = Field(
        ..., 
        ge=0,
        description="Number of document chunks retrieved for this answer"
    )
    timestamp: datetime = Field(
        ..., 
        description="ISO 8601 timestamp when feedback was given"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "question": "What is the capital of France?",
                "answer": "Based on the provided documents, the capital of France is Paris.",
                "feedback": "positive",
                "num_chunks_retrieved": 3,
                "timestamp": "2026-02-10T01:40:00Z"
            }
        }


class FeedbackResponse(BaseModel):
    """Response after successfully storing feedback"""
    status: str = Field(default="received", description="Status of feedback submission")
    feedback_id: int = Field(..., description="Unique identifier for the stored feedback")
    message: str = Field(default="Thank you for your feedback")
