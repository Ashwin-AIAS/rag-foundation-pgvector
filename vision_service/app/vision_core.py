"""
VisionCore — YOLO26 inference + OCR pipeline.

Design decisions:
  1. YOLO26n (nano) for CPU inference — 43% faster than YOLO11, runs on tablet hardware.
  2. COCO class → machine category mapping handles zero-shot detection without fine-tuning.
  3. Demo Mode injects realistic mock detections when YOLO confidence is low,
     enabling a compelling end-to-end demo without a fine-tuned dataset.
  4. EasyOCR for error code extraction — regex-validated against industrial patterns.
"""

import base64
import io
import logging
import re
import random
from typing import Any, Dict, List, Optional

import cv2
import easyocr
import numpy as np
from PIL import Image
from ultralytics import YOLO

logger = logging.getLogger(__name__)


# ── COCO class → industrial machine category mapping ─────────────────────────
# Maps what YOLO26n CAN detect (COCO classes) to meaningful manufacturing terms.
# Extended with YOLO26-detectable items relevant to factory/lab environments.
COCO_TO_MACHINE: Dict[str, Optional[str]] = {
    "laptop":        "computer_workstation",
    "monitor":       "hmi_display",
    "tv":            "hmi_display",
    "cell phone":    "handheld_terminal",
    "keyboard":      "control_terminal",
    "remote":        "control_terminal",
    "mouse":         "control_terminal",
    "clock":         "timer_module",
    "microwave":     "heat_treatment_unit",
    "oven":          "heat_treatment_unit",
    "refrigerator":  "cooling_unit",
    "scissors":      "cutting_tool",
    "knife":         "cutting_tool",
    "bottle":        "fluid_reservoir",
    "cup":           "fluid_reservoir",
    "vase":          "sensor_housing",
    "book":          "manual_document",
    "fire hydrant":  "safety_equipment",
    "stop sign":     "safety_warning",
    "traffic light": "status_indicator",
    "toolbox":       None,  # too generic
    "person":        None,  # ignore
    "chair":         None,
    "table":         None,
    "bench":         None,
}

# ── Demo mode: realistic mock scenarios ──────────────────────────────────────
DEMO_SCENARIOS = [
    {
        "machine_type": "cnc_machine",
        "machine_name": "CNC Milling Machine",
        "error_codes": ["E47", "F-002"],
        "description": "Spindle overload detected with coolant pressure warning",
    },
    {
        "machine_type": "conveyor_belt",
        "machine_name": "Conveyor Belt System",
        "error_codes": ["CB-103"],
        "description": "Belt tension sensor fault",
    },
    {
        "machine_type": "robotic_arm",
        "machine_name": "6-Axis Robotic Arm",
        "error_codes": ["ARM-E21", "TORQUE-LIMIT"],
        "description": "Joint 3 torque limit exceeded",
    },
    {
        "machine_type": "hmi_panel",
        "machine_name": "HMI Control Panel",
        "error_codes": ["HMI-404", "COMM-LOSS"],
        "description": "PLC communication timeout",
    },
    {
        "machine_type": "hydraulic_press",
        "machine_name": "Hydraulic Press",
        "error_codes": ["HP-P01", "OVP"],
        "description": "Hydraulic over-pressure safety trip",
    },
]

# ── Error code regex patterns for industrial equipment ───────────────────────
ERROR_CODE_PATTERNS = [
    r'\b[A-Z]{1,4}-?[A-Z]?\d{2,4}\b',   # E47, F-002, ARM-E21, CB-103
    r'\b[A-Z]{2,6}-\d{3,4}\b',            # HMI-404, COMM-001
    r'\b(?:ERR|ERROR|FAULT|ALARM)\s*:?\s*\d{3,4}\b',  # ERR: 047
    r'\b0x[0-9A-Fa-f]{4,8}\b',            # Hex codes: 0x004F
]
COMBINED_ERROR_PATTERN = re.compile(
    '|'.join(f'(?:{p})' for p in ERROR_CODE_PATTERNS),
    re.IGNORECASE
)


class VisionCore:
    """
    Handles YOLO26 inference + EasyOCR + result structuring.

    Args:
        model_path: Path to YOLO26 weights file (e.g. 'yolo26n.pt').
                    Ultralytics auto-downloads if not present locally.
        confidence_threshold: Minimum YOLO confidence to report a detection.
        demo_mode: When True, injects mock detections if YOLO finds nothing
                   relevant. Ideal for demos without a fine-tuned model.
    """

    def __init__(
        self,
        model_path: str = "yolo26n.pt",
        confidence_threshold: float = 0.4,
        demo_mode: bool = True,
    ):
        self.confidence_threshold = confidence_threshold
        self.demo_mode = demo_mode
        self._demo_scenario_index = 0  # cycles through scenarios deterministically

        logger.info(f"Loading YOLO26 model from: {model_path}")
        try:
            self.model = YOLO(model_path)
            logger.info("YOLO26 model loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load YOLO26 model: {e}")
            self.model = None

        logger.info("Initializing EasyOCR reader (en)...")
        try:
            # gpu=False ensures CPU-only — consistent with edge deployment
            self.ocr_reader = easyocr.Reader(["en"], gpu=False, verbose=False)
            logger.info("EasyOCR initialized.")
        except Exception as e:
            logger.warning(f"EasyOCR init failed: {e} — OCR will be skipped.")
            self.ocr_reader = None

    # ── Public API ────────────────────────────────────────────────────────────

    def detect(self, image_bytes: bytes, filename: str = "image.jpg") -> Dict[str, Any]:
        """
        Full pipeline: decode image → YOLO26 detect → OCR → structure result.

        Returns a dict suitable for JSON serialization.
        """
        # 1. Decode image
        np_arr = np.frombuffer(image_bytes, np.uint8)
        img_bgr = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if img_bgr is None:
            raise ValueError(f"Could not decode image: {filename}")

        img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)

        # 2. YOLO26 inference
        yolo_detections = self._run_yolo(img_bgr)

        # 3. Map COCO classes → machine categories
        machine_hits = self._map_to_machines(yolo_detections)

        # 4. Demo mode injection when no relevant machine detected
        demo_injected = False
        demo_scenario = None
        if self.demo_mode and not machine_hits:
            demo_scenario = self._get_demo_scenario()
            demo_injected = True
            logger.info(f"[DEMO MODE] Injecting scenario: {demo_scenario['machine_name']}")

        # 5. OCR — run on full image + any detected display/panel regions
        error_codes = self._extract_error_codes(img_rgb, yolo_detections)

        # Supplement with demo error codes if injected
        if demo_injected and demo_scenario:
            for code in demo_scenario["error_codes"]:
                if code not in error_codes:
                    error_codes.append(code)

        # 6. Draw annotations on image
        annotated_img = self._annotate_image(
            img_bgr.copy(), yolo_detections, error_codes, demo_scenario
        )
        annotated_b64 = self._encode_image_b64(annotated_img)

        # 7. Build response
        detected_machines = []
        if machine_hits:
            detected_machines = machine_hits
        elif demo_injected and demo_scenario:
            detected_machines = [{
                "machine_type": demo_scenario["machine_type"],
                "machine_name": demo_scenario["machine_name"],
                "confidence": 0.95,
                "source": "demo_mode",
            }]

        return {
            "detected_objects": yolo_detections,
            "detected_machines": detected_machines,
            "error_codes": error_codes,
            "annotated_image_b64": annotated_b64,
            "demo_mode": demo_injected,
            "demo_scenario": demo_scenario,
            "ocr_performed": self.ocr_reader is not None,
            "model_used": "yolo26n",
        }

    # ── Private helpers ───────────────────────────────────────────────────────

    def _run_yolo(self, img_bgr: np.ndarray) -> List[Dict]:
        """Run YOLO26 inference and return structured detections."""
        if self.model is None:
            return []
        try:
            results = self.model(img_bgr, conf=self.confidence_threshold, verbose=False)
            detections = []
            for r in results:
                for box in r.boxes:
                    cls_id = int(box.cls[0])
                    label = self.model.names[cls_id]
                    conf = float(box.conf[0])
                    x1, y1, x2, y2 = [int(v) for v in box.xyxy[0]]
                    detections.append({
                        "label": label,
                        "confidence": round(conf, 3),
                        "bbox": {"x1": x1, "y1": y1, "x2": x2, "y2": y2},
                    })
            return detections
        except Exception as e:
            logger.warning(f"YOLO inference error: {e}")
            return []

    def _map_to_machines(self, detections: List[Dict]) -> List[Dict]:
        """Map COCO class labels to industrial machine categories."""
        machines = []
        seen_types = set()
        for det in detections:
            machine_type = COCO_TO_MACHINE.get(det["label"])
            if machine_type and machine_type not in seen_types:
                seen_types.add(machine_type)
                machines.append({
                    "machine_type": machine_type,
                    "machine_name": machine_type.replace("_", " ").title(),
                    "confidence": det["confidence"],
                    "source": "yolo26_coco",
                    "bbox": det["bbox"],
                })
        return machines

    def _extract_error_codes(
        self, img_rgb: np.ndarray, detections: List[Dict]
    ) -> List[str]:
        """Run OCR and extract error codes using regex patterns."""
        if self.ocr_reader is None:
            return []

        try:
            # Pre-process for better OCR accuracy on industrial displays
            gray = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2GRAY)
            # Adaptive threshold handles varying lighting conditions
            processed = cv2.adaptiveThreshold(
                gray, 255,
                cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                cv2.THRESH_BINARY, 11, 2
            )

            ocr_results = self.ocr_reader.readtext(processed, detail=0)
            raw_text = " ".join(ocr_results)
            logger.info(f"OCR raw text: {raw_text[:200]}")

            # Extract error codes using industrial regex patterns
            matches = COMBINED_ERROR_PATTERN.findall(raw_text)
            # Deduplicate + clean
            codes = list(dict.fromkeys(m.strip() for m in matches if m.strip()))
            return codes
        except Exception as e:
            logger.warning(f"OCR extraction failed: {e}")
            return []

    def _get_demo_scenario(self) -> Dict:
        """Return next demo scenario in a round-robin fashion."""
        scenario = DEMO_SCENARIOS[self._demo_scenario_index % len(DEMO_SCENARIOS)]
        self._demo_scenario_index += 1
        return scenario

    def _annotate_image(
        self,
        img_bgr: np.ndarray,
        detections: List[Dict],
        error_codes: List[str],
        demo_scenario: Optional[Dict],
    ) -> np.ndarray:
        """Draw bounding boxes and labels on image."""
        # YOLO bounding boxes
        for det in detections:
            b = det["bbox"]
            label = f"{det['label']} {det['confidence']:.0%}"
            cv2.rectangle(img_bgr, (b["x1"], b["y1"]), (b["x2"], b["y2"]), (0, 255, 100), 2)
            cv2.putText(img_bgr, label, (b["x1"], b["y1"] - 8),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 255, 100), 2)

        # Demo overlay banner
        if demo_scenario:
            h, w = img_bgr.shape[:2]
            overlay = img_bgr.copy()
            cv2.rectangle(overlay, (0, h - 80), (w, h), (10, 10, 40), -1)
            cv2.addWeighted(overlay, 0.75, img_bgr, 0.25, 0, img_bgr)
            cv2.putText(img_bgr,
                        f"[DEMO] Detected: {demo_scenario['machine_name']}",
                        (10, h - 50), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 220, 255), 2)
            codes_str = "  |  ".join(error_codes) if error_codes else "None"
            cv2.putText(img_bgr,
                        f"Error Codes: {codes_str}",
                        (10, h - 20), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 180, 255), 2)

        return img_bgr

    def _encode_image_b64(self, img_bgr: np.ndarray) -> str:
        """Encode OpenCV image to base64 PNG string."""
        success, buffer = cv2.imencode(".png", img_bgr)
        if not success:
            return ""
        return base64.b64encode(buffer).decode("utf-8")
