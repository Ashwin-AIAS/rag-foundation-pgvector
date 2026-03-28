import logging
import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from google import genai
from google.genai import types

from app.config import settings
from app.services.embedding_service import EmbeddingService
from app.services.retrieval_service import RetrievalService
from app.database import SessionLocal

logger = logging.getLogger(__name__)

router = APIRouter()

# Initialize the Gemini Client
client = genai.Client(api_key=settings.GEMINI_API_KEY)

async def search_knowledge_base(query: str, source_files: list[str] = None) -> str:
    """Uses Hybrid Search to retrieve context from the RAG database based on the user's spoken query."""
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
    logger.info("WebSocket connection established for Live API.")
    
    config = types.LiveConnectConfig(
        response_modalities=[types.LiveConnectConfigResponseModalities.AUDIO],
        tools=[search_knowledge_base],
        system_instruction=types.Content(
            parts=[types.Part.from_text("You are a helpful and extremely intelligent voice assistant hooked up to the user's personal RAG database. Speak naturally. ALWAYS use the search_knowledge_base tool to answer user questions about their documents or data.")]
        )
    )
    
    try:
        async with client.aio.live.connect(model="gemini-3.1-flash-live-preview", config=config) as session:
            logger.info("Successfully connected to Gemini Live API.")
            
            # Task to receive audio from frontend and send to Gemini
            async def receive_from_client():
                try:
                    while True:
                        # Receive binary PCM audio from React client
                        data = await websocket.receive_bytes()
                        await session.send(input={"data": data, "mime_type": "audio/pcm;rate=16000"}, end_of_turn=False)
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
                                        await websocket.send_bytes(part.inline_data.data)
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
