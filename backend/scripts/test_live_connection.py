import asyncio
import json
import os
from google import genai
from google.genai import types
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

async def test_live_session():
    if not GEMINI_API_KEY:
        print("Error: GEMINI_API_KEY not found in environment.")
        return

    client = genai.Client(api_key=GEMINI_API_KEY)
    model_id = "gemini-3.1-flash-live-preview"

    print(f"Connecting to {model_id}...")
    
    config = types.LiveConnectConfig(
        response_modalities=["AUDIO"],
        system_instruction=types.Content(
            parts=[types.Part(text="You are a test assistant. Respond briefly to verify connection.")]
        )
    )

    try:
        async with client.aio.live.connect(model=model_id, config=config) as session:
            print("Connected successfully!")
            
            # Send a simple text message to trigger a response
            print("Sending text greeting...")
            await session.send(input="Hello, can you hear me?", end_of_turn=True)
            
            print("Awaiting response...")
            async for response in session.receive():
                if response.server_content:
                    model_turn = response.server_content.model_turn
                    if model_turn:
                        for part in model_turn.parts:
                            if part.text:
                                print(f"Model response text: {part.text}")
                            if part.inline_data:
                                print(f"Received audio data chunk: {len(part.inline_data.data)} bytes")
                                # We've seen enough for a connection test
                                print("Test successful! Closing connection...")
                                return
                
    except Exception as e:
        print(f"Connection failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_live_session())
