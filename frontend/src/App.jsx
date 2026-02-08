import { useState } from 'react';
import FileUpload from './components/FileUpload';
import QuestionInput from './components/QuestionInput';
import AnswerDisplay from './components/AnswerDisplay';
import './App.css';

function App() {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [currentAnswer, setCurrentAnswer] = useState(null);
  const [isQuerying, setIsQuerying] = useState(false);

  const handleUploadSuccess = (filename) => {
    setUploadedFiles(prev => [...prev, filename]);
  };

  const handleQuerySuccess = (result) => {
    setCurrentAnswer(result);
    setIsQuerying(false);
  };

  const handleQueryStart = () => {
    setIsQuerying(true);
    setCurrentAnswer(null);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>RAG Document Q&A</h1>
        <p>Upload documents and ask questions based on their content</p>
      </header>

      <main className="app-main">
        <div className="upload-section">
          <FileUpload onUploadSuccess={handleUploadSuccess} />

          {uploadedFiles.length > 0 && (
            <div className="uploaded-files">
              <h3>Uploaded Documents ({uploadedFiles.length})</h3>
              <ul>
                {uploadedFiles.map((file, index) => (
                  <li key={index}>{file}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="query-section">
          <QuestionInput
            onQuerySuccess={handleQuerySuccess}
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

      <footer className="app-footer">
        <p>Powered by RAG Backend</p>
      </footer>
    </div>
  );
}

export default App;
