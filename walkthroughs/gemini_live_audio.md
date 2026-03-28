# Gemini 3.1 Live API Integration Walkthrough

We have successfully integrated Google's **Gemini 3.1 Flash Live API** into your RAG project! 

The application now supports real-time, ultra-low latency conversational AI that can verbally answer questions about your uploaded documents by autonomously triggering the backend hybrid search.

## Changes Made

### 1. Backend: FastAPI WebSocket Bridge 
* **Created [live_rag.py](file:///c:/Users/mashw/OneDrive/Desktop/CollegeMaterials/RAG/backend/app/routers/live_rag.py)**
  * Established an endpoint at `ws://localhost:8000/ws/live-rag`.
  * Connected to the Gemini Live API session (`client.aio.live.connect`).
  * Defined the `search_knowledge_base` Python tool inside the session config, which securely bridges directly to your existing `RetrievalService`.
  * Ran concurrent Python `asyncio` tasks to endlessly stream PCM audio to and from Gemini.
* **Modified [main.py](file:///c:/Users/mashw/OneDrive/Desktop/CollegeMaterials/RAG/backend/app/main.py)**
  * Registered the `live_rag` router into the FastAPI startup lifecycle.

### 2. Frontend: React Live Audio Agent
* **Created [LiveVoiceAgent.jsx](file:///c:/Users/mashw/OneDrive/Desktop/CollegeMaterials/RAG/frontend/src/components/LiveVoiceAgent.jsx)**
  * Implemented `navigator.mediaDevices.getUserMedia()` to capture raw microphone input.
  * Leveraged `AudioContext` and `ScriptProcessorNode` to convert the browser's native `Float32` sample rate down to the `16kHz Int16 PCM` format required by Gemini.
  * Sent the stripped binary PCM buffers over the WebSocket.
  * Received binary PCM chunks back from FastAPI (originated from Gemini) and queued them into an `AudioBufferSourceNode` for seamless, gapless playback.
  * Created dynamic UI states (Disconnected, Connecting, Listening, Speaking) with Framer Motion animations to guide the user.

## How to Test

### Setup
1. **Start the Database** (if not already running): `docker-compose up -d db`
2. **Start the Backend**:
   ```bash
   cd backend
   venv\Scripts\activate
   uvicorn app.main:app --reload
   ```
3. **Start the Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

### Verification Steps
1. Navigate to the RAG UI in your browser.
2. Upload a document (e.g. a sample PDF or text file).
3. Click the **START LIVE AGENT** button above the question input box.
4. Allow microphone access when prompted by the browser.
5. Watch the indicator switch to `STATUS: LISTENING` (blue pulsing dots).
6. **Speak naturally**: *"Hey computer, can you check my documents and tell me what the summary of the latest report is?"*
7. Check your backend terminal — you should see Gemini independently trigger the tool execution log:
   `INFO: Gemini Live API triggered search_knowledge_base for query:...`
8. The UI will switch to `STATUS: SPEAKING` (green waveform) and you will hear Gemini accurately speaking the answer back to you based on your document's context!

> [!TIP]
> Gemini Live API is interruptible! If the agent starts reading a long paragraph from a document, you can simply interrupt it by speaking over it ("Wait, skip to the conclusion") and it will stop playing audio and immediately adjust.
