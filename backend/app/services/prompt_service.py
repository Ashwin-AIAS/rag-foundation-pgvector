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
        # Check if we are in balanced comparison mode or multi-doc mode
        is_balanced_mode = any(chunk.get("metadata", {}).get("balanced_mode", False) for chunk in retrieved_chunks)
        is_multi_doc_mode = any(chunk.get("metadata", {}).get("multi_doc_mode", False) for chunk in retrieved_chunks)
        
        # Build the system instructions
        system_prompt = self._build_system_instructions(structured_mode)
        
        # Build the context section from retrieved chunks
        # Multi-doc mode uses the same grouped format as balanced mode
        use_grouped_context = is_balanced_mode or is_multi_doc_mode
        context_section = self._build_context_section(retrieved_chunks, use_grouped_context)
        
        # Build the user question section
        question_section = self._build_question_section(user_question, structured_mode, is_balanced_mode, is_multi_doc_mode)
        
        # Combine all sections
        complete_prompt = f"{system_prompt}\n\n{context_section}\n\n{question_section}"
        
        return complete_prompt
    
    def _build_system_instructions(self, structured_mode: bool = False) -> str:
        """
        Build the system instructions that enforce grounding constraints.
        
        Returns:
            System prompt string with explicit rules
        """
        base_instructions = """You are a multilingual Retrieval-Augmented Generation (RAG) assistant.
The document database may contain content in multiple languages, including but not limited to German and English.
Your task is to answer user questions strictly based on retrieved documents.

------------------------------------------------------------
LANGUAGE HANDLING RULES
------------------------------------------------------------
1. Detect the language of the user query.
2. Always respond in the same language as the user query.
3. Retrieved documents may be in a different language than the query.
4. If documents are in another language, interpret them accurately before answering.
5. Do NOT translate the entire document unless necessary.
6. Preserve original legal wording when relevant.

------------------------------------------------------------
GROUNDING RULES
------------------------------------------------------------
1. Base your answer ONLY on the retrieved context below.
2. Do not invent facts or use external knowledge.
3. If information is not present in the retrieved documents, clearly state:
   "The retrieved documents do not contain enough information to answer this question."
4. When answering legal or contract-related questions:
   - Quote the relevant clause in its original language.
   - Then provide a clear explanation in the user's language.
5. Do not speculate or provide legal advice beyond the document content.

------------------------------------------------------------
RESPONSE STRUCTURE
------------------------------------------------------------
If legal/contract-related:

Relevant Clause:
<quote original text>

Explanation:
<clear explanation in user's language>

If not legal:

Answer:
<clear, grounded explanation>

------------------------------------------------------------
SAFETY RULES
------------------------------------------------------------
- Do not hallucinate.
- Do not assume missing context.
- Do not override retrieved evidence.
- If multiple clauses conflict, mention the conflict.

You must remain factual, precise, and grounded in retrieved documents."""

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
    
    def _build_context_section(self, chunks: List[Dict[str, Any]], is_balanced_mode: bool = False) -> str:
        """
        Build the context section from retrieved chunks.
        
        Args:
            chunks: List of retrieved chunks with text and metadata
            is_balanced_mode: Whether to group chunks by paper for comparison
            
        Returns:
            Formatted context string with source citations
        """
        if not chunks:
            return "CONTEXT:\nNo relevant documents found."
        
        MAX_CONTEXT_LENGTH = 12000 if is_balanced_mode else 6000
        current_length = 0
        
        if is_balanced_mode:
            grouped_chunks = {}
            for chunk in chunks:
                sf = chunk.get("source_file", "Unknown")
                if sf not in grouped_chunks:
                    grouped_chunks[sf] = []
                grouped_chunks[sf].append(chunk)
                
            context_parts = ["CONTEXT FOR COMPARISON:"]
            paper_labels = ["A", "B", "C", "D", "E"]
            
            for idx, (sf, sf_chunks) in enumerate(grouped_chunks.items()):
                label = paper_labels[idx] if idx < len(paper_labels) else str(idx)
                context_parts.append(f"\n--- Paper {label} ({sf}) ---")
                
                for i, chunk in enumerate(sf_chunks, 1):
                    chunk_idx = chunk.get("chunk_index", "?")
                    text = chunk.get("chunk_text", "")
                    
                    chunk_header = f"\n[Chunk {chunk_idx}]"
                    chunk_content = f"{chunk_header}\n{text}"
                    
                    if current_length + len(chunk_content) > MAX_CONTEXT_LENGTH:
                        if current_length == 0:
                            truncated_text = text[:MAX_CONTEXT_LENGTH - len(chunk_header) - 50] + "...(truncated)"
                            context_parts.append(f"{chunk_header}\n{truncated_text}")
                        # We break inner loop but might want to break outer loop too.
                        # Setting current_length high ensures we stop adding big blocks.
                        current_length += len(chunk_content)
                        break
                        
                    context_parts.append(chunk_content)
                    current_length += len(chunk_content)
                    
                if current_length > MAX_CONTEXT_LENGTH:
                    break
                    
            return "\n".join(context_parts)
        
        context_parts = ["CONTEXT:"]
        
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
    
    def _build_question_section(self, question: str, structured_mode: bool = False, is_balanced_mode: bool = False, is_multi_doc_mode: bool = False) -> str:
        """
        Build the user question section.
        
        Args:
            question: The user's question
            structured_mode: Whether to enforce JSON output
            is_balanced_mode: Whether we are comparing multiple papers
            is_multi_doc_mode: Whether we are in multi-document mode
            
        Returns:
            Formatted question string
        """
        if is_multi_doc_mode:
            return f"""USER QUESTION:
{question}

You are analyzing multiple scientific documents.

For EACH document provided in the context:
1. Identify the main topic.
2. Identify the core contribution.
3. Identify the research domain.

Then:
- Identify common themes across documents.
- Identify major differences.
- Explain how they are related.
- Present the result in a structured comparison table.

ANSWER:"""

        if is_balanced_mode:
            return f"""USER QUESTION:
{question}

You are comparing multiple research papers based on the provided context.
Compare the two research papers across:

1. Problem formulation
2. Methodology
3. Dataset
4. Evaluation metrics
5. Experimental results
6. Contributions
7. Limitations

Return a structured comparison table.

ANSWER:"""

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
