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
        self.model = genai.GenerativeModel(settings.GEMINI_MODEL)
        self.temperature = settings.GENERATION_TEMPERATURE
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
            
            # Extract the generated text
            answer = response.text
            
            return answer.strip()
            
        except Exception as e:
            raise Exception(f"Generation failed: {str(e)}")
