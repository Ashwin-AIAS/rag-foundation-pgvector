import logging
import time
import google.generativeai as genai
from app.config import settings

logger = logging.getLogger(__name__)

MAX_RETRIES = 3
INITIAL_RETRY_DELAY = 5  # seconds


class GenerationService:
    """
    Service for generating answers using Google's Gemini API.
    
    Sends prompts to the LLM and returns generated responses.
    Includes automatic retry with exponential backoff for rate limits.
    """
    
    def __init__(self):
        """Initialize the Gemini client."""
        genai.configure(api_key=settings.GEMINI_API_KEY)
        # Generation models need 'models/' prefix
        model_name = f"models/{settings.GEMINI_MODEL}"
        self.model = genai.GenerativeModel(model_name)
        self.temperature = 0.2 # Structured but stable
        self.max_tokens = settings.GENERATION_MAX_TOKENS
    
    def generate(self, prompt: str) -> str:
        """
        Generate an answer using the Gemini API with retry logic.
        """
        generation_config = genai.types.GenerationConfig(
            temperature=self.temperature,
            max_output_tokens=self.max_tokens
        )
        
        last_error = None
        for attempt in range(MAX_RETRIES):
            try:
                response = self.model.generate_content(
                    prompt,
                    generation_config=generation_config
                )
                
                logging.debug(f"Generated answer length: {len(response.text)} chars")
                if response.prompt_feedback:
                    logging.debug(f"Prompt feedback: {response.prompt_feedback}")
                
                return response.text.strip()
                
            except Exception as e:
                last_error = e
                error_str = str(e).lower()
                if "429" in error_str or "quota" in error_str or "rate" in error_str or "resource" in error_str:
                    delay = INITIAL_RETRY_DELAY * (2 ** attempt)
                    logger.warning(f"Rate limited (attempt {attempt+1}/{MAX_RETRIES}), retrying in {delay}s...")
                    time.sleep(delay)
                else:
                    raise Exception(f"Generation failed: {str(e)}")
        
        raise Exception(f"Generation failed after {MAX_RETRIES} retries: {str(last_error)}")

    def stream_generate(self, prompt: str):
        """
        Generate a streaming answer using the Gemini API with retry logic.
        
        Retries on rate-limit errors with exponential backoff.
        """
        generation_config = genai.types.GenerationConfig(
            temperature=self.temperature,
            max_output_tokens=self.max_tokens
        )
        
        last_error = None
        for attempt in range(MAX_RETRIES):
            try:
                response = self.model.generate_content(
                    prompt,
                    generation_config=generation_config,
                    stream=True
                )
                
                token_count = 0
                for chunk in response:
                    try:
                        if hasattr(chunk, "text") and chunk.text:
                            token_count += 1
                            yield chunk.text
                    except ValueError as ve:
                        logger.warning(f"Chunk blocked by safety filter: {ve}")
                        continue
                
                logger.info(f"Stream completed: {token_count} tokens yielded")
                
                if hasattr(response, 'prompt_feedback') and response.prompt_feedback:
                    logger.info(f"Prompt feedback: {response.prompt_feedback}")
                
                # Stream succeeded — exit retry loop
                return
                    
            except Exception as e:
                last_error = e
                error_str = str(e).lower()
                if "429" in error_str or "quota" in error_str or "rate" in error_str or "resource" in error_str:
                    delay = INITIAL_RETRY_DELAY * (2 ** attempt)
                    logger.warning(f"Rate limited (attempt {attempt+1}/{MAX_RETRIES}), retrying in {delay}s...")
                    time.sleep(delay)
                else:
                    logger.error(f"Streaming generation failed: {str(e)}")
                    yield f"Error generating answer: {str(e)}"
                    return
        
        logger.error(f"Stream failed after {MAX_RETRIES} retries: {last_error}")
        yield f"Error: Rate limit exceeded. Please wait a moment and try again."
