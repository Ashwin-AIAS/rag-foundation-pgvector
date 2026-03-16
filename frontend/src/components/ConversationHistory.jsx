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
        <div style={{ background:'#0e0e14', display:'flex', flexDirection:'column', height:'100%', position:'relative', overflow:'hidden' }}>
            <div style={{ height:2, background:'linear-gradient(90deg, #8b5cf6, #c084fc)', flexShrink:0 }}/>
            <div style={{ borderBottom:'1px solid rgba(245,240,232,0.07)', padding:'13px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <h3 className="station-label station-label-panther flex items-center gap-2">
                  <span style={{ width:5, height:5, borderRadius:'50%', background:'#8b5cf6', display:'inline-block', boxShadow:'0 0 6px rgba(139,92,246,0.8)' }}/>
                  MISSION LOGS ({history.length})
                </h3>

                {history.length > 0 && (
                    <button
                        onClick={onClearHistory}
                        className="btn-ghost" style={{ fontSize:9, padding:'4px 10px' }}
                        title="Clear Logs"
                    >
                        PURGE
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {history.length === 0 ? (
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:180, gap:10 }}>
                      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                        <polygon points="18,4 32,28 4,28" fill="none" stroke="rgba(139,92,246,0.25)" strokeWidth="1.5"/>
                        <polygon points="18,11 27,24 9,24" fill="none" stroke="rgba(139,92,246,0.12)" strokeWidth="1"/>
                        <circle cx="18" cy="18" r="3" fill="rgba(139,92,246,0.2)" stroke="rgba(139,92,246,0.3)" strokeWidth="1"/>
                      </svg>
                      <p className="station-label station-label-panther">NO MISSION DATA</p>
                      <p style={{ fontFamily:'Space Mono, monospace', fontSize:11, color:'rgba(245,240,232,0.22)', textAlign:'center', lineHeight:1.6 }}>Execute a query to<br/>initialize mission logs</p>
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
                <div className="station-label station-label-panther text-center py-2" style={{ borderTop:'1px solid rgba(245,240,232,0.06)' }}>
                    BUFFER LIMIT — AUTO-ARCHIVING
                </div>
            )}
        </div>
    );
}
