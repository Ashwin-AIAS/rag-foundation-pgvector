import HistoryItem from './HistoryItem';
import './ConversationHistory.css';

/**
 * ConversationHistory Component
 * 
 * Displays a list of past Q&A pairs from the conversation.
 * 
 * CRITICAL: This component is for observation only.
 * - No re-querying when viewing history
 * - Answers displayed exactly as returned
 * - Refusals clearly marked and preserved
 * - No persistence across page reloads
 */
export default function ConversationHistory({ history, onClearHistory }) {
    if (history.length === 0) {
        return (
            <div className="conversation-history">
                <div className="history-header">
                    <h3>Conversation History</h3>
                </div>
                <div className="history-empty">
                    <p>No conversation history yet.</p>
                    <p className="history-empty-hint">Ask a question to start building your history.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="conversation-history">
            <div className="history-header">
                <h3>Conversation History ({history.length})</h3>
                <button
                    className="clear-history-btn"
                    onClick={onClearHistory}
                    title="Clear all history"
                >
                    Clear
                </button>
            </div>

            <div className="history-list">
                {history.map(item => (
                    <HistoryItem key={item.id} item={item} />
                ))}
            </div>

            {history.length >= 50 && (
                <div className="history-limit-notice">
                    History limited to 50 items. Older items are automatically removed.
                </div>
            )}
        </div>
    );
}
