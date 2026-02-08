from openai import OpenAI
from app.config import settings


class GenerationService:
    """
    Service for generating answers using OpenAI's chat completion API.
    
    Sends prompts to the LLM and returns generated responses.
    """
    
    def __init__(self):
        """Initialize the OpenAI client."""
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = settings.OPENAI_MODEL
        self.temperature = settings.GENERATION_TEMPERATURE
        self.max_tokens = settings.GENERATION_MAX_TOKENS
    
    def generate(self, prompt: str) -> str:
        """
        Generate an answer using the OpenAI API.
        
        Args:
            prompt: The complete prompt including system instructions,
                   context, and user question
            
        Returns:
            The generated answer as a string
            
        Raises:
            Exception: If the API call fails
        """
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=self.temperature,
                max_tokens=self.max_tokens
            )
            
            # Extract the generated text
            answer = response.choices[0].message.content
            
            return answer.strip()
            
        except Exception as e:
            raise Exception(f"Generation failed: {str(e)}")
