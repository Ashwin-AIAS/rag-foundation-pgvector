import { useState, useEffect, useRef, useCallback } from 'react';
import { getDocuments, deleteDocument, streamQuery, queryDocuments } from './services/api';
import FileUpload from './components/FileUpload';
import QuestionInput from './components/QuestionInput';
import AnswerDisplay from './components/AnswerDisplay';
import ConversationHistory from './components/ConversationHistory';
import DocumentSelector from './components/DocumentSelector';
import AdminAnalytics from './components/AdminAnalytics';
import LoadingOverlay from './components/LoadingOverlay';
import Toast from './components/Toast';
import AnimatedBackground from './components/AnimatedBackground';
import CyberCursor from './components/CyberCursor';
import CommandPalette from './components/CommandPalette';
import { motion, AnimatePresence } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden:  { opacity: 0, y: 24, scale: 0.98 },
  visible: { opacity: 1, y: 0,  scale: 1,
    transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }
  },
};

// --- localStorage helpers ---
const STORAGE_KEY = 'rag_conversation_history';
const MAX_PERSISTED = 20;

function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_PERSISTED) : [];
  } catch { return []; }
}

function saveHistory(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_PERSISTED)));
  } catch (e) {
    console.warn('Failed to persist conversation history:', e);
  }
}

function App() {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [currentAnswer, setCurrentAnswer] = useState(null);
  const [isQuerying, setIsQuerying] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [conversationHistory, setConversationHistory] = useState(() => loadHistory());
  const [selectedDocs, setSelectedDocs] = useState([]);
  const [confidence, setConfidence] = useState(null);
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false);
  const [toast, setToast] = useState({ message: null, type: 'error' });

  // Ref for cancelling in-flight requests
  const abortControllerRef = useRef(null);
  // Ref for auto-scrolling to the answer
  const answerRef = useRef(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Persist conversation to localStorage whenever it changes
  useEffect(() => {
    saveHistory(conversationHistory);
  }, [conversationHistory]);

  // Auto-scroll whenever currentAnswer updates
  useEffect(() => {
    if (currentAnswer?.answer && answerRef.current) {
      answerRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentAnswer?.answer]);

  const showToast = (message, type = 'error') => {
    setToast({ message, type });
  };

  const closeToast = () => {
    setToast({ ...toast, message: null });
  };

  const fetchDocuments = async () => {
    setIsLoadingDocs(true);
    try {
      const data = await getDocuments();
      const filenames = data.documents.map(doc => doc.filename);
      setUploadedFiles(filenames);
    } catch (error) {
      console.error("Failed to fetch documents:", error);
      showToast("Failed to connect to backend", 'error');
    } finally {
      setIsLoadingDocs(false);
    }
  };

  const handleUploadSuccess = () => {
    fetchDocuments();
    showToast("Document ingested successfully", 'success');
  };

  const handleDelete = async (filename) => {
    if (!window.confirm(`Are you sure you want to delete "${filename}"? This cannot be undone.`)) {
      return;
    }

    try {
      await deleteDocument(filename);
      setUploadedFiles(prev => prev.filter(f => f !== filename));
      // Remove from selectedDocs if present
      setSelectedDocs(prev => prev.filter(d => d !== filename));
      showToast(`Deleted ${filename}`, 'success');
    } catch (error) {
      console.error("Failed to delete document:", error);
      showToast(`Failed to delete ${filename}: ${error.message}`, 'error');
    }
  };

  const handleQueryStart = useCallback(async (question) => {
    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsQuerying(true);
    setIsThinking(true);
    setIsStreaming(false);
    setConfidence(null);
    setCurrentAnswer({
      answer: "",
      question: question,
      num_chunks_retrieved: 0,
      retrieved_chunks: []
    });

    const docsFilter = selectedDocs.length > 0 ? selectedDocs : [];
    const MAX_RETRIES = 2;
    let lastError = null;

    // Retry loop for streaming
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      if (controller.signal.aborted) return;

      try {
        let receivedFirstToken = false;
        const fullText = await streamQuery(
          question,
          (currentText) => {
            if (!receivedFirstToken) {
              receivedFirstToken = true;
              setIsThinking(false);
              setIsStreaming(true);
            }
            setCurrentAnswer(prev => ({
              ...prev,
              answer: currentText
            }));
          },
          controller.signal,
          docsFilter,
          (score) => setConfidence(score)
        );

        if (typeof fullText === 'object') {
          // It's a structured response (Table), not a text stream
          receivedFirstToken = true;
          setIsThinking(false);
          setIsStreaming(false);
          setCurrentAnswer(fullText);
          if (fullText.confidence != null) setConfidence(fullText.confidence);

          const newHistoryItem = {
            id: Date.now().toString(),
            question: question,
            answer: fullText.answer,
            retrieved_chunks: fullText.retrieved_chunks,
            num_chunks_retrieved: fullText.num_chunks_retrieved,
            timestamp: new Date().toISOString(),
            isRefusal: false,
            answer_type: fullText.answer_type,
            rows: fullText.rows,
            columns: fullText.columns
          };
          setConversationHistory(prev => [newHistoryItem, ...prev].slice(0, 50));
          setIsQuerying(false);
          return;
        }

        if (controller.signal.aborted) return;

        // Streaming success — validate we got a real answer
        const finalAnswer = (fullText || '').trim();
        const FALLBACK_MSG =
          "⚠️ No answer could be generated from the selected documents.\n\n" +
          "Try:\n" +
          "• Selecting more documents\n" +
          "• Asking a more specific question\n" +
          "• Checking document filter settings";

        if (!finalAnswer || finalAnswer.length < 20) {
          console.warn('Stream completed but answer was empty or too short.');
          setCurrentAnswer(prev => ({
            ...prev,
            answer: FALLBACK_MSG,
          }));
        }

        setIsQuerying(false);
        setIsThinking(false);
        setIsStreaming(false);

        const displayAnswer = (!finalAnswer || finalAnswer.length < 20) ? FALLBACK_MSG : fullText;
        const newHistoryItem = {
          id: Date.now().toString(),
          question: question,
          answer: displayAnswer,
          retrieved_chunks: [],
          num_chunks_retrieved: 0,
          timestamp: new Date().toISOString(),
          isRefusal: displayAnswer.includes("do not contain enough information") || displayAnswer.startsWith("⚠️")
        };
        setConversationHistory(prev => [newHistoryItem, ...prev].slice(0, 50));
        return;

      } catch (error) {
        if (error.name === 'AbortError' || controller.signal.aborted) return;
        lastError = error;
        console.warn(`Streaming attempt ${attempt + 1}/${MAX_RETRIES} failed:`, error);
        if (attempt < MAX_RETRIES - 1) {
          await new Promise(r => setTimeout(r, 800));
        }
      }
    }

    // All retries exhausted — fall back to non-streaming
    if (controller.signal.aborted) return;
    console.warn("All streaming retries failed, attempting non-streaming fallback...", lastError);

    try {
      setIsThinking(true);
      setIsStreaming(false);
      const result = await queryDocuments(question, null, docsFilter);

      if (controller.signal.aborted) return;

      setIsQuerying(false);
      setIsThinking(false);
      setCurrentAnswer(result);
      if (result.confidence != null) setConfidence(result.confidence);

      const newHistoryItem = {
        id: Date.now().toString(),
        question: result.question,
        answer: result.answer,
        retrieved_chunks: result.retrieved_chunks,
        num_chunks_retrieved: result.num_chunks_retrieved,
        timestamp: new Date().toISOString(),
        isRefusal: result.answer.includes("do not contain enough information")
      };
      setConversationHistory(prev => [newHistoryItem, ...prev].slice(0, 50));

    } catch (fallbackError) {
      if (controller.signal.aborted) return;
      console.error("Fallback failed:", fallbackError);
      showToast("Failed to generate answer", 'error');
      setIsQuerying(false);
      setIsThinking(false);
      setIsStreaming(false);
      setCurrentAnswer(null);
    }
  }, [selectedDocs]);

  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear the conversation history?')) {
      setConversationHistory([]);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const handleSelectQuery = useCallback((questionText) => {
    handleQueryStart(questionText);
  }, [handleQueryStart]);

  return (
    <div className="h-full w-full flex flex-col overflow-hidden" style={{ background: '#000000', color: '#f5f5f7' }}>
      <CyberCursor />
      <CommandPalette
        isOpen={cmdPaletteOpen}
        onClose={() => setCmdPaletteOpen(false)}
        conversationHistory={conversationHistory}
        uploadedFiles={uploadedFiles}
        onClearHistory={handleClearHistory}
        onSelectQuery={handleSelectQuery}
      />
      <LoadingOverlay isLoading={isQuerying} />
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={closeToast}
      />



      {/* Main Layout Container */}
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex-1 flex flex-col lg:flex-row overflow-hidden w-full relative">

        {/* Left Column: Main Content (Files + Q&A) */}
        <motion.main variants={itemVariants} className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative z-0 p-4">
          <div className="flex-none py-5 sm:py-7 text-center" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
            <h1 className="font-display font-bold tracking-[-0.04em]" style={{ fontSize: 'clamp(26px,4vw,38px)', color: '#f5f5f7', letterSpacing: '-0.04em' }}>
              RAG TERMINAL
            </h1>
            <p className="apple-caption mt-2">
              Advanced Document Analysis System
            </p>
            <button
              onClick={() => setCmdPaletteOpen(true)}
              data-cursor-hover="true"
              className="mt-2 apple-caption apple-btn apple-btn-ghost px-3 py-1 text-[10px]"
            >
              ⌘K command palette
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-5 lg:p-7">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 max-w-[1600px] mx-auto w-full">

              {/* File Upload + Document Selector Section */}
              <div className="xl:col-span-1 flex flex-col gap-6 p-4">
                <FileUpload onUploadSuccess={handleUploadSuccess} />

                {/* Document Selector */}
                <DocumentSelector
                  documents={uploadedFiles}
                  selectedDocs={selectedDocs}
                  onSelectionChange={setSelectedDocs}
                />

                {uploadedFiles.length > 0 && (
                  <div className="apple-card p-4">
                    <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-2">
                      <h3 className="apple-caption flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(245,245,247,0.4)' }}></span>
                        DATA_MODULES
                      </h3>
                      <span className="doc-selector-badge">
                        {uploadedFiles.length}
                      </span>
                    </div>
                    <ul className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                      {uploadedFiles.map((file, index) => (
                        <li key={index} className="group flex items-center justify-between p-3 rounded-xl transition-all duration-200" style={{ background: 'rgba(255,255,255,0.02)', border: '0.5px solid transparent' }} onMouseEnter={(e) => e.currentTarget.style.borderColor='rgba(255,255,255,0.1)'} onMouseLeave={(e) => e.currentTarget.style.borderColor='transparent'}>
                          <span className="text-sm truncate max-w-[180px] transition-colors" style={{ color: 'rgba(245,245,247,0.65)' }}>
                            {file}
                          </span>
                          <button
                            onClick={() => handleDelete(file)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all duration-200" style={{ color: 'rgba(245,245,247,0.4)' }}
                            title="Delete Protocol"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Q&A Section */}
              <div className="xl:col-span-2 flex flex-col gap-6">
                <div className="flex-none sticky top-0 z-10 bg-transparent p-4">
                  <QuestionInput
                    onQueryStart={handleQueryStart}
                    disabled={uploadedFiles.length === 0}
                    isLoading={isQuerying}
                  />
                </div>

                <div ref={answerRef} className="min-h-[200px] p-4">
                  <AnimatePresence mode="wait">
                    {(currentAnswer || isQuerying) && (
                      <motion.div
                        key={currentAnswer?.question || 'loading'}
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        exit={{ opacity: 0, y: -10, transition: { duration: 0.2 } }}
                      >
                        <AnswerDisplay
                          answer={currentAnswer}
                          isLoading={isQuerying}
                          isThinking={isThinking}
                          isStreaming={isStreaming}
                          confidence={confidence}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

            </div>
          </div>
        </motion.main>

        {/* Right Column: Logs Panel (Sidebar) */}
        <motion.aside variants={itemVariants} className="w-full lg:w-[260px] xl:w-[280px] flex-none h-[40vh] lg:h-full overflow-hidden z-20" style={{ borderTop: '0.5px solid rgba(255,255,255,0.08)', borderLeft: '0.5px solid rgba(255,255,255,0.08)', background: '#161617' }}>
          <ConversationHistory
            history={conversationHistory}
            onClearHistory={handleClearHistory}
          />
          <AdminAnalytics />
        </motion.aside>

      </motion.div>

      <footer className="fixed bottom-0 left-0 w-full text-center py-1 pointer-events-none z-50 apple-caption" style={{ opacity: 0.25 }}>
        SYSTEM_VERSION_2.0 // CYBER_CORE_INIT // RAG_BACKEND_CONNECTED
      </footer>
    </div>
  );
}

export default App;
