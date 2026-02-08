# RAG Frontend

Minimal React.js frontend for the RAG (Retrieval-Augmented Generation) backend.

## Features

- **File Upload**: Upload PDF and TXT documents to the backend
- **Question Input**: Ask questions based on uploaded documents
- **Answer Display**: View answers with source citations
- **Clear State Communication**: Distinct visual states for loading, success, refusal, and errors
- **Subtle Animations**: Fade-in and slide-up effects (≤250ms) for clarity

## Tech Stack

- React 18
- Vite (build tool)
- Vanilla CSS
- Fetch API

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- RAG backend running on `http://localhost:8000`

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

## Project Structure

```
src/
├── components/
│   ├── FileUpload.jsx       # File upload component
│   ├── FileUpload.css
│   ├── QuestionInput.jsx    # Question input component
│   ├── QuestionInput.css
│   ├── AnswerDisplay.jsx    # Answer display component
│   └── AnswerDisplay.css
├── services/
│   └── api.js               # Backend API calls
├── App.jsx                  # Main app component
├── App.css
├── index.css                # Global styles
└── main.jsx                 # Entry point
```

## Component Overview

### FileUpload
- Accepts PDF and TXT files
- Validates file type
- Shows upload progress
- Displays success/error messages

### QuestionInput
- Text input for questions
- Validates non-empty input
- Disabled until documents are uploaded
- Shows loading state during query

### AnswerDisplay
- Shows empty state initially
- Loading spinner during query
- Success state with answer and sources
- Refusal state (orange) when context insufficient
- Source citations with relevance scores

## API Integration

### Upload Endpoint
```
POST http://localhost:8000/ingest
Content-Type: multipart/form-data
```

### Query Endpoint
```
POST http://localhost:8000/query
Content-Type: application/json
Body: { "question": "..." }
```

## Design Principles

- **Minimal**: Clean, uncluttered interface
- **Honest**: No fake AI effects or typing animations
- **Clear**: Distinct visual states for all conditions
- **Responsive**: Works on mobile and desktop

## Animation Policy

✅ **Allowed:**
- Loading spinners
- Button state transitions
- Fade-in for messages (200ms)
- Slide-up for answers (250ms)

❌ **Forbidden:**
- Typing animations
- Progressive text reveal
- "AI thinking" effects
- Fake streaming

## Configuration

Backend URL can be changed in `src/services/api.js`:

```javascript
const API_BASE_URL = 'http://localhost:8000';
```

## License

MIT
