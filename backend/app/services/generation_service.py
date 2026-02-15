import logging
import google.generativeai as genai
from app.config import settings


class GenerationService:
    """
    Service for generating answers using Google's Gemini API.
    
    Sends prompts to the LLM and returns generated responses.
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
        Generate an answer using the Gemini API.
        
        Args:
            prompt: The complete prompt including system instructions,
                   context, and user question
            
        Returns:
            The generated answer as a string
            
        Raises:
            Exception: If the API call fails
        """
        try:
            generation_config = genai.types.GenerationConfig(
                temperature=self.temperature,
                max_output_tokens=self.max_tokens
            )
            
            response = self.model.generate_content(
                prompt,
                generation_config=generation_config
            )
            
            # Log response details for debugging
            logging.debug(f"Generated answer length: {len(response.text)} chars")
            if response.prompt_feedback:
                logging.debug(f"Prompt feedback: {response.prompt_feedback}")
            
            # Extract the generated text
            answer = response.text
            
            return answer.strip()
            
        except Exception as e:
            raise Exception(f"Generation failed: {str(e)}")

    def stream_generate(self, prompt: str):
        """
        Generate a streaming answer using the Gemini API.
        
        Args:
            prompt: The complete prompt including system instructions,
                   context, and user question
            
        Yields:
            Chunks of generated text
        """
        try:
            generation_config = genai.types.GenerationConfig(
                temperature=self.temperature,
                max_output_tokens=self.max_tokens
            )
            
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
                    # Safety filter can cause ValueError when accessing .text
                    logging.warning(f"Chunk blocked by safety filter: {ve}")
                    continue
            
            logging.info(f"Stream completed: {token_count} tokens yielded")
            
            # Log prompt feedback if the response was blocked
            if hasattr(response, 'prompt_feedback') and response.prompt_feedback:
                logging.info(f"Prompt feedback: {response.prompt_feedback}")
                    
        except Exception as e:
            logging.error(f"Streaming generation failed: {str(e)}")
            yield f"Error generating answer: {str(e)}"
