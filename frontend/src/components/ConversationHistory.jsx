import HistoryItem from './HistoryItem';
import { motion, AnimatePresence } from 'framer-motion';
// Removed ConversationHistory.css import

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
    return (
        <div className="flex flex-col h-full bg-cyber-darker/30 backdrop-blur-sm border-l border-cyber-primary/10">
            <div className="flex items-center justify-between p-4 border-b border-cyber-primary/10 bg-cyber-darker/80">
                <h3 className="text-sm font-bold text-cyber-primary uppercase tracking-wider flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    LOGS ({history.length})
                </h3>

                {history.length > 0 && (
                    <button
                        onClick={onClearHistory}
                        className="text-xs text-cyber-secondary hover:text-white transition-colors uppercase tracking-widest border border-cyber-secondary/30 hover:bg-cyber-secondary/20 px-2 py-1 rounded"
                        title="Purge Logs"
                    >
                        Purge
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {history.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-cyber-text/30">
                        <p className="text-xs uppercase tracking-widest text-center">No Data Streams Active</p>
                        <p className="text-[10px] opacity-50 mt-1">Execute query to initialize logs</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <AnimatePresence>
                            {history.map(item => (
                                <HistoryItem key={item.id} item={item} />
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {history.length >= 50 && (
                <div className="text-[10px] text-cyber-secondary/70 text-center py-2 bg-cyber-secondary/5 border-t border-cyber-secondary/10">
                    Buffer Limit Reached: Auto-archiving oldest entries
                </div>
            )}
        </div>
    );
}
