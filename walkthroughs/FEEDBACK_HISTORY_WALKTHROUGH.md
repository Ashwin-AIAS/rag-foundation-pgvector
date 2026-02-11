# Feedback & Conversation History - Implementation Walkthrough

## Features Implemented

Added two passive UX enhancements to the RAG frontend that observe system behavior without modifying grounding or generation logic:

1. **Answer Feedback (👍/👎)** - User ratings on answer quality
2. **Conversation History** - Chronological display of past Q&A pairs

---

## Backend Changes

### New Database Table: `feedback`

Created table to store user feedback for analysis:

```sql
CREATE TABLE feedback (
    id SERIAL PRIMARY KEY,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    feedback VARCHAR(10) NOT NULL CHECK (feedback IN ('positive', 'negative')),
    num_chunks_retrieved INTEGER NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes created:**
- `feedback_type_idx` - for filtering by feedback type
- `feedback_timestamp_idx` - for time-based analysis

### New API Endpoint: POST /feedback

**Request:**
```json
{
  "question": "What is the capital of France?",
  "answer": "Based on the provided documents, the capital of France is Paris.",
  "feedback": "positive",
  "num_chunks_retrieved": 3,
  "timestamp": "2026-02-10T01:45:00Z"
}
```

**Response:**
```json
{
  "status": "received",
  "feedback_id": 1,
  "message": "Thank you for your feedback"
}
```

**Files modified:**
- [`backend/app/models/feedback.py`](file:///C:/Users/mashw/OneDrive/Desktop/CollegeMaterials/RAG/backend/app/models/feedback.py) - Pydantic models
- [`backend/app/models/document.py`](file:///C:/Users/mashw/OneDrive/Desktop/CollegeMaterials/RAG/backend/app/models/document.py) - SQLAlchemy ORM model
- [`backend/app/main.py`](file:///C:/Users/mashw/OneDrive/Desktop/CollegeMaterials/RAG/backend/app/main.py) - Endpoint implementation
- [`database/init.sql`](file:///C:/Users/mashw/OneDrive/Desktop/CollegeMaterials/RAG/database/init.sql) - Schema definition

---

## Frontend Changes

### 1. Feedback UI

#### New Component: FeedbackButtons

**Location:** [`frontend/src/components/FeedbackButtons.jsx`](file:///C:/Users/mashw/OneDrive/Desktop/CollegeMaterials/RAG/frontend/src/components/FeedbackButtons.jsx)

**Features:**
- Thumbs up/down buttons
- One feedback per answer (buttons disable after click)
- Subtle visual confirmation
- Non-blocking error handling
- Works for both answers and refusals

**Integration:**
- Added to [`AnswerDisplay.jsx`](file:///C:/Users/mashw/OneDrive/Desktop/CollegeMaterials/RAG/frontend/src/components/AnswerDisplay.jsx)
- Appears below answer text and sources
- Receives `question`, `answer`, and `numChunksRetrieved` as props

### 2. Conversation History

#### New Components

**ConversationHistory** ([`ConversationHistory.jsx`](file:///C:/Users/mashw/OneDrive/Desktop/CollegeMaterials/RAG/frontend/src/components/ConversationHistory.jsx)):
- Displays list of past Q&A pairs
- Shows count and clear button
- Empty state with helpful message
- Scrollable list with custom scrollbar

**HistoryItem** ([`HistoryItem.jsx`](file:///C:/Users/mashw/OneDrive/Desktop/CollegeMaterials/RAG/frontend/src/components/HistoryItem.jsx)):
- Individual Q&A pair display
- Click to expand/collapse
- Shows timestamp (relative time)
- Refusal indicator (⚠️ icon)
- Displays sources when expanded

#### State Management

**App.jsx changes:**
- Added `conversationHistory` state (max 50 items)
- Auto-adds items on query success
- Includes `handleClearHistory` with confirmation
- History items contain:
  - `id`, `question`, `answer`
  - `retrieved_chunks`, `num_chunks_retrieved`
  - `timestamp`, `isRefusal` flag

#### Layout Updates

**Two-column design:**
- Main content area (left) - upload, query, answer
- Sidebar (right, 350px) - conversation history
- Responsive: stacks vertically on tablets/mobile

**Files modified:**
- [`frontend/src/App.jsx`](file:///C:/Users/mashw/OneDrive/Desktop/CollegeMaterials/RAG/frontend/src/App.jsx) - State and layout
- [`frontend/src/App.css`](file:///C:/Users/mashw/OneDrive/Desktop/CollegeMaterials/RAG/frontend/src/App.css) - Responsive grid
- [`frontend/src/components/QuestionInput.jsx`](file:///C:/Users/mashw/OneDrive/Desktop/CollegeMaterials/RAG/frontend/src/components/QuestionInput.jsx) - Added `onQueryStart` handler

---

## Design Principles Followed

### ✅ Passive Observation Only

**Feedback:**
- Stored for analysis only
- Does NOT modify future answers
- Does NOT affect retrieval or generation
- Does NOT trigger re-querying

**History:**
- Displays answers exactly as returned
- No summarization or rewriting
- No re-querying when viewing past items
- Frontend-only state (no persistence)

### ✅ Refusal Handling

**Refusals are:**
- Preserved verbatim in history
- Clearly marked with ⚠️ icon
- Styled distinctly (yellow/orange background)
- Never hidden or auto-collapsed
- Eligible for feedback like normal answers

### ✅ Animation Restraint

**Allowed:**
- Subtle hover states (color change, slight lift)
- Gentle fade-in for new elements (200-300ms)
- Clear visual confirmation (highlight, checkmark)

**Forbidden:**
- Gamification (points, badges, counters)
- "Learning" indicators (spinning, pulsing)
- Delayed or animated refusal messages
- Auto-scrolling or attention-seeking effects

---

## Testing Instructions

### 1. Start Services

```bash
# Backend (if not running)
cd C:\Users\mashw\OneDrive\Desktop\CollegeMaterials\RAG
docker-compose up -d

# Frontend (if not running)
cd frontend
npm run dev
```

### 2. Test Feedback Feature

1. Upload a document
2. Ask a question
3. Wait for answer to appear
4. Click 👍 or 👎 button
5. Verify:
   - Button highlights
   - Other button disables
   - "Thank you" message appears
   - No error in console

**Test refusal feedback:**
1. Ask question with no relevant documents
2. Verify refusal message appears
3. Verify feedback buttons still work

**Verify database storage:**
```bash
docker-compose exec postgres psql -U raguser -d ragdb -c "SELECT id, feedback, LEFT(question, 40) FROM feedback ORDER BY created_at DESC LIMIT 5;"
```

### 3. Test Conversation History

1. Ask multiple questions (mix of answers and refusals)
2. Verify history sidebar shows all Q&A pairs
3. Click on a history item to expand
4. Verify:
   - Full answer displays
   - Sources shown (if applicable)
   - Refusals marked with ⚠️
   - No re-querying occurs

**Test clear history:**
1. Click "Clear" button
2. Confirm dialog appears
3. Click OK
4. Verify history empties

**Test 50-item limit:**
1. Ask 51+ questions (or modify code to test with lower limit)
2. Verify oldest items are removed

### 4. Test Responsive Design

1. Resize browser window
2. Verify sidebar moves below main content on tablets
3. Verify layout adapts on mobile

---

## File Structure

### New Files Created

**Backend:**
- `backend/app/models/feedback.py` - Pydantic models
- Updated: `backend/app/models/document.py` - Added Feedback ORM model
- Updated: `backend/app/main.py` - Added /feedback endpoint
- Updated: `database/init.sql` - Added feedback table

**Frontend:**
- `frontend/src/components/FeedbackButtons.jsx`
- `frontend/src/components/FeedbackButtons.css`
- `frontend/src/components/ConversationHistory.jsx`
- `frontend/src/components/ConversationHistory.css`
- `frontend/src/components/HistoryItem.jsx`
- `frontend/src/components/HistoryItem.css`

**Modified:**
- `frontend/src/App.jsx` - State management and layout
- `frontend/src/App.css` - Two-column responsive design
- `frontend/src/components/AnswerDisplay.jsx` - Integrated FeedbackButtons
- `frontend/src/components/QuestionInput.jsx` - Added onQueryStart

---

## System Status

✅ **Backend:**
- Feedback endpoint operational
- Database table created with indexes
- Error handling implemented

✅ **Frontend:**
- Feedback UI integrated
- Conversation history sidebar functional
- Responsive design working
- All animations restrained

✅ **Grounding Preserved:**
- No modification of retrieval logic
- No modification of generation logic
- Refusals preserved exactly
- Frontend remains passive observer

---

## What This Does NOT Do

❌ **No personalization** - Feedback doesn't customize answers
❌ **No adaptive behavior** - System doesn't "learn" from feedback
❌ **No retraining** - No model updates
❌ **No prompt modification** - Prompts unchanged by feedback
❌ **No answer regeneration** - Can't re-answer based on feedback
❌ **No persistent history** - History clears on page reload
❌ **No search in history** - Simple chronological list only

---

## Next Steps

The RAG system now has complete feedback and history features. You can:

1. **Analyze feedback data** - Query the `feedback` table for insights
2. **Export history** - Add export functionality if needed
3. **Persist history** - Add localStorage or database storage
4. **Add filtering** - Filter history by refusals, date, etc.
5. **Statistics dashboard** - Show feedback aggregates (admin view)

All future enhancements should maintain the passive observation principle.
