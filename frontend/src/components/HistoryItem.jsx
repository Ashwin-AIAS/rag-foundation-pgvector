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
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className={`
                group rounded-lg border transition-all duration-300 overflow-hidden cursor-pointer backdrop-blur-sm
                ${isExpanded
                    ? 'bg-cyber-darker border-cyber-primary shadow-[0_0_15px_rgba(0,212,255,0.1)]'
                    : 'bg-black/20 border-white/5 hover:border-cyber-primary/50 hover:bg-cyber-darker/60'
                }
                ${item.isRefusal ? 'border-cyber-secondary/30 bg-cyber-secondary/5' : ''}
            `}
            onClick={toggleExpanded}
        >
            <div className="p-3">
                <div className="flex justify-between items-start gap-2 mb-1">
                    <div className={`font-medium text-sm line-clamp-2 ${isExpanded ? 'text-cyber-primary' : 'text-cyber-text/80 group-hover:text-cyber-text'}`}>
                        {item.isRefusal && <span className="text-cyber-secondary mr-2" title="Request refused">⚠️</span>}
                        {item.question}
                    </div>
                    <div className="text-[10px] text-cyber-text/30 whitespace-nowrap font-mono mt-0.5">
                        {formatTimestamp(item.timestamp)}
                    </div>
                </div>

                {!isExpanded && (
                    <div className="text-xs text-cyber-text/50 line-clamp-1 pl-2 border-l-2 border-cyber-primary/20">
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
                        className="bg-black/30 border-t border-cyber-primary/10 px-3 py-3 text-xs"
                    >
                        <div className="mb-3">
                            <strong className="block text-cyber-secondary text-[10px] uppercase tracking-widest mb-1">Response Protocol:</strong>
                            <p className="text-cyber-text/80 whitespace-pre-wrap leading-relaxed border-l-2 border-cyber-secondary/30 pl-2">
                                {item.answer}
                            </p>
                        </div>

                        {item.num_chunks_retrieved > 0 && item.retrieved_chunks && (
                            <div className="mt-3 pt-2 border-t border-white/5">
                                <strong className="block text-cyber-primary text-[10px] uppercase tracking-widest mb-2">
                                    References ({item.num_chunks_retrieved}):
                                </strong>
                                <div className="space-y-2">
                                    {item.retrieved_chunks.map((chunk, index) => (
                                        <div key={index} className="bg-black/40 rounded p-2 border border-white/5">
                                            <div className="flex justify-between items-center mb-1 text-[10px]">
                                                <span className="text-cyber-primary truncate max-w-[70%]">{chunk.source_file}</span>
                                                <span className="text-cyber-text/30 font-mono">
                                                    {(chunk.similarity_score * 100).toFixed(0)}%
                                                </span>
                                            </div>
                                            <div className="text-cyber-text/50 line-clamp-2 italic">
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
