# Hero Mode Audio Cues Walkthrough

## Overview
The Hero Mode audio cue system has been successfully integrated across the full stack of the RAG Terminal application. Depending on the `Hero Mode` selected in the query input, a distinct system instruction persona is leveraged by the AI, and procedurally generated Web Audio sounds are played in the browser.

## Backend Changes 
- Defined 5 distinct Hero Personas (Stark, Rogers, Goindor, Panther, Banner) inside `prompt_service.py`. Each specifies a persona system prompt, a processing sound, and a completion sound.
- Modified the `construct_prompt` and `_build_system_instructions` methods to accept the `hero_mode` parameter, augmenting the system prompt with the persona details and wrapping the request boundaries with `AUDIO_CUE::` metadata logs.
- Added a `hero_mode` attribute to the `QueryRequest` payload model in `query.py`.
- Updated the `/query` API endpoint sequence in `main.py` to correctly map the user's selected mode right into the generation synthesis steps.

## Frontend Changes
- **Audio Synthesis Service (`audioCue.js`)**: Developed a synthetic Web Audio API library to generate continuous looping tones while the AI formulates answers, and specialized multi-frequency single-shot events when answers are finalized. This eliminates the necessity of storing or sourcing massive static `mp3` packets.
- **LLM Output Parsing (`parseResponse.js`)**: Implemented an extraction mechanism that elegantly strips the JSON `AUDIO_CUE` statements injected by the model from the stream buffers so they never bleed into the visible UX DOM text.
- **Component Handshake**: Modified the query emission logic in `QuestionInput.jsx` to map the respective stylized "hero symbols" to the static API enum constraints, explicitly launching the looped processing sounds directly upon form submission.
- **Global State Lifecycle (`App.jsx`)**: Hooked the live-stream buffer extraction and response completion triggers into the primary `handleQueryStart` network routine. This effectively resolves and coordinates all audio behavior sequences smoothly across fast textual streams, slow tables, and unexpected LLM fallback scenarios without causing any UI jank.
