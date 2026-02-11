import { useState, useEffect } from 'react';
import { getDocuments, deleteDocument } from './services/api';
import FileUpload from './components/FileUpload';
import QuestionInput from './components/QuestionInput';
import AnswerDisplay from './components/AnswerDisplay';
import ConversationHistory from './components/ConversationHistory';
import './App.css';

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
    <div className="app">
      <header className="app-header">
        <h1>RAG Document Q&A</h1>
        <p>Upload documents and ask questions based on their content</p>
      </header>

      <div className="app-container">
        <main className="app-main">
          <div className="upload-section">
            <FileUpload onUploadSuccess={handleUploadSuccess} />

            {uploadedFiles.length > 0 && (
              <div className="uploaded-files">
                <h3>Uploaded Documents ({uploadedFiles.length})</h3>
                <ul>
                  {uploadedFiles.map((file, index) => (
                    <li key={index} className="document-item">
                      <span className="document-name">{file}</span>
                      <button
                        onClick={() => handleDelete(file)}
                        className="delete-btn"
                        title="Delete document"
                      >
                        Delete
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="query-section">
            <QuestionInput
              onQuerySuccess={handleQuerySuccess}
              onQueryStart={handleQueryStart}
              disabled={uploadedFiles.length === 0}
            />
          </div>

          <div className="answer-section">
            <AnswerDisplay
              answer={currentAnswer}
              isLoading={isQuerying}
            />
          </div>
        </main>

        <aside className="app-sidebar">
          <ConversationHistory
            history={conversationHistory}
            onClearHistory={handleClearHistory}
          />
        </aside>
      </div>

      <footer className="app-footer">
        <p>Powered by RAG Backend</p>
      </footer>
    </div>
  );
}

export default App;
