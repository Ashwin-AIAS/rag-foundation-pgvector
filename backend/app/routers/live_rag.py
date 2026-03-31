import logging
import asyncio
import time
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from google import genai
from google.genai import types

from app.config import settings
from app.services.embedding_service import EmbeddingService
from app.services.retrieval_service import RetrievalService
from app.database import SessionLocal

logger = logging.getLogger(__name__)

DEBUG_FILE = "live_debug.log"

def debug_log(msg):
    with open(DEBUG_FILE, "a", encoding="utf-8") as f:
        f.write(f"{time.strftime('%Y-%m-%d %H:%M:%S')} - {msg}\n")

router = APIRouter()

# Initialize the Gemini Client
client = genai.Client(api_key=settings.GEMINI_API_KEY)

async def search_knowledge_base(query: str, source_files: list[str] = None) -> str:
    """Uses Hybrid Search to retrieve context from the RAG database based on the user's spoken query."""
    debug_log(f"TOOL CALL: search_knowledge_base(query='{query}', source_files={source_files})")
    logger.info(f"Gemini Live API triggered search_knowledge_base for query: '{query}', source_files: {source_files}")
    db = SessionLocal()
    try:
        embedding_service = EmbeddingService()
        query_embedding = embedding_service.embed_query(query)
        
        retrieval_service = RetrievalService(db)
        chunks = retrieval_service.retrieve(
            query_embedding=query_embedding,
            top_k=5, # Limit to 5 for concise audio context
            source_files=source_files,
            user_question=query
        )
        
        if not chunks:
            return "No relevant information found in the database."
            
        context = ""
        for i, chunk in enumerate(chunks):
            context += f"\n--- Source {i+1}: {chunk['source_file']} ---\n{chunk['chunk_text']}\n"
        
        logger.info(f"Retrieved {len(chunks)} chunks for Gemini Live.")
        return context
    except Exception as e:
        logger.error(f"Error in search_knowledge_base: {e}")
        return f"An error occurred while searching the database: {e}"
    finally:
        db.close()

@router.websocket("/ws/live-rag")
async def live_rag_endpoint(websocket: WebSocket):
    await websocket.accept()
    debug_log("WS: Connection accepted")
    logger.info("WebSocket connection established for Live API.")
    
    model_name = "gemini-3.1-flash-live-preview"
    
    try:
        debug_log("Initializing Gemini Session...")
        # Use a more flexible config approach for different SDK versions
        live_config = {
            "model": model_name,
            "config": {
                "response_modalities": ["AUDIO"],
                "generation_config": {
                    "response_modalities": ["AUDIO"]
                }
            }
        }
        
        # Also try typed version if supported
        try:
            typed_config = types.LiveConnectConfig(
                response_modalities=["AUDIO"],
                tools=[types.Tool(function_declarations=[
                    types.FunctionDeclaration(
                        name="search_knowledge_base",
                        description="Uses Hybrid Search to retrieve context from the RAG database based on the user's spoken query.",
                        parameters={
                            "type": "OBJECT",
                            "properties": {
                                "query": {"type": "STRING", "description": "The user's spoken query to search for"},
                                "source_files": {"type": "ARRAY", "items": {"type": "STRING"}, "description": "Optional list of files to search"}
                            }
                        }
                    )
                ])],
                system_instruction=types.Content(
                    parts=[types.Part(text="You are a helpful and extremely intelligent voice assistant hooked up to the user's personal RAG database. Speak naturally. ALWAYS use the search_knowledge_base tool to answer user questions about their documents or data.")]
                ),
                generation_config=types.GenerationConfig(
                    response_modalities=["AUDIO"]
                )
            )
            debug_log("Using typed LiveConnectConfig")
        except Exception as e:
            debug_log(f"Typed config not supported, falling back to dict: {e}")
            typed_config = live_config["config"]

        async with client.aio.live.connect(model=model_name, config=typed_config) as session:
            debug_log("Connected to Gemini Live API")
            logger.info("Successfully connected to Gemini Live API.")
            
            # Task to receive audio from frontend and send to Gemini
            async def receive_from_client():
                try:
                    while True:
                        # Receive binary PCM audio from React client
                        data = await websocket.receive_bytes()
                        if len(data) > 0:
                            # Log very occasionally to avoid spam, but confirm data flow
                            if asyncio.get_event_loop().time() % 5 < 0.1:
                                logger.debug(f"Received {len(data)} bytes of audio data from client.")
                            # For SDK 1.67.0, use media_chunks with types.Blob
                            await session.send(input=types.LiveClientRealtimeInput(media_chunks=[types.Blob(data=data, mime_type="audio/pcm;rate=16000")]), end_of_turn=False)
                except WebSocketDisconnect:
                    logger.info("Client disconnected.")
                except Exception as e:
                    logger.error(f"Error receiving from client: {e}")

            # Task to receive audio from Gemini and send to frontend
            async def send_to_client():
                try:
                    async for response in session.receive():
                        server_content = response.server_content
                        if server_content is not None:
                            model_turn = server_content.model_turn
                            if model_turn is not None:
                                for part in model_turn.parts:
                                    if part.inline_data:
                                        # Send binary PCM audio back to React client
                                        if asyncio.get_event_loop().time() % 5 < 0.1:
                                            logger.debug(f"Sending {len(part.inline_data.data)} bytes of audio back to client.")
                                        await websocket.send_bytes(part.inline_data.data)
                                    if part.text:
                                        logger.info(f"Gemini responded with text: {part.text}")
                                    if part.call:
                                        logger.info(f"Gemini requested tool call: {part.call}")
                except Exception as e:
                    logger.error(f"Error receiving from Gemini: {e}")

            # Run both infinitely until connection drops
            await asyncio.gather(receive_from_client(), send_to_client())
            
    except Exception as e:
        logger.error(f"Failed to connect to Gemini Live API: {e}")
        try:
            await websocket.close()
        except Exception:
            pass
