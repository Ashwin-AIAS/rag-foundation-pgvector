"""
seed_vision_docs.py — Seeds placeholder manufacturing manuals into the RAG system.

Run this script once after the backend is running to populate the vector store
with the placeholder documents and register machines in the registry.

Usage:
    # From project root, with backend running on localhost:8000
    python backend/scripts/seed_vision_docs.py

    # Against a custom backend URL
    BACKEND_URL=http://localhost:8000 python backend/scripts/seed_vision_docs.py
"""

import os
import sys
import time
import requests
from pathlib import Path

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
DOCS_DIR = Path(__file__).parent / "placeholder_docs"

# ── Documents to ingest ───────────────────────────────────────────────────────
PLACEHOLDER_DOCS = [
    "CNC_Machine_Maintenance_Manual.txt",
    "Conveyor_Belt_Fault_Guide.txt",
    "Robotic_Arm_Error_Codes.txt",
    "HMI_PLC_Fault_Guide.txt",
    "Hydraulic_Press_Manual.txt",
]

# ── Machine registry entries ──────────────────────────────────────────────────
# Maps YOLO-detected machine types (from VisionCore.COCO_TO_MACHINE) to documents
MACHINE_REGISTRY = [
    {
        "machine_id": "cnc_machine",
        "machine_name": "CNC Milling Machine",
        "manufacturer": "PrecisionTech Industries",
        "model_number": "CNC-5X Series",
        "document_names": ["CNC_Machine_Maintenance_Manual.txt"],
        "error_code_pattern": r"[EF]-?\d{2,4}",
    },
    {
        "machine_id": "conveyor_belt",
        "machine_name": "Conveyor Belt System",
        "manufacturer": "ConveyTech Solutions",
        "model_number": "CB-Series",
        "document_names": ["Conveyor_Belt_Fault_Guide.txt"],
        "error_code_pattern": r"CB-\d{3,4}",
    },
    {
        "machine_id": "robotic_arm",
        "machine_name": "6-Axis Robotic Arm",
        "manufacturer": "AutoMation Robotics GmbH",
        "model_number": "RA-6000",
        "document_names": ["Robotic_Arm_Error_Codes.txt"],
        "error_code_pattern": r"(ARM-E\d{2,3}|TORQUE-[A-Z]+)",
    },
    {
        "machine_id": "hmi_panel",
        "machine_name": "HMI Control Panel",
        "manufacturer": "Siemens",
        "model_number": "TP1200 + S7-1500",
        "document_names": ["HMI_PLC_Fault_Guide.txt"],
        "error_code_pattern": r"(HMI-\d{3,4}|COMM-[A-Z]+)",
    },
    {
        "machine_id": "hmi_display",
        "machine_name": "HMI Display Screen",
        "manufacturer": "Siemens",
        "model_number": "TP1200",
        "document_names": ["HMI_PLC_Fault_Guide.txt"],
        "error_code_pattern": r"(HMI-\d{3,4}|COMM-[A-Z]+)",
    },
    {
        "machine_id": "hydraulic_press",
        "machine_name": "Hydraulic Press",
        "manufacturer": "HydraulicForce GmbH",
        "model_number": "HP-500T",
        "document_names": ["Hydraulic_Press_Manual.txt"],
        "error_code_pattern": r"(HP-[A-Z]\d{2,3}|OVP)",
    },
    {
        "machine_id": "control_terminal",
        "machine_name": "Control Terminal",
        "manufacturer": "General",
        "model_number": "Any",
        "document_names": ["HMI_PLC_Fault_Guide.txt"],
        "error_code_pattern": None,
    },
]


def wait_for_backend(retries: int = 10, delay: float = 3.0) -> bool:
    """Poll the backend health endpoint until it's up."""
    print(f"Waiting for backend at {BACKEND_URL}...")
    for i in range(retries):
        try:
            r = requests.get(f"{BACKEND_URL}/health", timeout=5)
            if r.status_code == 200:
                print("✓ Backend is healthy.")
                return True
        except requests.ConnectionError:
            pass
        print(f"  Attempt {i+1}/{retries} — backend not ready, retrying in {delay}s...")
        time.sleep(delay)
    return False


def ingest_document(doc_path: Path) -> dict:
    """Upload a document to the backend /ingest endpoint."""
    print(f"  Ingesting: {doc_path.name} ...", end=" ", flush=True)
    with open(doc_path, "rb") as f:
        response = requests.post(
            f"{BACKEND_URL}/ingest",
            files=[("files", (doc_path.name, f, "text/plain"))],
            timeout=60,
        )
    response.raise_for_status()
    result = response.json()
    jobs = result.get("jobs", [])
    if jobs:
        job_id = jobs[0]["job_id"]
        print(f"queued (job: {job_id[:8]}...)")
        return {"job_id": job_id, "filename": doc_path.name}
    else:
        print(f"FAILED — {result.get('rejected', [])}")
        return {}


def poll_job(job_id: str, filename: str, max_wait: int = 60) -> bool:
    """Poll an ingestion job until complete."""
    for _ in range(max_wait):
        time.sleep(1)
        try:
            r = requests.get(f"{BACKEND_URL}/ingest/status/{job_id}", timeout=10)
            status = r.json().get("status", "UNKNOWN")
            if status == "COMPLETE":
                num_chunks = r.json().get("num_chunks", 0)
                print(f"    ✓ {filename} — COMPLETE ({num_chunks} chunks)")
                return True
            elif status == "FAILED":
                error = r.json().get("error", "Unknown error")
                print(f"    ✗ {filename} — FAILED: {error}")
                return False
        except Exception:
            pass
    print(f"    ✗ {filename} — TIMEOUT after {max_wait}s")
    return False


def register_machine(entry: dict) -> bool:
    """Register a machine in the machine_registry via the vision API."""
    print(f"  Registering: {entry['machine_id']} ...", end=" ", flush=True)
    try:
        r = requests.post(
            f"{BACKEND_URL}/vision/registry",
            json=entry,
            timeout=10,
        )
        if r.status_code in (200, 201):
            print("✓")
            return True
        else:
            print(f"FAILED ({r.status_code}): {r.text[:100]}")
            return False
    except Exception as e:
        print(f"ERROR: {e}")
        return False


def main():
    print("=" * 60)
    print("  Visual RAG — Seed Script")
    print("  Placeholder Manufacturing Docs + Machine Registry")
    print("=" * 60)

    # Check backend is up
    if not wait_for_backend():
        print("\n✗ Backend is not reachable. Ensure the backend is running.")
        print("  Run: docker-compose up backend")
        sys.exit(1)

    # ── Phase 1: Ingest documents ─────────────────────────────────────────────
    print("\n[Phase 1] Ingesting placeholder manufacturing manuals...")
    jobs = []
    for doc_name in PLACEHOLDER_DOCS:
        doc_path = DOCS_DIR / doc_name
        if not doc_path.exists():
            print(f"  ✗ File not found: {doc_path}")
            continue
        job = ingest_document(doc_path)
        if job:
            jobs.append(job)

    # Poll all jobs for completion
    print("\n[Phase 1] Waiting for ingestion to complete...")
    success_count = 0
    for job in jobs:
        if poll_job(job["job_id"], job["filename"]):
            success_count += 1

    print(f"\n  Ingestion complete: {success_count}/{len(jobs)} documents successful.")

    # ── Phase 2: Register machines ────────────────────────────────────────────
    print("\n[Phase 2] Registering machines in Vision Registry...")
    reg_success = 0
    for entry in MACHINE_REGISTRY:
        if register_machine(entry):
            reg_success += 1

    print(f"\n  Registration complete: {reg_success}/{len(MACHINE_REGISTRY)} machines registered.")

    # ── Summary ───────────────────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("  Seed complete!")
    print(f"  Documents ingested: {success_count}/{len(PLACEHOLDER_DOCS)}")
    print(f"  Machines registered: {reg_success}/{len(MACHINE_REGISTRY)}")
    print("\n  You can now test the Vision-RAG pipeline:")
    print(f"  POST {BACKEND_URL}/vision/query (multipart image upload)")
    print(f"  GET  {BACKEND_URL}/vision/registry")
    print("=" * 60)


if __name__ == "__main__":
    main()
