import FeedbackButtons from './FeedbackButtons';
import './AnswerDisplay.css';

export default function AnswerDisplay({ answer, isLoading }) {
    // Empty state
    if (!answer && !isLoading) {
        return (
            <div className="answer-display">
                <h2>Answer</h2>
                <div className="empty-state">
                    Your answer will appear here
                </div>
            </div>
        );
    }

    // Loading state
    if (isLoading) {
        return (
            <div className="answer-display">
                <h2>Answer</h2>
                <div className="loading-state">
                    <span className="spinner"></span>
                    <p>Searching documents...</p>
                </div>
            </div>
        );
    }

    // Determine if this is a refusal
    const isRefusal = answer.answer.includes('cannot answer') ||
        answer.num_chunks_retrieved === 0;

    return (
        <div className="answer-display">
            <h2>Answer</h2>
            <div className={`answer-content slide-up ${isRefusal ? 'refusal' : 'success'}`}>
                <div className="answer-text">
                    {answer.answer}
                </div>

                {answer.num_chunks_retrieved > 0 && (
                    <div className="sources-section">
                        <h3>Sources ({answer.num_chunks_retrieved})</h3>
                        <div className="sources-list">
                            {answer.retrieved_chunks.map((chunk, index) => (
                                <div key={index} className="source-item">
                                    <div className="source-header">
                                        <span className="source-file">{chunk.source_file}</span>
                                        <span className="source-score">
                                            {(chunk.similarity_score * 100).toFixed(0)}% relevant
                                        </span>
                                    </div>
                                    <div className="source-text">
                                        {chunk.chunk_text.substring(0, 200)}
                                        {chunk.chunk_text.length > 200 ? '...' : ''}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Feedback buttons - shown for all answers including refusals */}
                <FeedbackButtons
                    question={answer.question}
                    answer={answer.answer}
                    numChunksRetrieved={answer.num_chunks_retrieved}
                />
            </div>
        </div>
    );
}
