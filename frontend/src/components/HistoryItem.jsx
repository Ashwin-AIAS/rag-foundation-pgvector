import { useState } from 'react';
import './HistoryItem.css';

/**
 * HistoryItem Component
 * 
 * Displays a single Q&A pair from conversation history.
 * 
 * CRITICAL: This component displays answers exactly as returned.
 * - No summarization or rewriting
 * - Refusals preserved verbatim
 * - No re-querying when clicked
 */
export default function HistoryItem({ item }) {
    const [isExpanded, setIsExpanded] = useState(false);

    const formatTimestamp = (isoString) => {
        const date = new Date(isoString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;

        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;

        return date.toLocaleDateString();
    };

    const toggleExpanded = () => {
        setIsExpanded(!isExpanded);
    };

    return (
        <div
            className={`history-item ${item.isRefusal ? 'refusal' : ''} ${isExpanded ? 'expanded' : ''}`}
            onClick={toggleExpanded}
        >
            <div className="history-header">
                <div className="history-question">
                    {item.isRefusal && <span className="refusal-icon">⚠️</span>}
                    {item.question}
                </div>
                <div className="history-timestamp">
                    {formatTimestamp(item.timestamp)}
                </div>
            </div>

            {!isExpanded && (
                <div className="history-answer-preview">
                    {item.answer.substring(0, 100)}
                    {item.answer.length > 100 ? '...' : ''}
                </div>
            )}

            {isExpanded && (
                <div className="history-full-content">
                    <div className="history-answer-full">
                        <strong>Answer:</strong>
                        <p>{item.answer}</p>
                    </div>

                    {item.num_chunks_retrieved > 0 && item.retrieved_chunks && (
                        <div className="history-sources">
                            <strong>Sources ({item.num_chunks_retrieved}):</strong>
                            <div className="history-sources-list">
                                {item.retrieved_chunks.map((chunk, index) => (
                                    <div key={index} className="history-source-item">
                                        <div className="history-source-header">
                                            <span className="history-source-file">{chunk.source_file}</span>
                                            <span className="history-source-score">
                                                {(chunk.similarity_score * 100).toFixed(0)}% relevant
                                            </span>
                                        </div>
                                        <div className="history-source-text">
                                            {chunk.chunk_text.substring(0, 150)}
                                            {chunk.chunk_text.length > 150 ? '...' : ''}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
