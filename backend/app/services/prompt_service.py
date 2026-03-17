import json
import logging
from typing import List, Dict, Any

from app.services.generation_service import GenerationService

logger = logging.getLogger(__name__)
# --- HERO PERSONAS ---
HERO_PERSONAS = {
    "stark": {
        "completion_sound": "repulsor_charge",
        "persona": (
            "Persona: Tony Stark / FRIDAY AI\n"
            "Open with a sharp quip or technical observation before the answer. "
            "Use engineering terminology, SI units, system-level language naturally. "
            "Speak with absolute confidence; hedge only when data genuinely demands it. "
            "Dense information delivery — no filler, no padding. "
            "Reference JARVIS/FRIDAY capabilities when contextually relevant. "
            "Tone: Brilliant, sarcastic, supremely self-assured. Format: Tight prose. No bullet overload. Efficiency above all."
        )
    },
    "rogers": {
        "completion_sound": "shield_ring",
        "persona": (
            "Persona: Steve Rogers / SHIELD Tactical AI\n"
            "Open with a clear tactical assessment before any detail. "
            "Plain, unambiguous language — no jargon for its own sake. "
            "Reference duty, strategy, team coordination naturally. "
            "Acknowledge complexity honestly; never oversimplify risk. "
            "Inspire confidence without making false promises. "
            "Tone: Noble, direct, morally grounded, never patronizing. Format: Clear paragraphs. Structured when the situation demands it. Honest always."
        )
    },
    "goindor": {
        "completion_sound": "sling_ring_open",
        "persona": (
            "Persona: Sorcerer Supreme Intelligence\n"
            "Frame answers as revelations or unlockings of hidden knowledge. "
            "Blend scientific precision with esoteric perspective naturally. "
            "Rich vocabulary; avoid cliché mystical tropes. "
            "Acknowledge limits of known reality; hint at what lies beyond. "
            "Occasional cryptic aside that rewards re-reading. "
            "Tone: Mystical, layered, speaks in metaphor and precision simultaneously. Format: Flowing prose with occasional structured insight. Evocative but accurate."
        )
    },
    "panther": {
        "completion_sound": "vibranium_pulse",
        "persona": (
            "Persona: T'Challa / Wakandan Intelligence System\n"
            "Speak with measured authority — every sentence carries weight. "
            "Blend ancestral wisdom with cutting-edge scientific precision. "
            "Reference vibranium, Wakandan engineering, or the Ancestral Plane when fitting. "
            "Do not over-explain; trust the listener's intelligence. "
            "Compassionate but never soft; protective but never fearful. "
            "Tone: Regal, composed, deeply wise, wastes no words. Format: Concise paragraphs. Minimal but complete. No word is wasted."
        )
    },
    "banner": {
        "completion_sound": "gamma_pulse",
        "persona": (
            "Persona: Dr. Bruce Banner / Gamma Intelligence Core\n"
            "Lead with the scientific framework before stating conclusions. "
            "Quantify uncertainty explicitly — Banner hates hand-waving. "
            "Occasional dry humor about the absurdity of the situation. "
            "Reference gamma radiation, cellular biology, or quantum mechanics when relevant. "
            "Never fake confidence; intellectual honesty above ego. "
            "Tone: Scientist-first, careful, brilliant, perpetually self-aware. Format: Precise. Structured when data demands it. Footnote-level accuracy."
        )
    }
}

# --- AUTONOMOUS RAG PLANNER CONSTANTS ---

PHASE1_PROMPT = """You are the planning engine of an advanced RAG system.
The document database contains multilingual content (primarily German and English).
Analyze the user query. Return ONLY valid JSON — no text outside the JSON block.
If a field cannot be determined, use the default value shown below.
{
"query_type": "factual | comparative | multi_step | analytical | definition | cross_lingual | paper_comparison | unknown",
"complexity": "low | medium | high",
"detected_language": "en | de | other",
"sub_queries": ["at least one sub-query required"],
"retrieval_strategy": "single_query | multi_query",
"cross_language_expansion": true | false
}
# Rules:
# comparison query     → break into one sub-query per entity being compared
# multi-step reasoning → decompose into ordered sub-queries
# cross-language hint  → set cross_language_expansion = true
# paper_comparison     → one sub-query per paper section (method, results, limits)
# simple definition    → single sub-query, cross_language_expansion = false
# unknown type         → default to factual, complexity = medium
User Query: {user_query}
"""

PHASE2_PROMPT = """You are the tool routing engine of an autonomous RAG system.
Select tools from the list below based on the query plan provided.
Available tools (map to actual service classes):
  - vector_search     → retrieval_service.py :: semantic similarity via pgvector
  - keyword_search    → retrieval_service.py :: PostgreSQL full-text search
  - graph_search      → graph_retrieval_service.py :: Neo4j entity traversal
  - cross_doc_compare → triggers balanced_mode / multi_doc_mode in retrieval
  - web_search        → external; use ONLY if query requires post-2024 data
  - calculator        → use for explicit numerical operations
Extend the plan JSON with these new fields. Return ONLY valid JSON.
{
  ...existing Phase 1 fields...,
"tools_needed": ["tool1", "tool2"],
"primary_tool": "the single most important tool",
"requires_reasoning": true | false,
"use_reranker": true | false
}
# Tool selection rules:
# semantic / conceptual queries     → vector_search (always include)
# exact names, codes, IDs           → keyword_search
# entity relationships, authors     → graph_search (only if Neo4j available)
# paper_comparison query_type       → cross_doc_compare + vector_search
# cross_lingual query_type          → vector_search + keyword_search (both)
# post-cutoff or current events     → web_search
# numerical / statistical           → calculator
# high complexity                   → use_reranker = true
# low complexity factual            → use_reranker = false
Query Plan: {phase1_plan_json}
User Query: {user_query}
"""

PHASE3_PROMPT = """You are the retrieval parameter optimizer of an autonomous RAG system.
The vector store uses pgvector with Gemini text-embedding-004 embeddings.
Cosine similarity scores for this model are typically higher than generic models.
Extend the plan JSON with retrieval parameters. Return ONLY valid JSON.
{
  ...existing Phase 1+2 fields...,
"retrieval_parameters": {
"top_k": "3-20",
"similarity_threshold": "0.63-0.88",
"hybrid_weight": {
"vector": "0.5-0.8",
"keyword": "0.2-0.5"
      },
"expand_to_adjacent_chunks": true | false
  }
}
# Rules (Gemini text-embedding-004 calibrated):
# low complexity      → top_k 3-5,  threshold 0.78-0.88
# medium complexity   → top_k 6-10, threshold 0.70-0.78
# high complexity     → top_k 10-20, threshold 0.65-0.72
# cross_lingual       → threshold 0.65-0.75, vector_weight 0.6, keyword_weight 0.4
# paper_comparison    → top_k 12-20, threshold 0.63-0.72, expand_chunks = true
# if uncertain        → increase top_k by 2, lower threshold by 0.03
# hybrid_weight must sum to 1.0 (your system uses 0.7/0.3 default)
Query Plan: {phase2_plan_json}
User Query: {user_query}
"""

PHASE4_PROMPT = """You are the validation planning module of an autonomous RAG system.
Extend the plan JSON with validation directives. Return ONLY valid JSON.
{
  ...existing Phase 1+2+3 fields...,
"requires_self_reflection": true | false,
"confidence_requirement": "low | medium | high",
"validation_checks": ["grounding", "consistency", "completeness"],
"max_reflection_loops": "1 | 2 | 3"
}
# Rules:
# multi_step or analytical query_type  → requires_self_reflection = true
# high complexity                       → confidence_requirement = high
# paper_comparison                      → validate grounding + completeness
# simple definition, low complexity    → no reflection needed
# reranker_top_score < 0.72            → requires_self_reflection = true
# max_reflection_loops = 1 for medium, 2 for high, 3 for paper_comparison
Query Plan: {phase3_plan_json}
Reranker Top Score: {top_reranker_score}
User Query: {user_query}
"""

DEFAULT_PLAN = {
    "query_type": "unknown",
    "complexity": "medium",
    "detected_language": "en",
    "sub_queries": [],
    "retrieval_strategy": "single_query",
    "cross_language_expansion": False,
    "tools_needed": ["vector_search"],
    "primary_tool": "vector_search",
    "requires_reasoning": False,
    "use_reranker": True,
    "retrieval_parameters": {
        "top_k": 10,
        "similarity_threshold": 0.72,
        "hybrid_weight": {"vector": 0.7, "keyword": 0.3},
        "expand_to_adjacent_chunks": False
    },
    "requires_self_reflection": False,
    "confidence_requirement": "medium",
    "max_reflection_loops": 1
}

def safe_parse(llm_response: str, fallback_plan: dict, original_query: str) -> dict:
    """Safely parse LLM JSON responses with fallback."""
    try:
        # Strip markdown json blocks if present
        if "```json" in llm_response:
            llm_response = llm_response.split("```json")[1].split("```")[0].strip()
        elif "```" in llm_response:
            llm_response = llm_response.split("```")[1].split("```")[0].strip()
            
        plan = json.loads(llm_response)
        
        # Ensure sub_queries is populated if empty or missing
        if not plan.get("sub_queries"):
            plan["sub_queries"] = [original_query]
            
        return plan
    except (json.JSONDecodeError, ValueError) as e:
        logger.warning(f"Failed to parse LLM JSON response: {e}. Falling back.")
        plan = fallback_plan.copy()
        plan['sub_queries'] = [original_query]
        return plan

async def call_gemini(prompt: str) -> str:
    """Helper to call Gemini API via GenerationService."""
    import asyncio
    service = GenerationService()
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, service.generate, prompt)

class PromptService:
    """
    Service for constructing grounded prompts and autonomous RAG plans.
    """
    
    def __init__(self):
        """Initialize the prompt service."""
        pass
        
    async def build_autonomous_plan(self, user_query: str, top_reranker_score: float = 0.0):
        """
        Build a comprehensive execution plan using the 4-phase autonomous RAG planner.
        """
        # Phase 1: Classify & Decompose
        p1_response = await call_gemini(PHASE1_PROMPT.format(user_query=user_query))
        p1_plan     = safe_parse(p1_response, DEFAULT_PLAN, user_query)
        
        # Phase 2: Route Tools
        p2_prompt = PHASE2_PROMPT.format(phase1_plan_json=json.dumps(p1_plan), user_query=user_query)
        p2_response = await call_gemini(p2_prompt)
        p2_plan     = safe_parse(p2_response, p1_plan, user_query)
        
        # Phase 3: Set Retrieval Params
        p3_prompt = PHASE3_PROMPT.format(phase2_plan_json=json.dumps(p2_plan), user_query=user_query)
        p3_response = await call_gemini(p3_prompt)
        p3_plan     = safe_parse(p3_response, p2_plan, user_query)
        
        # Phase 4: Validation Directives
        p4_prompt = PHASE4_PROMPT.format(
            phase3_plan_json=json.dumps(p3_plan),
            top_reranker_score=top_reranker_score,
            user_query=user_query
        )
        p4_response = await call_gemini(p4_prompt)
        final_plan  = safe_parse(p4_response, p3_plan, user_query)
        
        return final_plan
    
    def construct_prompt(
        self,
        retrieved_chunks: List[Dict[str, Any]],
        user_question: str,
        structured_mode: bool = False,
        hero_mode: str = "stark"
    ) -> str:
        """
        Construct a complete prompt for the LLM.
        
        Args:
            retrieved_chunks: List of retrieved document chunks with metadata
            user_question: The user's original question
            structured_mode: Whether to enforce JSON output
            hero_mode: The hero persona to use
            
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
        system_prompt = self._build_system_instructions(structured_mode, hero_mode)
        
        # Build the context section from retrieved chunks
        # Multi-doc mode uses the same grouped format as balanced mode
        use_grouped_context = is_balanced_mode or is_multi_doc_mode
        context_section = self._build_context_section(retrieved_chunks, use_grouped_context)
        
        # Build the user question section
        question_section = self._build_question_section(user_question, structured_mode, is_balanced_mode, is_multi_doc_mode)
        
        # Combine all sections
        complete_prompt = f"{system_prompt}\n\n{context_section}\n\n{question_section}"
        
        return complete_prompt
    
    def _build_system_instructions(self, structured_mode: bool = False, hero_mode: str = "stark") -> str:
        """
        Build the system instructions that enforce grounding constraints.
        
        Returns:
            System prompt string with explicit rules
        """
        persona_data = HERO_PERSONAS.get(hero_mode, HERO_PERSONAS["stark"])
        persona_text = persona_data["persona"]
        completion_sound = persona_data["completion_sound"]
        
        closing_cue = f'AUDIO_CUE:: {{"mode":"{hero_mode}","state":"complete","sound":"{completion_sound}"}}'
        
        base_instructions = f"""{persona_text}

You are a multilingual Retrieval-Augmented Generation (RAG) assistant.
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
            return base_instructions + f"""

6. OUTPUT FORMAT: strict JSON array of objects.
7. Do NOT include markdown formatting (like ```json).
8. Do NOT include any explanations or conversational text.
9. Each object must represent one item found in the context.
{closing_cue}"""
        
        return base_instructions + f"""

6. If the question asks "how to" or for a procedure, format the answer as a clear, numbered list.
7. Ensure all procedural steps are complete sentences and merged coherently from multiple chunks.

Your role is to be a faithful representative of the provided documents, not a general knowledge assistant.
{closing_cue}"""
    
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

You are analyzing multiple scientific research papers.

First, for each document separately:
- Identify the core problem.
- Identify the main methodological approach.
- Identify the key contribution.

Then perform cross-document synthesis:

1. Identify shared research themes.
2. Identify differences in modeling approach.
3. Identify differences in system assumptions.
4. Identify whether the works are complementary or competing.
5. Summarize in a structured comparison table.

Avoid generic summaries.
Reference each document explicitly.

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
