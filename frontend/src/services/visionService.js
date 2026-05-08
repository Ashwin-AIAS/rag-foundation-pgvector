/**
 * visionService.js — API client for all /vision/* endpoints.
 * Follows the same pattern as the existing RAG API calls in the app.
 */

const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * Detect machines and error codes from an image (CV only, no RAG).
 * @param {File|Blob} imageFile
 * @returns {Promise<object>} detection result
 */
export async function detectFromImage(imageFile) {
  const formData = new FormData();
  formData.append("file", imageFile);

  const res = await fetch(`${BACKEND_URL}/vision/detect`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Detection failed");
  }
  return res.json();
}

/**
 * Run the full Vision-RAG pipeline: image → detect → RAG → answer.
 * @param {File|Blob} imageFile
 * @param {string|null} question  Optional override question from the user
 * @returns {Promise<object>} VisionRAGResponse
 */
export async function queryFromImage(imageFile, question = null) {
  const formData = new FormData();
  formData.append("file", imageFile);
  if (question) {
    formData.append("question", question);
  }

  const res = await fetch(`${BACKEND_URL}/vision/query`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Vision query failed");
  }
  return res.json();
}

/**
 * Get all registered machines from the machine registry.
 * @returns {Promise<{machines: Array, total: number}>}
 */
export async function getMachineRegistry() {
  const res = await fetch(`${BACKEND_URL}/vision/registry`);
  if (!res.ok) throw new Error("Failed to fetch machine registry");
  return res.json();
}

/**
 * Register a machine and map it to document filenames.
 * @param {object} entry  MachineRegistryEntry
 * @returns {Promise<object>}
 */
export async function registerMachine(entry) {
  const res = await fetch(`${BACKEND_URL}/vision/registry`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entry),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Registration failed");
  }
  return res.json();
}

/**
 * Check if the vision-service microservice is reachable.
 * @returns {Promise<{vision_service_reachable: boolean}>}
 */
export async function checkVisionHealth() {
  const res = await fetch(`${BACKEND_URL}/vision/health`);
  if (!res.ok) return { vision_service_reachable: false };
  return res.json();
}
