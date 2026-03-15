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
        <div className="flex flex-col h-full" style={{ background: '#161617' }}>
            <div className="flex items-center justify-between p-4" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
                <h3 className="apple-caption flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="rgba(245,245,247,0.35)">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    LOGS ({history.length})
                </h3>

                {history.length > 0 && (
                    <button
                        onClick={onClearHistory}
                        className="apple-btn apple-btn-ghost px-3 py-1 text-[11px]" style={{ borderRadius: '7px' }}
                        title="Clear Logs"
                    >
                        Clear
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {history.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3, duration: 0.4 }}
                        className="flex flex-col items-center justify-center h-48 gap-2"
                    >
                        <motion.div
                            animate={{ opacity: [0.3, 0.7, 0.3] }}
                            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                        >
                            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="mb-3 opacity-40">
                                <circle cx="16" cy="16" r="12" stroke="#f5f5f7" strokeWidth="1" strokeDasharray="4 4"/>
                                <circle cx="16" cy="16" r="6" stroke="#f5f5f7" strokeWidth="1" opacity="0.5"/>
                                <circle cx="16" cy="16" r="2" fill="#f5f5f7" opacity="0.6"/>
                            </svg>
                        </motion.div>
                        <p className="apple-caption">No queries yet</p>
                        <p className="apple-caption" style={{ opacity: 0.4 }}>Ask a question to see your history</p>
                    </motion.div>
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
                <div className="apple-caption text-center py-2" style={{ borderTop: '0.5px solid rgba(255,255,255,0.08)', opacity: 0.5 }}>
                    Buffer Limit Reached: Auto-archiving oldest entries
                </div>
            )}
        </div>
    );
}
