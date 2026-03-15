import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// Removed HistoryItem.css import

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
        <motion.div
            layout
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            style={{
                background: isExpanded ? '#1e1108' : 'rgba(192,57,27,0.03)',
                border: `1px solid ${isExpanded ? 'rgba(232,130,74,0.35)' : 'rgba(192,57,27,0.12)'}`,
                marginBottom: 4, cursor: 'pointer', transition: 'all 0.2s',
                clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))'
            }}
            onClick={toggleExpanded}
        >
            <div className="p-3">
                <div className="flex justify-between items-start gap-2 mb-1">
                    <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 12, color: isExpanded ? '#ffd4b8' : 'rgba(255,212,184,0.65)', lineHeight: 1.5 }}>
                        {item.isRefusal && <span className="hud-label px-2 py-0.5 rounded-md" style={{ background: 'rgba(192,57,27,0.1)', border: '1px solid rgba(192,57,27,0.2)' }} title="Request refused">⚠️</span>}
                        {item.question}
                    </div>
                    <div className="hud-label flex-shrink-0 mt-0.5">
                        {formatTimestamp(item.timestamp)}
                    </div>
                </div>

                {!isExpanded && (
                    <div className="line-clamp-1 pl-2" style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 12, color: 'rgba(255,212,184,0.65)', borderLeft: '1px solid rgba(192,57,27,0.15)' }}>
                        {item.answer}
                    </div>
                )}
            </div>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
                        style={{ overflow: 'hidden', borderColor: 'rgba(255,255,255,0.08)' }}
                        className="border-t px-3 py-3 text-xs"
                    >
                        <div className="mb-3">
                            <strong className="block hud-label mb-1">Response Protocol:</strong>
                            <p style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 12, color: 'rgba(255,212,184,0.7)', lineHeight: 1.65, marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(192,57,27,0.1)' }}>
                                {item.answer}
                            </p>
                        </div>

                        {item.num_chunks_retrieved > 0 && item.retrieved_chunks && (
                            <div className="mt-3 pt-2 border-t" style={{ borderColor: 'rgba(192,57,27,0.1)' }}>
                                <strong className="hud-label mt-1 block mb-2">
                                    References ({item.num_chunks_retrieved}):
                                </strong>
                                <div className="space-y-2">
                                    {item.retrieved_chunks.map((chunk, index) => (
                                        <div key={index} className="rounded p-2" style={{ background: 'rgba(192,57,27,0.06)', border: '1px solid rgba(192,57,27,0.15)' }}>
                                            <div className="flex justify-between items-center mb-1 text-[10px]">
                                                <span className="truncate max-w-[70%]" style={{ color: 'var(--im-cream)' }}>{chunk.source_file}</span>
                                                <span className="font-mono" style={{ color: 'var(--im-orange)' }}>
                                                    {(chunk.similarity_score * 100).toFixed(0)}%
                                                </span>
                                            </div>
                                            <div className="line-clamp-2 italic" style={{ color: 'rgba(255,212,184,0.5)' }}>
                                                "{chunk.chunk_text}"
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
