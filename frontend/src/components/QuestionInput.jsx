import { useState } from 'react';
import { queryDocuments } from '../services/api';
import './QuestionInput.css';

export default function QuestionInput({ onQuerySuccess, disabled }) {
    const [question, setQuestion] = useState('');
    const [isQuerying, setIsQuerying] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate question
        if (!question.trim()) {
            setError('Question cannot be empty');
            return;
        }

        setError(null);
        setIsQuerying(true);

        try {
            const result = await queryDocuments(question);
            onQuerySuccess(result);
            setQuestion(''); // Clear input after successful query
        } catch (err) {
            setError(err.message);
        } finally {
            setIsQuerying(false);
        }
    };

    return (
        <div className="question-input">
            <h2>Ask a Question</h2>
            <form onSubmit={handleSubmit}>
                <div className="input-container">
                    <input
                        type="text"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder="What would you like to know?"
                        disabled={isQuerying || disabled}
                        className="question-field"
                    />
                    <button
                        type="submit"
                        disabled={isQuerying || disabled || !question.trim()}
                        className="submit-button"
                    >
                        {isQuerying ? (
                            <>
                                <span className="spinner"></span>
                                Querying...
                            </>
                        ) : (
                            'Ask'
                        )}
                    </button>
                </div>

                {disabled && (
                    <p className="info-message">
                        Upload a document first to ask questions
                    </p>
                )}

                {error && (
                    <div className="error-message fade-in">
                        ✗ {error}
                    </div>
                )}
            </form>
        </div>
    );
}
