import { useState, useEffect, useRef, useCallback } from 'react';
import { getDocuments, deleteDocument, streamQuery, queryDocuments, getSuggestedQuestions } from './services/api';
import { triggerAudioCue } from './utils/audioCue';
import { extractAudioCues } from './utils/parseResponse';
import { towerAudio } from './services/TowerAudio';
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
import TiltCard from './components/TiltCard';
import { motion, AnimatePresence } from 'framer-motion';

const HERO_STATUS = [
  { name:'STARK',    colour:'#e8824a', delay:0.3  },
  { name:'ROGERS',   colour:'#5b9bd5', delay:0.42 },
  { name:'ODINSON',  colour:'#e8c040', delay:0.54 },
  { name:"T'CHALLA", colour:'#c084fc', delay:0.66 },
  { name:'BANNER',   colour:'#4ade80', delay:0.78 },
];

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
  const [soundOn, setSoundOn] = useState(true);

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

  const handleQueryStart = useCallback(async (question, mode = 'hybrid', heroMode = 'stark') => {
    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    towerAudio.onExecute();

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
            const { displayText } = extractAudioCues(currentText);
            setCurrentAnswer(prev => ({
              ...prev,
              answer: displayText
            }));
          },
          controller.signal,
          docsFilter,
          (score) => setConfidence(score),
          mode,
          heroMode
        );

        if (typeof fullText === 'object') {
          // It's a structured response (Table), not a text stream
          receivedFirstToken = true;
          setIsThinking(false);
          setIsStreaming(false);
          
          const { displayText, cues } = extractAudioCues(fullText.answer);
          const completeCue = cues.find(c => c.state === "complete");
          if (completeCue) triggerAudioCue(completeCue.sound);
          
          fullText.answer = displayText;
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
            columns: fullText.columns,
            retrieval_mode: mode,
            hero_used: heroMode
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

        const displayAnswerRaw = (!finalAnswer || finalAnswer.length < 20) ? FALLBACK_MSG : fullText;
        
        const { displayText: finalDisplayText, cues } = extractAudioCues(displayAnswerRaw);
        const completeCue = cues.find(c => c.state === "complete");
        if (completeCue) triggerAudioCue(completeCue.sound);

        if (finalDisplayText && !finalDisplayText.startsWith('⚠️')) towerAudio.onAnswer();

        // After stream is finished, asynchronously fetch our suggested questions
        if (!finalDisplayText.startsWith('⚠️')) {
            getSuggestedQuestions(
              question,
              finalDisplayText.slice(0, 400),
              docsFilter
            ).then(suggestions => {
                setCurrentAnswer(prev => prev ? {
                    ...prev,
                    suggested_questions: suggestions.suggested_questions
                } : prev);
            }).catch(e => console.warn(e));
        }

        const newHistoryItem = {
          id: Date.now().toString(),
          question: question,
          answer: finalDisplayText,
          retrieved_chunks: [],
          num_chunks_retrieved: 0,
          timestamp: new Date().toISOString(),
          isRefusal: finalDisplayText.includes("do not contain enough information") || finalDisplayText.startsWith("⚠️"),
          retrieval_mode: mode,
          hero_used: heroMode
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
      const result = await queryDocuments(question, null, docsFilter, mode, heroMode);

      if (controller.signal.aborted) return;

      setIsQuerying(false);
      setIsThinking(false);
      
      const { displayText, cues } = extractAudioCues(result.answer);
      const completeCue = cues.find(c => c.state === "complete");
      if (completeCue) triggerAudioCue(completeCue.sound);
      
      result.answer = displayText;
      setCurrentAnswer(result);
      if (result.confidence != null) setConfidence(result.confidence);
      
      if (result.answer && !result.answer.startsWith('⚠️')) towerAudio.onAnswer();

      const newHistoryItem = {
        id: Date.now().toString(),
        question: result.question,
        answer: result.answer,
        retrieved_chunks: result.retrieved_chunks,
        num_chunks_retrieved: result.num_chunks_retrieved,
        timestamp: new Date().toISOString(),
        isRefusal: result.answer.includes("do not contain enough information"),
        retrieval_mode: mode,
        hero_used: heroMode
      };
      setConversationHistory(prev => [newHistoryItem, ...prev].slice(0, 50));

    } catch (fallbackError) {
      if (controller.signal.aborted) return;
      console.error("Fallback failed:", fallbackError);
      showToast("Failed to generate answer", 'error');
      towerAudio.onError();
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

  const handleSuggestionSelect = useCallback((questionText) => {
    handleQueryStart(questionText, 'hybrid');
  }, [handleQueryStart]);

  return (
    <div className="h-full w-full flex flex-col overflow-hidden" style={{ background:'#06060a', color:'#f5f0e8', fontFamily:"'Space Mono', monospace" }}>
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
          <div className="flex-none py-5 sm:py-7 text-center" style={{ borderBottom:'1px solid rgba(245,240,232,0.07)', background:'rgba(14,14,20,0.9)', backdropFilter:'blur(8px)', padding:'14px 0', position:'relative' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:'2px', display:'flex' }}>
              {['#c0391b','#1a4a8a','#c0a030','#8b5cf6','#16a34a'].map((c,i) => (
                <div key={i} style={{ flex:1, background:c, opacity:0.8 }} />
              ))}
            </div>
            <h1 style={{ fontFamily:"'Rajdhani', sans-serif", fontWeight:700, fontSize:'clamp(24px,4vw,36px)', letterSpacing:'0.06em', textTransform:'uppercase', color:'#f5f0e8' }}>
              RAG TERMINAL
            </h1>
            <p className="station-label station-label-iron mt-1">
              AVENGERS TOWER · INTELLIGENCE DIVISION
            </p>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', marginTop:8 }}>
              <button
                onClick={() => setCmdPaletteOpen(true)}
                data-cursor-hover="true"
                className="btn-ghost text-[9px]"
              >
                ⌘K command palette
              </button>
              <motion.button
                whileHover={{ scale:1.05 }}
                whileTap={{ scale:0.95 }}
                onClick={() => setSoundOn(towerAudio.toggle())}
                style={{
                  padding:'3px 10px', borderRadius:3, cursor:'pointer',
                  background: soundOn ? 'rgba(192,57,27,0.1)' : 'rgba(245,240,232,0.04)',
                  border: soundOn ? '1px solid rgba(192,57,27,0.3)' : '1px solid rgba(245,240,232,0.1)',
                  fontFamily:"'Rajdhani', sans-serif", fontWeight:700, fontSize:9,
                  letterSpacing:'0.12em', color: soundOn ? '#e8824a' : 'rgba(245,240,232,0.3)',
                  marginLeft: 8,
                }}
              >
                {soundOn ? '♪ SFX' : '♪ MUTE'}
              </motion.button>
            </div>
            
            <motion.div
              initial={{ opacity:0, y:6 }}
              animate={{ opacity:1, y:0 }}
              className="flex justify-center flex-wrap gap-4 sm:gap-6 mt-4 pt-4 border-t"
              style={{ borderColor:'rgba(192,57,27,0.15)' }}
            >
              {HERO_STATUS.map((h) => (
                <div key={h.name} className="flex items-center gap-2">
                  <span style={{
                    width:6, height:6, borderRadius:'50%', background:h.colour,
                    boxShadow:`0 0 8px ${h.colour}`,
                    animation:`hero-pulse 2s ease-in-out ${h.delay}s infinite`
                  }}/>
                  <span style={{
                    fontFamily:"'Rajdhani', sans-serif", fontSize:10, fontWeight:700,
                    letterSpacing:'0.1em', color:h.colour
                  }}>
                    {h.name} <span style={{ opacity:0.5 }}>ONLINE</span>
                  </span>
                </div>
              ))}
            </motion.div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-5 lg:p-7">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 max-w-[1600px] mx-auto w-full">

              {/* File Upload + Document Selector Section */}
              <div className="xl:col-span-1 flex flex-col gap-6">
                <div className="station-card station-hulk p-4">
                  <FileUpload onUploadSuccess={handleUploadSuccess} />
                </div>

                {/* Document Selector */}
                <div className="station-card station-hulk">
                  <DocumentSelector
                    documents={uploadedFiles}
                    selectedDocs={selectedDocs}
                    onSelectionChange={setSelectedDocs}
                  />
                </div>

                {uploadedFiles.length > 0 && (
                  <div className="station-card station-hulk p-4">
                    <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-2">
                      <h3 className="station-label station-label-hulk flex items-center gap-2">
                        <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--av-hulk)', display:'inline-block' }}></span>
                        DATA MODULES
                      </h3>
                      <span className="doc-selector-badge">
                        {uploadedFiles.length}
                      </span>
                    </div>
                    <motion.ul 
                      initial="hidden" animate="visible"
                      variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
                      className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar"
                    >
                      {uploadedFiles.map((file, index) => (
                        <motion.li 
                          key={index} 
                          variants={{ hidden: { opacity: 0, x: -16 }, visible: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 300, damping: 25 } } }}
                          className="group flex items-center justify-between transition-all duration-200" style={{ background:'rgba(22,163,74,0.03)', borderLeft:'1px solid rgba(22,163,74,0.12)', marginBottom:3, padding:'7px 12px', transition:'all 0.15s', fontFamily:"'Space Mono', monospace", fontSize:11, color:'rgba(245,240,232,0.65)' }} onMouseEnter={(e) => { e.currentTarget.style.borderLeftColor = 'rgba(22,163,74,0.45)'; e.currentTarget.style.color = '#4ade80'; }} onMouseLeave={(e) => { e.currentTarget.style.borderLeftColor = 'rgba(22,163,74,0.12)'; e.currentTarget.style.color = 'rgba(245,240,232,0.65)'; }}>
                          <span className="truncate max-w-[180px] transition-colors" style={{ color: 'rgba(255,212,184,0.65)' }}>
                            {file}
                          </span>
                          <button
                            onClick={() => handleDelete(file)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all duration-200" style={{ color: 'rgba(22,163,74,0.5)' }} onMouseEnter={(e)=>e.currentTarget.style.color='#ef4444'} onMouseLeave={(e)=>e.currentTarget.style.color='rgba(22,163,74,0.5)'}
                            title="Delete Protocol"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </motion.li>
                      ))}
                    </motion.ul>
                  </div>
                )}
              </div>

              {/* Q&A Section */}
              <div className="xl:col-span-2 flex flex-col gap-6">
                <div className="flex-none sticky top-0 z-10 bg-transparent p-4 station-card station-cap">
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
                        initial={{ clipPath: 'inset(0 0 100% 0)' }}
                        animate={{ clipPath: 'inset(0 0 0% 0)', transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } }}
                        exit={{ clipPath: 'inset(0 0 100% 0)', opacity: 0, transition: { duration: 0.3 } }}
                      >
                          <AnswerDisplay
                            answer={currentAnswer}
                            isLoading={isQuerying}
                            isThinking={isThinking}
                            isStreaming={isStreaming}
                            confidence={confidence}
                            onSelectSuggestion={handleSuggestionSelect}
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
        <motion.aside variants={itemVariants} className="w-full lg:w-[260px] xl:w-[280px] flex-none h-[40vh] lg:h-full overflow-hidden z-20 station-panther" style={{ borderLeft:'1px solid rgba(245,240,232,0.07)', background:'#0e0e14' }}>
          <ConversationHistory
            history={conversationHistory}
            onClearHistory={handleClearHistory}
          />
          <AdminAnalytics />
        </motion.aside>

      </motion.div>

      <footer className="fixed bottom-0 left-0 w-full text-center pointer-events-none z-50" style={{ fontFamily:"'Rajdhani', sans-serif", fontSize:9, letterSpacing:'0.16em', textTransform:'uppercase', textAlign:'center', padding:'5px 0', color:'rgba(245,240,232,0.18)', borderTop:'1px solid rgba(245,240,232,0.06)' }}>
        AVENGERS TOWER · SYSTEMS ONLINE · EARTH'S MIGHTIEST INTELLIGENCE
      </footer>
    </div>
  );
}

export default App;
