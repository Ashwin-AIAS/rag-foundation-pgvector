"""
VisionRAGBridge — connects computer vision detections to the RAG pipeline.

Responsibilities:
  1. Takes VisionDetectionResult from vision-service
  2. Queries machine_registry to find relevant uploaded documents
  3. Constructs a semantically rich natural language query
  4. Returns the query + selected_documents for RetrievalService

This is the "intelligence layer" — without this, you'd need a human to
type "CNC Lathe Error E47 fix". With this, it happens automatically.
"""

import logging
import re
from typing import Dict, List, Optional, Tuple

from sqlalchemy import text
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


# ── Machine type → generic search terms (used when no registry entry found) ──
MACHINE_FALLBACK_QUERIES: Dict[str, str] = {
    "cnc_machine":          "CNC machine error troubleshooting maintenance",
    "conveyor_belt":        "conveyor belt fault repair maintenance guide",
    "robotic_arm":          "robotic arm joint error calibration fix",
    "hmi_panel":            "HMI control panel PLC communication fault",
    "hydraulic_press":      "hydraulic press over-pressure safety procedure",
    "heat_treatment_unit":  "heat treatment furnace temperature fault alarm",
    "cooling_unit":         "cooling system refrigeration fault alarm maintenance",
    "computer_workstation": "workstation software error troubleshooting",
    "hmi_display":          "HMI display screen fault error code lookup",
    "status_indicator":     "status indicator light alarm meaning guide",
    "control_terminal":     "control terminal operator error procedure",
    "cutting_tool":         "cutting tool wear replacement maintenance",
    "sensor_housing":       "sensor fault calibration replacement guide",
    "fluid_reservoir":      "fluid level sensor pump fault maintenance",
    "safety_equipment":     "safety system emergency procedure shutdown",
    # Generic fallback
    "_default":             "industrial machine error code troubleshooting maintenance",
}


class VisionRAGBridge:
    """
    Bridges vision detections to the RAG retrieval pipeline.

    Args:
        db: SQLAlchemy session (for machine_registry lookups).
    """

    def __init__(self, db: Session):
        self.db = db

    def build_rag_context(
        self,
        detection_result: Dict,
        override_question: Optional[str] = None,
    ) -> Tuple[str, List[str]]:
        """
        Build a RAG query and document selection from vision detections.

        Args:
            detection_result: Dict from vision-service /detect endpoint.
            override_question: Optional user-typed question to append.

        Returns:
            Tuple of (natural_language_query, selected_document_names)
        """
        machines: List[Dict] = detection_result.get("detected_machines", [])
        error_codes: List[str] = detection_result.get("error_codes", [])
        demo_scenario: Optional[Dict] = detection_result.get("demo_scenario")

        # ── Build query components ────────────────────────────────────────────
        machine_terms = []
        selected_docs: List[str] = []

        for machine in machines:
            machine_type = machine.get("machine_type", "_default")
            machine_name = machine.get("machine_name", "")

            # Try machine registry first
            registry_entry = self._lookup_registry(machine_type)
            if registry_entry:
                machine_terms.append(registry_entry["machine_name"])
                selected_docs.extend(registry_entry.get("document_names", []))
                logger.info(
                    f"[BRIDGE] Registry hit: {machine_type} → "
                    f"{len(selected_docs)} docs"
                )
            else:
                # Fallback to generic machine term
                fallback = MACHINE_FALLBACK_QUERIES.get(
                    machine_type,
                    MACHINE_FALLBACK_QUERIES["_default"]
                )
                machine_terms.append(machine_name or fallback)
                # No doc scoping — search all docs
                logger.info(
                    f"[BRIDGE] No registry entry for '{machine_type}' "
                    "— using fallback query, no doc scope."
                )

        # If demo mode and no machines mapped, use demo scenario
        if not machine_terms and demo_scenario:
            machine_terms.append(demo_scenario.get("machine_name", "industrial machine"))
            demo_type = demo_scenario.get("machine_type", "_default")
            # Try to find docs for demo machine type too
            registry_entry = self._lookup_registry(demo_type)
            if registry_entry:
                selected_docs.extend(registry_entry.get("document_names", []))

        # ── Assemble the query string ─────────────────────────────────────────
        query_parts = []

        if machine_terms:
            query_parts.append(", ".join(machine_terms))

        if error_codes:
            codes_str = " ".join(error_codes)
            query_parts.append(f"Error code {codes_str}")
            query_parts.append("troubleshooting fix repair procedure steps")
        else:
            query_parts.append("fault diagnosis maintenance procedure")

        if override_question:
            query_parts.append(override_question)

        natural_query = " | ".join(query_parts) if query_parts else \
            "industrial machine fault troubleshooting procedure"

        # Deduplicate docs
        selected_docs = list(dict.fromkeys(selected_docs))

        logger.info(
            f"[BRIDGE] Query: '{natural_query[:100]}' | "
            f"Docs scoped: {selected_docs or 'ALL'}"
        )

        return natural_query, selected_docs

    def _lookup_registry(self, machine_type: str) -> Optional[Dict]:
        """
        Look up a machine in the registry by machine_type (YOLO class label).
        Returns the registry row as a dict, or None if not found.
        """
        try:
            row = self.db.execute(
                text("""
                    SELECT machine_id, machine_name, manufacturer,
                           model_number, document_names, error_code_pattern
                    FROM machine_registry
                    WHERE machine_id = :mid
                    LIMIT 1
                """),
                {"mid": machine_type}
            ).fetchone()

            if row:
                return {
                    "machine_id": row.machine_id,
                    "machine_name": row.machine_name,
                    "manufacturer": row.manufacturer,
                    "model_number": row.model_number,
                    "document_names": list(row.document_names or []),
                    "error_code_pattern": row.error_code_pattern,
                }
        except Exception as e:
            logger.warning(f"Registry lookup failed for '{machine_type}': {e}")
            try:
                self.db.rollback()
            except Exception:
                pass
        return None

    def validate_error_codes(
        self, codes: List[str], machine_type: str
    ) -> List[str]:
        """
        Filter error codes against machine-specific pattern if registered.
        Falls back to generic industrial pattern.
        """
        registry = self._lookup_registry(machine_type)
        if registry and registry.get("error_code_pattern"):
            pattern = re.compile(registry["error_code_pattern"], re.IGNORECASE)
        else:
            # Generic industrial error code pattern
            pattern = re.compile(
                r'^([A-Z]{1,4}-?[A-Z]?\d{2,4}|0x[0-9A-Fa-f]{4,8})$',
                re.IGNORECASE
            )
        return [c for c in codes if pattern.match(c.strip())]
