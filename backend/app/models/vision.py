from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional


class BoundingBox(BaseModel):
    x1: int
    y1: int
    x2: int
    y2: int


class DetectedObject(BaseModel):
    label: str
    confidence: float
    bbox: BoundingBox


class DetectedMachine(BaseModel):
    machine_type: str
    machine_name: str
    confidence: float
    source: str  # "yolo26_coco" | "demo_mode"
    bbox: Optional[BoundingBox] = None


class VisionDetectionResult(BaseModel):
    """Raw output from the vision-service /detect endpoint."""
    detected_objects: List[Dict[str, Any]] = Field(default_factory=list)
    detected_machines: List[Dict[str, Any]] = Field(default_factory=list)
    error_codes: List[str] = Field(default_factory=list)
    annotated_image_b64: Optional[str] = None
    demo_mode: bool = False
    demo_scenario: Optional[Dict[str, Any]] = None
    ocr_performed: bool = False
    model_used: str = "yolo26n"


class VisionQueryRequest(BaseModel):
    """
    Used internally when the backend constructs a vision-aware RAG query.
    Not a direct API request model (image upload uses multipart form).
    """
    override_question: Optional[str] = Field(
        None,
        description="Optional manual question to append to the auto-generated query"
    )
    top_k: Optional[int] = Field(5, ge=1, le=20)


class MachineRegistryEntry(BaseModel):
    machine_id: str = Field(..., description="Unique ID matching YOLO class label")
    machine_name: str
    manufacturer: Optional[str] = None
    model_number: Optional[str] = None
    document_names: List[str] = Field(
        default_factory=list,
        description="Filenames of ingested manuals for this machine"
    )
    error_code_pattern: Optional[str] = Field(
        None,
        description="Regex pattern for valid error codes, e.g. '[A-Z]\\d{2,4}'"
    )


class VisionRAGResponse(BaseModel):
    """Extended RAG response that includes vision context."""
    # Standard RAG fields
    answer: str
    confidence: int
    answer_type: str = "text"
    suggested_questions: List[str] = Field(default_factory=list)

    # Vision-specific additions
    detected_machines: List[Dict[str, Any]] = Field(default_factory=list)
    error_codes: List[str] = Field(default_factory=list)
    vision_query_used: Optional[str] = None
    vision_confidence: Optional[float] = None
    annotated_image_b64: Optional[str] = None
    demo_mode: bool = False

    # Retrieved chunks (simplified for frontend)
    sources: List[str] = Field(default_factory=list)
    debug_latency: Optional[Dict[str, float]] = None
