import { useState, useEffect } from 'react';
import { getDocuments, deleteDocument, streamQuery, queryDocuments } from './services/api';
import FileUpload from './components/FileUpload';
import QuestionInput from './components/QuestionInput';
import AnswerDisplay from './components/AnswerDisplay';
import ConversationHistory from './components/ConversationHistory';
import LoadingOverlay from './components/LoadingOverlay';
import Toast from './components/Toast';

function App() {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [currentAnswer, setCurrentAnswer] = useState(null);
  const [isQuerying, setIsQuerying] = useState(false);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [toast, setToast] = useState({ message: null, type: 'error' });

  useEffect(() => {
    fetchDocuments();
  }, []);

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
      showToast(`Deleted ${filename}`, 'success');
    } catch (error) {
      console.error("Failed to delete document:", error);
      showToast(`Failed to delete ${filename}: ${error.message}`, 'error');
    }
  };

  const handleQueryStart = async (question) => {
    setIsQuerying(true);
    setCurrentAnswer({
      answer: "",
      question: question,
      num_chunks_retrieved: 0,
      retrieved_chunks: []
    });

    try {
      const fullText = await streamQuery(
        question,
        (currentText) => {
          // Update UI with accumulated text during streaming
          setCurrentAnswer(prev => ({
            ...prev,
            answer: currentText
          }));
        }
      );

      // Streaming success - add to history
      setIsQuerying(false);
      const newHistoryItem = {
        id: Date.now().toString(),
        question: question,
        answer: fullText,
        retrieved_chunks: [], // Not available from streamQuery callback
        num_chunks_retrieved: 0, // Not available from streamQuery callback
        timestamp: new Date().toISOString(),
        isRefusal: fullText.includes("cannot answer")
      };
      setConversationHistory(prev => [newHistoryItem, ...prev].slice(0, 50));

    } catch (error) {
      console.warn("Streaming failed, attempting fallback...", error);

      try {
        // Fallback to normal query
        const result = await queryDocuments(question);

        setIsQuerying(false);
        setCurrentAnswer(result);

        const newHistoryItem = {
          id: Date.now().toString(),
          question: result.question,
          answer: result.answer,
          retrieved_chunks: result.retrieved_chunks,
          num_chunks_retrieved: result.num_chunks_retrieved,
          timestamp: new Date().toISOString(),
          isRefusal: result.answer.includes("cannot answer")
        };
        setConversationHistory(prev => [newHistoryItem, ...prev].slice(0, 50));

      } catch (fallbackError) {
        console.error("Fallback failed:", fallbackError);
        showToast("Failed to generate answer", 'error');
        setIsQuerying(false);
        setCurrentAnswer(null);
      }
    }
  };

  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear the conversation history?')) {
      setConversationHistory([]);
    }
  };

  return (
    <div className="h-full w-full flex flex-col text-cyber-text font-sans selection:bg-cyber-primary selection:text-cyber-darker overflow-hidden">
      <LoadingOverlay isLoading={isQuerying} />
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={closeToast}
      />

      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-[-1]">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-cyber-primary/10 rounded-full blur-[120px] opacity-20"></div>
        <div className="absolute bottom-0 right-0 w-[600px] h-[400px] bg-cyber-secondary/10 rounded-full blur-[100px] opacity-20"></div>
      </div>

      {/* Main Layout Container */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden w-full relative">

        {/* Left Column: Main Content (Files + Q&A) */}
        <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative z-0">
          <div className="flex-none py-4 sm:py-6 text-center border-b border-cyber-primary/10 bg-cyber-darker/30 backdrop-blur-sm">
            <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyber-primary to-cyber-secondary tracking-tight drop-shadow-[0_0_10px_rgba(0,212,255,0.3)]">
              RAG TERMINAL
            </h1>
            <p className="text-cyber-text/60 text-xs sm:text-sm uppercase tracking-widest mt-1">
              Advanced Document Analysis System
            </p>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 sm:p-4 lg:p-6">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 max-w-[1600px] mx-auto w-full">

              {/* File Upload Section */}
              <div className="xl:col-span-1 flex flex-col gap-6">
                <FileUpload onUploadSuccess={handleUploadSuccess} />

                {uploadedFiles.length > 0 && (
                  <div className="bg-cyber-darker/50 backdrop-blur-md border border-cyber-primary/20 rounded-xl p-4 shadow-lg shadow-cyber-primary/5">
                    <div className="flex items-center justify-between mb-4 border-b border-cyber-primary/20 pb-2">
                      <h3 className="text-cyber-primary font-semibold tracking-wide flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-cyber-primary shadow-[0_0_8px_rgba(0,212,255,0.8)]"></span>
                        DATA_MODULES
                      </h3>
                      <span className="text-xs text-cyber-text/50 bg-cyber-primary/10 px-2 py-0.5 rounded font-mono">
                        {uploadedFiles.length}
                      </span>
                    </div>
                    <ul className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                      {uploadedFiles.map((file, index) => (
                        <li key={index} className="group flex items-center justify-between bg-cyber-darker/80 p-3 rounded-lg border border-white/5 hover:border-cyber-primary/40 transition-all duration-300 hover:shadow-[0_0_15px_rgba(0,212,255,0.1)]">
                          <span className="text-sm truncate max-w-[180px] text-cyber-text/80 group-hover:text-cyber-primary transition-colors">
                            {file}
                          </span>
                          <button
                            onClick={() => handleDelete(file)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-cyber-secondary hover:bg-cyber-secondary/20 rounded transition-all duration-300"
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
                <div className="flex-none sticky top-0 z-10 bg-transparent">
                  <QuestionInput
                    onQueryStart={handleQueryStart}
                    disabled={uploadedFiles.length === 0}
                    isLoading={isQuerying}
                  />
                </div>

                <div className="min-h-[200px]">
                  <AnswerDisplay
                    answer={currentAnswer}
                    isLoading={isQuerying}
                  />
                </div>
              </div>

            </div>
          </div>
        </main>

        {/* Right Column: Logs Panel (Sidebar) */}
        <aside className="w-full lg:w-80 xl:w-96 flex-none h-[40vh] lg:h-full border-t lg:border-t-0 lg:border-l border-cyber-primary/10 bg-cyber-darker/50 backdrop-blur-md overflow-hidden z-20">
          <ConversationHistory
            history={conversationHistory}
            onClearHistory={handleClearHistory}
          />
        </aside>

      </div>

      <footer className="fixed bottom-0 left-0 w-full text-center py-1 text-[10px] text-cyber-text/30 pointer-events-none z-50 mix-blend-screen">
        SYSTEM_VERSION_2.0 // CYBER_CORE_INIT // RAG_BACKEND_CONNECTED
      </footer>
    </div>
  );
}

export default App;
