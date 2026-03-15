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
        <div style={{ background: '#130c06', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ borderBottom: '1px solid rgba(192,57,27,0.15)', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(10,6,2,0.5)' }}>
                <h3 className="hud-title flex items-center gap-2">
                    // MISSION_LOGS ({history.length}) //
                </h3>

                {history.length > 0 && (
                    <button
                        onClick={onClearHistory}
                        className="im-btn im-btn-ghost" style={{ fontSize: 9, padding: '4px 12px' }}
                        title="Clear Logs"
                    >
                        PURGE
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {history.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 180, gap: 8 }}>
                        <div style={{ fontSize: 28, opacity: 0.1, fontFamily: 'Orbitron, sans-serif', fontWeight: 900 }}>◈</div>
                        <p className="hud-label">NO MISSION DATA</p>
                        <p style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 11, color: 'rgba(255,212,184,0.25)' }}>// execute query to initialize logs //</p>
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
                <div className="hud-label text-center py-2" style={{ borderTop: '1px solid rgba(192,57,27,0.1)', opacity: 0.5 }}>
                    Buffer Limit Reached: Auto-archiving oldest entries
                </div>
            )}
        </div>
    );
}
