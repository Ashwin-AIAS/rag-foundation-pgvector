import { useState, useEffect } from 'react';
import { getDocuments, deleteDocument } from './services/api';
import FileUpload from './components/FileUpload';
import QuestionInput from './components/QuestionInput';
import AnswerDisplay from './components/AnswerDisplay';
import ConversationHistory from './components/ConversationHistory';
// Removed App.css import

function App() {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [currentAnswer, setCurrentAnswer] = useState(null);
  const [isQuerying, setIsQuerying] = useState(false);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [conversationHistory, setConversationHistory] = useState([]);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setIsLoadingDocs(true);
    try {
      const data = await getDocuments();
      // extracting filenames from the array of objects returned by backend
      const filenames = data.documents.map(doc => doc.filename);
      setUploadedFiles(filenames);
    } catch (error) {
      console.error("Failed to fetch documents:", error);
    } finally {
      setIsLoadingDocs(false);
    }
  };

  const handleUploadSuccess = () => {
    fetchDocuments();
  };

  const handleDelete = async (filename) => {
    if (!window.confirm(`Are you sure you want to delete "${filename}"? This cannot be undone.`)) {
      return;
    }

    setDeleteError(null);
    try {
      await deleteDocument(filename);
      // Optimistic update or refetch
      setUploadedFiles(prev => prev.filter(f => f !== filename));
    } catch (error) {
      console.error("Failed to delete document:", error);
      setDeleteError(`Failed to delete ${filename}`);
      alert(`Error: ${error.message}`);
    }
  };

  const handleQuerySuccess = (result) => {
    setCurrentAnswer(result);
    setIsQuerying(false);

    // Add to conversation history
    const newHistoryItem = {
      id: Date.now().toString(),
      question: result.question,
      answer: result.answer,
      retrieved_chunks: result.retrieved_chunks,
      num_chunks_retrieved: result.num_chunks_retrieved,
      timestamp: new Date().toISOString(),
      isRefusal: result.num_chunks_retrieved === 0 || result.answer.includes('cannot answer')
    };

    // Add to history (newest first), limit to 50 items
    setConversationHistory(prev => [newHistoryItem, ...prev].slice(0, 50));
  };

  const handleQueryStart = () => {
    setIsQuerying(true);
    setCurrentAnswer(null);
  };

  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear the conversation history?')) {
      setConversationHistory([]);
    }
  };

  return (
    <div className="min-h-screen text-cyber-text font-sans selection:bg-cyber-primary selection:text-cyber-darker overflow-x-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-[-1]">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-cyber-primary/10 rounded-full blur-[120px] opacity-20"></div>
        <div className="absolute bottom-0 right-0 w-[600px] h-[400px] bg-cyber-secondary/10 rounded-full blur-[100px] opacity-20"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-screen flex flex-col md:flex-row gap-6">
        {/* Main Content Area */}
        <main className="flex-1 flex flex-col gap-6 h-full overflow-hidden">
          <header className="flex flex-col items-center justify-center py-6 text-center">
            <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyber-primary to-cyber-secondary tracking-tight mb-2 drop-shadow-[0_0_10px_rgba(0,212,255,0.3)]">
              RAG TERMINAL
            </h1>
            <p className="text-cyber-text/60 text-sm uppercase tracking-widest border-b border-cyber-primary/20 pb-2 px-8">
              Advanced Document Analysis System
            </p>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden">
            {/* Left Column: Upload & Files */}
            <div className="lg:col-span-1 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
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
                  <ul className="space-y-2">
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

            {/* Middle & Right Column: Q&A */}
            <div className="lg:col-span-2 flex flex-col gap-6 h-full overflow-hidden">
              <div className="flex-none">
                <QuestionInput
                  onQuerySuccess={handleQuerySuccess}
                  onQueryStart={handleQueryStart}
                  disabled={uploadedFiles.length === 0}
                />
              </div>

              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-[300px]">
                <AnswerDisplay
                  answer={currentAnswer}
                  isLoading={isQuerying}
                />
              </div>
            </div>
          </div>
        </main>

        {/* Sidebar: History */}
        <aside className="w-full md:w-80 lg:w-96 flex-none h-full overflow-hidden border-l border-cyber-primary/10 pl-0 md:pl-6">
          <ConversationHistory
            history={conversationHistory}
            onClearHistory={handleClearHistory}
          />
        </aside>
      </div>

      <footer className="fixed bottom-0 w-full text-center py-2 text-[10px] text-cyber-text/30 pointer-events-none z-50">
        SYSTEM_VERSION_2.0 // CYBER_CORE_INIT // RAG_BACKEND_CONNECTED
      </footer>
    </div>
  );
}
