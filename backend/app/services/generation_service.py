import logging
import time
from app.config import settings
from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

MAX_RETRIES = 3
INITIAL_RETRY_DELAY = 5  # seconds

class GenerationService:
    """
    Service for generating answers using Google's Gemini API.
    
    Sends prompts to the LLM and returns generated responses.
    Includes automatic retry with exponential backoff for rate limits.
    """
    
    _client = None

    def __init__(self):
        """Initialize the Gemini client."""
        if GenerationService._client is None:
            GenerationService._client = genai.Client(api_key=settings.GEMINI_API_KEY)
        
        self.model_name = settings.GEMINI_MODEL
        self.temperature = 0.2 # Structured but stable
        self.max_tokens = settings.GENERATION_MAX_TOKENS
    
    def generate(self, prompt: str) -> str:
        """
        Generate an answer using the Gemini API with retry and fallback logic.
        """
        config = types.GenerateContentConfig(
            temperature=self.temperature,
            max_output_tokens=self.max_tokens
        )
        
        models_to_try = [self.model_name, "gemini-2.0-flash", "gemini-1.5-flash"]
        models_to_try = list(dict.fromkeys(models_to_try))
        
        last_error = None
        for current_model in models_to_try:
            for attempt in range(MAX_RETRIES):
                try:
                    response = self._client.models.generate_content(
                        model=current_model,
                        contents=prompt,
                        config=config
                    )
                    
                    text = response.text
                    logging.debug(f"Generated answer length: {len(text)} chars via {current_model}")
                    return text.strip()
                    
                except Exception as e:
                    last_error = e
                    error_str = str(e).lower()
                    
                    if "503" in error_str or "unavailable" in error_str or "high demand" in error_str:
                        logger.warning(f"Model {current_model} is unavailable (503). Switching to fallback...")
                        break
                        
                    elif "429" in error_str or "quota" in error_str or "rate" in error_str or "resource" in error_str:
                        delay = INITIAL_RETRY_DELAY * (2 ** attempt)
                        logger.warning(f"Rate limited on {current_model} (attempt {attempt+1}/{MAX_RETRIES}), retrying in {delay}s...")
                        time.sleep(delay)
                    else:
                        logger.error(f"Generation failed on {current_model}: {str(e)}")
                        break
        
        raise Exception(f"Generation failed after trying all fallback models. Last error: {str(last_error)}")

    def stream_generate(self, prompt: str):
        """
        Generate a streaming answer using the Gemini API with retry and fallback logic.
        
        Retries on rate-limit errors with exponential backoff, and falls back
        to alternative models if 503 unavailable occurs.
        """
        config = types.GenerateContentConfig(
            temperature=self.temperature,
            max_output_tokens=self.max_tokens
        )
        
        models_to_try = [self.model_name, "gemini-2.0-flash", "gemini-1.5-flash"]
        models_to_try = list(dict.fromkeys(models_to_try))
        
        last_error = None
        for current_model in models_to_try:
            for attempt in range(MAX_RETRIES):
                try:
                    response = self._client.models.generate_content_stream(
                        model=current_model,
                        contents=prompt,
                        config=config
                    )
                    
                    token_count = 0
                    for chunk in response:
                        try:
                            if chunk.text:
                                token_count += 1
                                yield chunk.text
                        except Exception as ve:
                            logger.warning(f"Chunk error: {ve}")
                            continue
                    
                    if token_count > 0:
                        logger.info(f"Stream completed using model {current_model}: {token_count} tokens yielded")
                        return
                    
                except Exception as e:
                    last_error = e
                    error_str = str(e).lower()
                    
                    if "503" in error_str or "unavailable" in error_str or "high demand" in error_str:
                        logger.warning(f"Model {current_model} is unavailable (503). Switching to fallback model immediately...")
                        break
                        
                    elif "429" in error_str or "quota" in error_str or "rate" in error_str or "resource" in error_str:
                        delay = INITIAL_RETRY_DELAY * (2 ** attempt)
                        logger.warning(f"Rate limited on {current_model} (attempt {attempt+1}/{MAX_RETRIES}), retrying in {delay}s...")
                        time.sleep(delay)
                    else:
                        logger.error(f"Streaming generation failed on {current_model}: {str(e)}")
                        break
        
        logger.error(f"Stream failed after trying all fallback models: {last_error}")
        yield f"Error generating answer after fallbacks. Last error: {str(last_error)}"
