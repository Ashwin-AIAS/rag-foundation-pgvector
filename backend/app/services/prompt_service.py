from typing import List, Dict, Any


class PromptService:
    """
    Service for constructing grounded prompts from retrieved context.
    
    Builds prompts that enforce strict grounding constraints to prevent
    the LLM from using external knowledge or hallucinating information.
    """
    
    def __init__(self):
        """Initialize the prompt service."""
        pass
    
    def construct_prompt(
        self,
        retrieved_chunks: List[Dict[str, Any]],
        user_question: str,
        structured_mode: bool = False
    ) -> str:
        """
        Construct a complete prompt for the LLM.
        
        Args:
            retrieved_chunks: List of retrieved document chunks with metadata
            user_question: The user's original question
            structured_mode: Whether to enforce JSON output
            
        Returns:
            A complete prompt string with system instructions, context, and question
            
        The prompt structure:
            1. System instructions with grounding rules
            2. Retrieved context with source citations
            3. User's question
        """
        # Build the system instructions
        system_prompt = self._build_system_instructions(structured_mode)
        
        # Build the context section from retrieved chunks
        context_section = self._build_context_section(retrieved_chunks)
        
        # Build the user question section
        question_section = self._build_question_section(user_question, structured_mode)
        
        # Combine all sections
        complete_prompt = f"{system_prompt}\n\n{context_section}\n\n{question_section}"
        
        return complete_prompt
    
    def _build_system_instructions(self, structured_mode: bool = False) -> str:
        """
        Build the system instructions that enforce grounding constraints.
        
        Returns:
            System prompt string with explicit rules
        """
        base_instructions = """You are a helpful assistant that answers questions based ONLY on the provided context.

CRITICAL RULES:
1. Use ONLY information from the context below
2. If the context does not contain enough information to answer the question, you MUST respond with: "I cannot answer this question based on the available documents."
3. Do not use any external knowledge or information not present in the context
4. Do not make assumptions or inferences beyond what is explicitly stated in the context
5. When providing an answer, cite the source document(s) used

FORMATTING RULES:
You must format the answer in structured Markdown.
Use:
- Headings (##) for main sections
- Bullet points for lists
- Numbered steps when describing procedures
- Tables if data is tabular or structured
- Clear spacing between sections
- Bold text for key terms

Do NOT return raw text blocks.
Return well-formatted Markdown."""

        if structured_mode:
            return base_instructions + """

6. OUTPUT FORMAT: strict JSON array of objects.
7. Do NOT include markdown formatting (like ```json).
8. Do NOT include any explanations or conversational text.
9. Each object must represent one item found in the context."""
        
        return base_instructions + """

6. If the question asks "how to" or for a procedure, format the answer as a clear, numbered list.
7. Ensure all procedural steps are complete sentences and merged coherently from multiple chunks.

Your role is to be a faithful representative of the provided documents, not a general knowledge assistant."""
    
    def _build_context_section(self, chunks: List[Dict[str, Any]]) -> str:
        """
        Build the context section from retrieved chunks.
        
        Args:
            chunks: List of retrieved chunks with text and metadata
            
        Returns:
            Formatted context string with source citations
        """
        if not chunks:
            return "CONTEXT:\nNo relevant documents found."
        
        context_parts = ["CONTEXT:"]
        current_length = 0
        MAX_CONTEXT_LENGTH = 6000
        
        for i, chunk in enumerate(chunks, 1):
            source = chunk.get("source_file", "Unknown")
            chunk_idx = chunk.get("chunk_index", "?")
            text = chunk.get("chunk_text", "")
            score = chunk.get("similarity_score", 0.0)
            
            # Format each chunk with clear source attribution
            chunk_header = f"\n[Document {i}: {source}, Chunk {chunk_idx}, Relevance: {score:.2f}]"
            chunk_content = f"{chunk_header}\n{text}"
            
            # Check length constraint
            if current_length + len(chunk_content) > MAX_CONTEXT_LENGTH:
                # If this is the very first chunk and it's too long, truncate it
                if current_length == 0:
                     truncated_text = text[:MAX_CONTEXT_LENGTH - len(chunk_header) - 50] + "...(truncated)"
                     context_parts.append(f"{chunk_header}\n{truncated_text}")
                break
            
            context_parts.append(chunk_content)
            current_length += len(chunk_content)
        
        return "\n".join(context_parts)
    
    def _build_question_section(self, question: str, structured_mode: bool = False) -> str:
        """
        Build the user question section.
        
        Args:
            question: The user's question
            structured_mode: Whether to enforce JSON output
            
        Returns:
            Formatted question string
        """
        if structured_mode:
             return f"""USER QUESTION:
{question}

REQUIRED OUTPUT FORMAT (JSON Array):
[
  {{
    "title": "Item Name",
    "description": "Brief details from context",
    "source_document": "Source filename"
  }}
]

ANSWER:"""

        return f"USER QUESTION:\n{question}\n\nANSWER:"
