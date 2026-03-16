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
            initial={{ opacity:0, y:10, scale:0.97 }}
            animate={{ opacity:1, y:0, scale:1 }}
            exit={{ opacity:0, scale:0.97, transition:{ duration:0.15 } }}
            transition={{ type:'spring', stiffness:500, damping:35, mass:0.6 }}
            whileHover={{ x:2, transition:{ type:'spring', stiffness:500, damping:25 } }}
            style={{
              background: isExpanded ? '#161620' : 'rgba(139,92,246,0.03)',
              border: `1px solid ${isExpanded ? 'rgba(139,92,246,0.35)' : 'rgba(245,240,232,0.06)'}`,
              marginBottom:4, cursor:'pointer', borderRadius:6, overflow:'hidden',
            }}
            onClick={toggleExpanded}
        >
            <div className="p-3">
                <div className="flex justify-between items-start gap-2 mb-1">
                    <div style={{ fontFamily:'Space Mono, monospace', fontSize:11, color: isExpanded ? '#f5f0e8' : 'rgba(245,240,232,0.6)', lineHeight:1.55, letterSpacing:'-0.01em' }}>
                        {item.isRefusal && <span style={{ fontFamily:'Rajdhani, sans-serif', fontSize:9, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', background:'rgba(192,160,48,0.08)', color:'rgba(232,192,64,0.8)', border:'1px solid rgba(192,160,48,0.2)', padding:'2px 7px', borderRadius:2, marginRight:6 }} title="Request refused">⚠️</span>}
                        {item.question}
                    </div>
                    <div className="station-label station-label-panther flex-shrink-0">
                        {formatTimestamp(item.timestamp)}
                    </div>
                </div>

                {!isExpanded && (
                    <div className="line-clamp-1 pl-2" style={{ fontFamily:'Space Mono, monospace', fontSize:11, color:'rgba(245,240,232,0.65)', borderLeft:'1px solid rgba(139,92,246,0.15)' }}>
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
                            <strong className="block station-label station-label-panther mb-1">Response Protocol:</strong>
                            <p style={{ fontFamily:'Space Mono, monospace', fontSize:11, color:'rgba(245,240,232,0.65)', lineHeight:1.65, marginTop:8, paddingTop:8, borderTop:'1px solid rgba(245,240,232,0.06)' }}>
                                {item.answer}
                            </p>
                        </div>

                        {item.num_chunks_retrieved > 0 && item.retrieved_chunks && (
                            <div className="mt-3 pt-2 border-t" style={{ borderColor: 'rgba(139,92,246,0.15)' }}>
                                <strong className="station-label station-label-panther mt-1 block mb-2">
                                    References ({item.num_chunks_retrieved}):
                                </strong>
                                <div className="space-y-2">
                                    {item.retrieved_chunks.map((chunk, index) => (
                                        <div key={index} className="rounded p-2" style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)' }}>
                                            <div className="flex justify-between items-center mb-1 text-[10px]">
                                                <span className="truncate max-w-[70%]" style={{ color: '#f5f0e8' }}>{chunk.source_file}</span>
                                                <span className="font-mono" style={{ color: '#c084fc' }}>
                                                    {(chunk.similarity_score * 100).toFixed(0)}%
                                                </span>
                                            </div>
                                            <div className="line-clamp-2 italic" style={{ color: 'rgba(245,240,232,0.5)' }}>
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
