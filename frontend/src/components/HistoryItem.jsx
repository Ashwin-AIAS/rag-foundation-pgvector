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
            initial={{ opacity: 0, x: -20, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            whileHover={{ x: 3, transition: { type: 'spring', stiffness: 500, damping: 25 } }}
            className="group rounded-xl cursor-pointer overflow-hidden transition-all duration-200"
            style={{
                background: isExpanded ? '#1d1d1f' : 'rgba(255,255,255,0.02)',
                border: `0.5px solid ${isExpanded ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)'}`,
            }}
            onClick={toggleExpanded}
        >
            <div className="p-3">
                <div className="flex justify-between items-start gap-2 mb-1">
                    <div className="font-medium text-[13px] line-clamp-2 transition-colors" style={{ color: isExpanded ? '#f5f5f7' : 'rgba(245,245,247,0.7)', letterSpacing: '-0.01em' }}>
                        {item.isRefusal && <span className="apple-caption px-2 py-0.5 rounded-md" style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)' }} title="Request refused">⚠️</span>}
                        {item.question}
                    </div>
                    <div className="apple-caption flex-shrink-0 mt-0.5">
                        {formatTimestamp(item.timestamp)}
                    </div>
                </div>

                {!isExpanded && (
                    <div className="text-[13px] leading-relaxed line-clamp-1 pl-2 border-l border-white/10" style={{ color: 'rgba(245,245,247,0.65)', letterSpacing: '-0.01em' }}>
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
                            <strong className="block apple-caption mb-1">Response Protocol:</strong>
                            <p className="text-[13px] leading-relaxed whitespace-pre-wrap border-l border-white/10 pl-2" style={{ color: 'rgba(245,245,247,0.65)', letterSpacing: '-0.01em' }}>
                                {item.answer}
                            </p>
                        </div>

                        {item.num_chunks_retrieved > 0 && item.retrieved_chunks && (
                            <div className="mt-3 pt-2 border-t border-white/5">
                                <strong className="apple-caption mt-1 block mb-2">
                                    References ({item.num_chunks_retrieved}):
                                </strong>
                                <div className="space-y-2">
                                    {item.retrieved_chunks.map((chunk, index) => (
                                        <div key={index} className="bg-black/40 rounded p-2 border border-white/5">
                                            <div className="flex justify-between items-center mb-1 text-[10px]">
                                                <span className="text-[#f5f5f7] truncate max-w-[70%]">{chunk.source_file}</span>
                                                <span className="text-white/30 font-mono">
                                                    {(chunk.similarity_score * 100).toFixed(0)}%
                                                </span>
                                            </div>
                                            <div className="text-white/50 line-clamp-2 italic">
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
