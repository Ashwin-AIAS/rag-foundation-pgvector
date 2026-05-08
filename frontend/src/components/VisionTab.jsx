import { useState, useRef, useCallback, useEffect } from "react";
import { detectFromImage, queryFromImage, checkVisionHealth } from "../services/visionService";

// ── Confidence colour helper ──────────────────────────────────────────────────
const confColour = (conf) => {
  if (conf >= 0.8) return "#00ff88";
  if (conf >= 0.5) return "#ffcc00";
  return "#ff6b6b";
};

const confidenceBadge = (score) => {
  const pct = Math.round(score * 100);
  return (
    <span
      style={{
        background: score >= 0.7 ? "rgba(0,255,136,0.15)" : "rgba(255,107,107,0.15)",
        border: `1px solid ${confColour(score)}`,
        color: confColour(score),
        borderRadius: "6px",
        padding: "2px 8px",
        fontSize: "0.75rem",
        fontWeight: 700,
        letterSpacing: "0.05em",
      }}
    >
      {pct}% conf
    </span>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

export default function VisionTab() {
  const [serviceReachable, setServiceReachable] = useState(null); // null=checking
  const [mode, setMode] = useState("upload"); // "upload" | "camera"
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(""); // "detecting" | "querying"
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // ── Check vision service health on mount ───────────────────────────────────
  useEffect(() => {
    checkVisionHealth()
      .then((h) => setServiceReachable(h.vision_service_reachable))
      .catch(() => setServiceReachable(false));
  }, []);

  // ── Camera helpers ─────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: 1280, height: 720 },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      setError("Camera access denied. Please allow camera permissions.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      const file = new File([blob], "camera_capture.jpg", { type: "image/jpeg" });
      setImageFile(file);
      setImagePreview(canvas.toDataURL("image/jpeg"));
      stopCamera();
      setMode("upload"); // switch to preview mode
    }, "image/jpeg", 0.92);
  }, [stopCamera]);

  useEffect(() => {
    if (mode === "camera") startCamera();
    else stopCamera();
    return () => stopCamera();
  }, [mode, startCamera, stopCamera]);

  // ── File upload handler ────────────────────────────────────────────────────
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setResult(null);
    setError(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith("image/")) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setResult(null);
      setError(null);
    }
  };

  // ── Run Vision-RAG pipeline ────────────────────────────────────────────────
  const handleAnalyse = async () => {
    if (!imageFile) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      setStage("detecting");
      // Small pause for UX — lets the "Detecting..." state render before heavy work
      await new Promise((r) => setTimeout(r, 100));

      setStage("querying");
      const response = await queryFromImage(imageFile, question || null);
      setResult(response);
    } catch (err) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
      setStage("");
    }
  };

  const handleReset = () => {
    setImageFile(null);
    setImagePreview(null);
    setResult(null);
    setError(null);
    setQuestion("");
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: "24px 0", maxWidth: 900, margin: "0 auto" }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{
          fontSize: "1.5rem", fontWeight: 700,
          background: "linear-gradient(90deg, #00d4ff, #7b2ff7)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          margin: 0,
        }}>
          ⚙️ Vision-RAG: Industrial Fault Assistant
        </h2>
        <p style={{ color: "#8892b0", marginTop: 6, fontSize: "0.9rem" }}>
          Point your camera at a machine — YOLO26 detects it, reads the error code,
          and your manuals answer the question automatically.
        </p>

        {/* Service status pill */}
        {serviceReachable !== null && (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            marginTop: 10, padding: "4px 12px",
            borderRadius: 20,
            background: serviceReachable ? "rgba(0,255,136,0.08)" : "rgba(255,107,107,0.08)",
            border: `1px solid ${serviceReachable ? "#00ff88" : "#ff6b6b"}`,
            fontSize: "0.78rem", color: serviceReachable ? "#00ff88" : "#ff6b6b",
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: "50%",
              background: serviceReachable ? "#00ff88" : "#ff6b6b",
              animation: serviceReachable ? "pulse 2s infinite" : "none",
            }} />
            {serviceReachable ? "Vision Service Online" : "Vision Service Offline — run: docker-compose up vision-service"}
          </div>
        )}
      </div>

      {/* ── Mode toggle ── */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        {["upload", "camera"].map((m) => (
          <button key={m} onClick={() => setMode(m)} style={{
            padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer",
            fontWeight: 600, fontSize: "0.85rem", letterSpacing: "0.05em",
            background: mode === m
              ? "linear-gradient(135deg, #00d4ff22, #7b2ff722)"
              : "rgba(255,255,255,0.04)",
            color: mode === m ? "#00d4ff" : "#8892b0",
            borderBottom: mode === m ? "2px solid #00d4ff" : "2px solid transparent",
            transition: "all 0.2s",
          }}>
            {m === "upload" ? "📁 Upload / Drop" : "📷 Live Camera"}
          </button>
        ))}
      </div>

      {/* ── Camera view ── */}
      {mode === "camera" && (
        <div style={{ marginBottom: 20, textAlign: "center" }}>
          <div style={{
            borderRadius: 12, overflow: "hidden",
            border: "1px solid rgba(0,212,255,0.3)",
            background: "#0a0f1e", position: "relative",
          }}>
            <video ref={videoRef} style={{ width: "100%", maxHeight: 400, display: "block" }}
              playsInline muted />
            <canvas ref={canvasRef} style={{ display: "none" }} />
            <div style={{
              position: "absolute", top: 12, right: 12,
              background: "rgba(10,15,30,0.85)", borderRadius: 6,
              padding: "4px 10px", color: "#00d4ff", fontSize: "0.75rem",
              border: "1px solid rgba(0,212,255,0.4)",
            }}>
              LIVE — YOLO26n ready
            </div>
          </div>
          <button onClick={captureFrame} style={{
            marginTop: 14, padding: "10px 28px",
            background: "linear-gradient(135deg, #00d4ff, #7b2ff7)",
            border: "none", borderRadius: 8, color: "#fff",
            fontWeight: 700, fontSize: "0.9rem", cursor: "pointer",
          }}>
            📸 Capture Frame
          </button>
        </div>
      )}

      {/* ── Upload drop zone ── */}
      {mode === "upload" && !imagePreview && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: "2px dashed rgba(0,212,255,0.35)",
            borderRadius: 12, padding: "48px 24px",
            textAlign: "center", cursor: "pointer",
            background: "rgba(0,212,255,0.03)",
            transition: "border-color 0.2s, background 0.2s",
            marginBottom: 20,
          }}
        >
          <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>🏭</div>
          <p style={{ color: "#8892b0", margin: 0, fontSize: "0.95rem" }}>
            Drop a machine photo here, or <span style={{ color: "#00d4ff" }}>click to upload</span>
          </p>
          <p style={{ color: "#4a5568", margin: "8px 0 0", fontSize: "0.8rem" }}>
            Supports JPG, PNG, WEBP — max 20MB
          </p>
          <input ref={fileInputRef} type="file" accept="image/*"
            onChange={handleFileSelect} style={{ display: "none" }} />
        </div>
      )}

      {/* ── Image preview + question input ── */}
      {imagePreview && (
        <div style={{ marginBottom: 20 }}>
          <div style={{
            borderRadius: 12, overflow: "hidden",
            border: "1px solid rgba(0,212,255,0.25)",
            background: "#0a0f1e", position: "relative",
            marginBottom: 14,
          }}>
            {/* Show annotated image if result available, else raw preview */}
            <img
              src={result?.annotated_image_b64
                ? `data:image/png;base64,${result.annotated_image_b64}`
                : imagePreview}
              alt="Machine capture"
              style={{ width: "100%", maxHeight: 420, objectFit: "contain", display: "block" }}
            />
            {result?.demo_mode && (
              <div style={{
                position: "absolute", top: 10, left: 10,
                background: "rgba(10,15,30,0.88)", borderRadius: 6,
                padding: "4px 12px", color: "#ffcc00", fontSize: "0.75rem",
                border: "1px solid rgba(255,204,0,0.5)",
              }}>
                ⚡ DEMO MODE — Simulated detection
              </div>
            )}
          </div>

          {/* Optional question override */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ color: "#8892b0", fontSize: "0.82rem", display: "block", marginBottom: 6 }}>
              Optional: Add a specific question (leave blank for auto-query)
            </label>
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. How urgent is this fault? What parts do I need?"
              style={{
                width: "100%", padding: "10px 14px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(0,212,255,0.25)",
                borderRadius: 8, color: "#e6e6e6",
                fontSize: "0.9rem", outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={handleAnalyse} disabled={loading} style={{
              flex: 1, padding: "12px",
              background: loading
                ? "rgba(0,212,255,0.1)"
                : "linear-gradient(135deg, #00d4ff, #7b2ff7)",
              border: "none", borderRadius: 8, color: "#fff",
              fontWeight: 700, fontSize: "0.9rem", cursor: loading ? "wait" : "pointer",
              transition: "opacity 0.2s",
            }}>
              {loading ? (
                stage === "detecting" ? "⚙️ Running YOLO26..." : "🧠 Querying RAG..."
              ) : "⚡ Analyse & Get Answer"}
            </button>
            <button onClick={handleReset} disabled={loading} style={{
              padding: "12px 20px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8, color: "#8892b0",
              cursor: "pointer", fontSize: "0.85rem",
            }}>
              Reset
            </button>
          </div>
        </div>
      )}

      {/* ── Error display ── */}
      {error && (
        <div style={{
          padding: "14px 18px", borderRadius: 10,
          background: "rgba(255,107,107,0.1)",
          border: "1px solid rgba(255,107,107,0.4)",
          color: "#ff6b6b", fontSize: "0.9rem", marginBottom: 20,
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* ── Results panel ── */}
      {result && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Detection summary */}
          <div style={{
            padding: "18px", borderRadius: 12,
            background: "rgba(0,212,255,0.04)",
            border: "1px solid rgba(0,212,255,0.2)",
          }}>
            <h3 style={{ margin: "0 0 14px", color: "#00d4ff", fontSize: "0.95rem", fontWeight: 700 }}>
              🔍 Detection Results
            </h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
              {result.detected_machines?.length > 0 ? (
                result.detected_machines.map((m, i) => (
                  <div key={i} style={{
                    padding: "6px 14px", borderRadius: 8,
                    background: "rgba(123,47,247,0.15)",
                    border: "1px solid rgba(123,47,247,0.4)",
                  }}>
                    <span style={{ color: "#e6e6e6", fontWeight: 600, fontSize: "0.85rem" }}>
                      ⚙️ {m.machine_name}
                    </span>
                    {" "}
                    {confidenceBadge(m.confidence)}
                  </div>
                ))
              ) : (
                <span style={{ color: "#8892b0", fontSize: "0.85rem" }}>No machines detected</span>
              )}
            </div>

            {result.error_codes?.length > 0 && (
              <div>
                <span style={{ color: "#8892b0", fontSize: "0.8rem" }}>Error codes: </span>
                {result.error_codes.map((code, i) => (
                  <span key={i} style={{
                    marginLeft: 6, padding: "2px 10px",
                    borderRadius: 6, background: "rgba(255,107,107,0.15)",
                    border: "1px solid rgba(255,107,107,0.4)",
                    color: "#ff6b6b", fontWeight: 700, fontFamily: "monospace",
                    fontSize: "0.85rem",
                  }}>
                    {code}
                  </span>
                ))}
              </div>
            )}

            {result.vision_query_used && (
              <div style={{ marginTop: 10 }}>
                <span style={{ color: "#4a5568", fontSize: "0.78rem" }}>Auto-generated query: </span>
                <span style={{ color: "#8892b0", fontSize: "0.78rem", fontStyle: "italic" }}>
                  "{result.vision_query_used.slice(0, 120)}{result.vision_query_used.length > 120 ? "..." : ""}"
                </span>
              </div>
            )}
          </div>

          {/* RAG Answer */}
          <div style={{
            padding: "20px", borderRadius: 12,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ margin: 0, color: "#e6e6e6", fontSize: "0.95rem", fontWeight: 700 }}>
                🧠 Maintenance Answer
              </h3>
              <span style={{
                padding: "3px 10px", borderRadius: 6, fontSize: "0.78rem", fontWeight: 700,
                background: result.confidence >= 70
                  ? "rgba(0,255,136,0.12)" : "rgba(255,204,0,0.12)",
                border: `1px solid ${result.confidence >= 70 ? "#00ff88" : "#ffcc00"}`,
                color: result.confidence >= 70 ? "#00ff88" : "#ffcc00",
              }}>
                {result.confidence}% confidence
              </span>
            </div>
            <div style={{
              color: "#cbd5e0", lineHeight: 1.7, fontSize: "0.9rem",
              whiteSpace: "pre-wrap",
            }}>
              {result.answer}
            </div>

            {result.sources?.length > 0 && (
              <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 8 }}>
                <span style={{ color: "#4a5568", fontSize: "0.78rem" }}>Sources: </span>
                {result.sources.map((src, i) => (
                  <span key={i} style={{
                    padding: "2px 8px", borderRadius: 5,
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#8892b0", fontSize: "0.75rem",
                  }}>
                    📄 {src}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Latency breakdown */}
          {result.debug_latency && (
            <div style={{
              padding: "12px 16px", borderRadius: 10,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              display: "flex", gap: 20, flexWrap: "wrap",
            }}>
              {Object.entries(result.debug_latency).map(([key, val]) => (
                <div key={key} style={{ textAlign: "center" }}>
                  <div style={{ color: "#4a5568", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    {key.replace("_ms", "")}
                  </div>
                  <div style={{ color: "#00d4ff", fontWeight: 700, fontFamily: "monospace", fontSize: "0.85rem" }}>
                    {val}ms
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Suggested questions */}
          {result.suggested_questions?.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <span style={{ color: "#4a5568", fontSize: "0.8rem", width: "100%" }}>Follow-up questions:</span>
              {result.suggested_questions.map((q, i) => (
                <button key={i} onClick={() => { setQuestion(q); }} style={{
                  padding: "6px 14px", borderRadius: 20,
                  background: "rgba(123,47,247,0.1)",
                  border: "1px solid rgba(123,47,247,0.3)",
                  color: "#a78bfa", cursor: "pointer", fontSize: "0.8rem",
                }}>
                  {q}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
