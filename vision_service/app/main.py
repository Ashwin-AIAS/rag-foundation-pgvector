"""
Vision Service — FastAPI microservice for YOLO26 + OCR inference.

Runs on port 8001. Called internally by the main RAG backend (port 8000).
Never exposed directly to the frontend — traffic routes through the backend.

Architecture decision (senior dev rationale):
  Kept as a separate container because ultralytics + easyocr + opencv
  add ~3GB to the image. The lean backend image stays <500MB, which
  means fast cold starts on Render / Railway free-tier.
"""

import logging
import os
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.vision_core import VisionCore

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Vision Service",
    description="YOLO26 + OCR microservice for industrial machine detection",
    version="1.0.0"
)

# Only allow calls from the backend container (internal Docker network)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # Internal service — Docker network only
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

# ── Lazy-load the vision core once on first request ──────────────────────
_vision_core: VisionCore | None = None

def get_vision_core() -> VisionCore:
    global _vision_core
    if _vision_core is None:
        logger.info("Initializing VisionCore (loading YOLO26n + EasyOCR)...")
        _vision_core = VisionCore(
            model_path=os.getenv("YOLO26_MODEL_PATH", "yolo26n.pt"),
            confidence_threshold=float(os.getenv("YOLO26_CONF", "0.4")),
            demo_mode=os.getenv("VISION_DEMO_MODE", "true").lower() == "true",
        )
        logger.info("VisionCore initialized.")
    return _vision_core


@app.get("/")
async def root():
    return {"service": "vision-service", "status": "running", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.post("/detect")
async def detect(file: UploadFile = File(...)):
    """
    Run YOLO26 + OCR on an uploaded image.

    Returns:
        - detected_objects: list of YOLO detections with class + confidence + bbox
        - detected_machines: high-level machine category labels
        - error_codes: OCR-extracted error code strings
        - annotated_image_b64: base64 PNG with bounding boxes drawn
        - demo_mode: whether mock detections were injected
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    contents = await file.read()
    if len(contents) > 20 * 1024 * 1024:  # 20MB limit
        raise HTTPException(status_code=413, detail="Image too large (max 20MB)")

    try:
        core = get_vision_core()
        result = core.detect(image_bytes=contents, filename=file.filename)
        return result
    except Exception as e:
        logger.error(f"Detection failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Detection failed: {str(e)}")
