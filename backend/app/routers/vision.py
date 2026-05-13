"""
Vision Router — all /vision/* endpoints for the main RAG backend.

This router acts as the orchestrator:
  1. Forwards images to the vision-service microservice (port 8001)
  2. Passes detections through VisionRAGBridge to build RAG queries
  3. Runs the full RAG pipeline (embed → retrieve → rerank → generate)
  4. Returns a VisionRAGResponse combining CV context + RAG answer

The frontend only talks to this backend (port 8000).
The vision-service is internal only (Docker bridge network).
"""

import logging
import os
import time
from typing import List, Optional

import httpx
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.vision import MachineRegistryEntry, VisionRAGResponse
from app.services.embedding_service import EmbeddingService
from app.services.generation_service import GenerationService
from app.services.prompt_service import PromptService
from app.services.reranking_service import RerankingService
from app.services.retrieval_service import RetrievalService
from app.services.vision_rag_bridge import VisionRAGBridge

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/vision", tags=["Vision RAG"])

# Internal vision-service URL (Docker bridge network)
VISION_SERVICE_URL = os.getenv("VISION_SERVICE_URL", "http://vision-service:8001")
VISION_TIMEOUT = float(os.getenv("VISION_TIMEOUT_S", "120.0"))


# ══════════════════════════════════════════════════════════════════════════════
# Health / Status
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/health")
async def vision_health():
    """Check if the vision-service microservice is reachable."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(f"{VISION_SERVICE_URL}/health")
            return {
                "vision_service_reachable": r.status_code == 200,
                "vision_service_url": VISION_SERVICE_URL,
            }
    except Exception as e:
        return {
            "vision_service_reachable": False,
            "vision_service_url": VISION_SERVICE_URL,
            "error": str(e),
        }


# ══════════════════════════════════════════════════════════════════════════════
# Detection Only (no RAG — useful for testing YOLO output)
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/detect")
async def detect_only(file: UploadFile = File(...)):
    """
    Forward image to vision-service and return raw detections.
    No RAG query is performed — useful for testing the CV pipeline.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    image_bytes = await file.read()

    try:
        async with httpx.AsyncClient(timeout=VISION_TIMEOUT) as client:
            response = await client.post(
                f"{VISION_SERVICE_URL}/detect",
                files={"file": (file.filename, image_bytes, file.content_type)},
            )
            if response.status_code != 200:
                raise HTTPException(
                    status_code=502,
                    detail=f"Vision service error: {response.text[:300]}"
                )
            return response.json()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Vision service timed out")
    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail=(
                "Vision service unavailable. "
                "Ensure the vision-service container is running: "
                "docker-compose up vision-service"
            )
        )


# ══════════════════════════════════════════════════════════════════════════════
# Vision-RAG Full Pipeline
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/query", response_model=VisionRAGResponse)
async def vision_query(
    file: UploadFile = File(...),
    question: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    """
    Full Vision-RAG pipeline:
      1. Image → vision-service → detections + error codes
      2. Detections → VisionRAGBridge → natural language query + doc scope
      3. Query → embed → hybrid retrieve → rerank → generate → answer

    Args:
        file: Camera frame or uploaded image.
        question: Optional user override question (appended to auto-query).
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    image_bytes = await file.read()
    start_total = time.perf_counter()

    # ── Step 1: Vision detection ──────────────────────────────────────────────
    try:
        async with httpx.AsyncClient(timeout=VISION_TIMEOUT) as client:
            vision_response = await client.post(
                f"{VISION_SERVICE_URL}/detect",
                files={"file": (file.filename, image_bytes, file.content_type)},
            )
            if vision_response.status_code != 200:
                raise HTTPException(status_code=502, detail="Vision service failed")
            detection_result = vision_response.json()
    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail="Vision service unavailable — run: docker-compose up vision-service"
        )
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Vision service timed out")

    vision_time_ms = (time.perf_counter() - start_total) * 1000
    logger.info(
        f"[VISION] Detection complete in {vision_time_ms:.0f}ms | "
        f"machines={detection_result.get('detected_machines', [])} | "
        f"codes={detection_result.get('error_codes', [])}"
    )

    # ── Step 2: Bridge — build RAG query ──────────────────────────────────────
    bridge = VisionRAGBridge(db)
    auto_query, selected_docs = bridge.build_rag_context(
        detection_result=detection_result,
        override_question=question,
    )

    # ── Step 3: Embed ─────────────────────────────────────────────────────────
    start_embed = time.perf_counter()
    embedding_service = EmbeddingService()
    query_embedding = embedding_service.embed_query(auto_query)
    embed_time_ms = (time.perf_counter() - start_embed) * 1000

    # ── Step 4: Retrieve ──────────────────────────────────────────────────────
    start_retrieval = time.perf_counter()
    retrieval_service = RetrievalService(db)
    chunks = retrieval_service.retrieve(
        query_embedding=query_embedding,
        top_k=10,
        source_files=selected_docs if selected_docs else None,
        user_question=auto_query,
    )
    retrieval_time_ms = (time.perf_counter() - start_retrieval) * 1000

    # ── Step 5: Rerank ────────────────────────────────────────────────────────
    reranker = RerankingService()
    reranked, rerank_ok = reranker.rerank(
        question=auto_query, chunks=chunks, top_n=5
    )

    # ── Step 6: Confidence ────────────────────────────────────────────────────
    if reranked:
        avg_sim = sum(c["similarity_score"] for c in reranked) / len(reranked)
        confidence = max(0, min(100, int(avg_sim * 100 + (10 if rerank_ok else 0))))
    else:
        confidence = 0

    # ── Step 7: Generate ──────────────────────────────────────────────────────
    start_gen = time.perf_counter()
    prompt_service = PromptService()

    # Inject vision context into the prompt
    machines = detection_result.get("detected_machines", [])
    error_codes = detection_result.get("error_codes", [])
    vision_context_prefix = _build_vision_context_prefix(machines, error_codes)

    # Use the vision-enriched question for prompt construction
    enriched_question = f"{vision_context_prefix}\n\n{auto_query}"
    if question:
        enriched_question += f"\n\nTechnician's question: {question}"

    prompt = prompt_service.construct_prompt(
        retrieved_chunks=reranked,
        user_question=enriched_question,
    )

    generation_service = GenerationService()
    if reranked:
        answer = generation_service.generate(prompt)
    else:
        answer = _no_docs_fallback(machines, error_codes)

    gen_time_ms = (time.perf_counter() - start_gen) * 1000
    total_time_ms = (time.perf_counter() - start_total) * 1000

    # ── Step 8: Suggested questions ───────────────────────────────────────────
    suggested = []
    try:
        sq_prompt = prompt_service.generate_suggested_questions_prompt(
            user_question=enriched_question,
            answer=answer,
            retrieved_chunks=reranked,
        )
        sq_raw = generation_service.generate(sq_prompt)
        import json, re
        m = re.search(r'\[.*?\]', sq_raw, re.DOTALL)
        if m:
            suggested = json.loads(m.group(0))[:3]
    except Exception:
        pass

    logger.info(
        f"[VISION RAG] Total={total_time_ms:.0f}ms | "
        f"vision={vision_time_ms:.0f}ms embed={embed_time_ms:.0f}ms "
        f"retrieval={retrieval_time_ms:.0f}ms gen={gen_time_ms:.0f}ms"
    )

    return VisionRAGResponse(
        answer=answer,
        confidence=confidence,
        detected_machines=detection_result.get("detected_machines", []),
        error_codes=detection_result.get("error_codes", []),
        vision_query_used=auto_query,
        vision_confidence=max(
            (m.get("confidence", 0) for m in machines), default=0.0
        ),
        annotated_image_b64=detection_result.get("annotated_image_b64"),
        demo_mode=detection_result.get("demo_mode", False),
        sources=list({c["source_file"] for c in reranked}),
        suggested_questions=suggested,
        debug_latency={
            "vision_ms": round(vision_time_ms, 1),
            "embed_ms": round(embed_time_ms, 1),
            "retrieval_ms": round(retrieval_time_ms, 1),
            "generation_ms": round(gen_time_ms, 1),
            "total_ms": round(total_time_ms, 1),
        },
    )


# ══════════════════════════════════════════════════════════════════════════════
# Machine Registry CRUD
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/registry")
async def list_registry(db: Session = Depends(get_db)):
    """List all registered machines and their document mappings."""
    try:
        rows = db.execute(text("""
            SELECT machine_id, machine_name, manufacturer, model_number,
                   document_names, error_code_pattern, created_at
            FROM machine_registry
            ORDER BY created_at DESC
        """)).fetchall()
        return {
            "machines": [
                {
                    "machine_id": r.machine_id,
                    "machine_name": r.machine_name,
                    "manufacturer": r.manufacturer,
                    "model_number": r.model_number,
                    "document_names": list(r.document_names or []),
                    "error_code_pattern": r.error_code_pattern,
                    "created_at": r.created_at.isoformat() if r.created_at else None,
                }
                for r in rows
            ],
            "total": len(rows),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Registry query failed: {e}")


@router.post("/registry", status_code=201)
async def register_machine(
    entry: MachineRegistryEntry,
    db: Session = Depends(get_db),
):
    """Register a machine type and map it to uploaded document filenames."""
    import uuid
    try:
        db.execute(
            text("""
                INSERT INTO machine_registry
                    (id, machine_id, machine_name, manufacturer,
                     model_number, document_names, error_code_pattern)
                VALUES
                    (:id, :mid, :mname, :mfr, :model, :docs, :pattern)
                ON CONFLICT (machine_id) DO UPDATE SET
                    machine_name = EXCLUDED.machine_name,
                    manufacturer = EXCLUDED.manufacturer,
                    model_number = EXCLUDED.model_number,
                    document_names = EXCLUDED.document_names,
                    error_code_pattern = EXCLUDED.error_code_pattern
            """),
            {
                "id": str(uuid.uuid4()),
                "mid": entry.machine_id,
                "mname": entry.machine_name,
                "mfr": entry.manufacturer,
                "model": entry.model_number,
                "docs": entry.document_names,
                "pattern": entry.error_code_pattern,
            },
        )
        db.commit()
        return {"message": f"Machine '{entry.machine_id}' registered.", "success": True}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Registration failed: {e}")


@router.delete("/registry/{machine_id}")
async def delete_registry_entry(machine_id: str, db: Session = Depends(get_db)):
    """Remove a machine from the registry."""
    try:
        result = db.execute(
            text("DELETE FROM machine_registry WHERE machine_id = :mid"),
            {"mid": machine_id},
        )
        db.commit()
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail=f"Machine '{machine_id}' not found")
        return {"message": f"Machine '{machine_id}' removed.", "success": True}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Deletion failed: {e}")


# ══════════════════════════════════════════════════════════════════════════════
# Internal helpers
# ══════════════════════════════════════════════════════════════════════════════

def _build_vision_context_prefix(machines: list, error_codes: list) -> str:
    """Build a system context string describing what the camera saw."""
    parts = ["[VISION CONTEXT]"]
    if machines:
        names = ", ".join(m.get("machine_name", "Unknown") for m in machines)
        parts.append(f"Camera detected: {names}")
    if error_codes:
        parts.append(f"Error codes visible: {', '.join(error_codes)}")
    if not machines and not error_codes:
        parts.append("No specific machine or error code detected — general query.")
    return " | ".join(parts)


def _no_docs_fallback(machines: list, error_codes: list) -> str:
    """Generate a helpful fallback when no relevant docs were found."""
    machine_str = ", ".join(
        m.get("machine_name", "machine") for m in machines
    ) or "the detected machine"
    code_str = ", ".join(error_codes) or "the displayed error"
    return (
        f"No relevant maintenance documentation was found for {machine_str} "
        f"regarding {code_str}. "
        "Please upload the machine's maintenance manual or error code reference "
        "guide using the Documents tab, then try again."
    )
