import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const HERO_MODES = [
  { value:'vector',  hero:'IRON',    symbol:'⬡', colour:'#e8824a', dim:'rgba(192,57,27,0.15)',  label:'STARK',   title:'Vector search — fast, precise' },
  { value:'hybrid',  hero:'CAP',     symbol:'★', colour:'#5b9bd5', dim:'rgba(26,74,138,0.15)',  label:'ROGERS',  title:'Hybrid — balanced, recommended' },
  { value:'hybrid',  hero:'THOR',    symbol:'⚡', colour:'#e8c040', dim:'rgba(192,160,48,0.15)', label:'ODINSON', title:'Deep hybrid — comprehensive' },
  { value:'graph',   hero:'PANTHER', symbol:'◆', colour:'#c084fc', dim:'rgba(139,92,246,0.15)', label:'PANTHER', title:'Graph RAG — knowledge graph' },
  { value:'hybrid',  hero:'HULK',    symbol:'◉', colour:'#4ade80', dim:'rgba(22,163,74,0.15)',  label:'BANNER',  title:'Broad recall — max coverage' },
];

function QuestionInput({ onQueryStart, disabled, isLoading }) {
    const [question, setQuestion] = useState('');
    const [mode, setMode] = useState('hybrid');
    const [selectedHero, setSelectedHero] = useState('CAP');
    const [isFocused, setIsFocused] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!question.trim() || disabled || isLoading) return;

        // Delegate query handling entirely to the parent (App.jsx)
        if (onQueryStart) {
            onQueryStart(question, mode, selectedHero);
        }
        setQuestion('');
    };

    return (
        <div className="w-full">
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
                <div style={{ display:'flex', gap:4, flexShrink:0 }}>
                  {HERO_MODES.map((hm) => {
                    const isActive = mode === hm.value && selectedHero === hm.hero;
                    return (
                      <motion.button
                        key={hm.hero}
                        type="button"
                        title={hm.title}
                        whileHover={{ scale:1.08, y:-1 }}
                        whileTap={{ scale:0.95 }}
                        onClick={() => { setMode(hm.value); setSelectedHero(hm.hero); }}
                        disabled={disabled || isLoading}
                        style={{
                          width:38, height:40,
                          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                          gap:2, cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
                          background: selectedHero === hm.hero ? hm.dim : 'rgba(245,240,232,0.03)',
                          border: selectedHero === hm.hero ? `1px solid ${hm.colour}50` : '1px solid rgba(245,240,232,0.07)',
                          borderRadius:4, transition:'all 0.15s',
                          opacity: disabled || isLoading ? 0.4 : 1,
                        }}
                      >
                        <span style={{ fontSize:13, color: selectedHero === hm.hero ? hm.colour : 'rgba(245,240,232,0.3)', lineHeight:1 }}>
                          {hm.symbol}
                        </span>
                        <span style={{ fontFamily:"'Rajdhani', sans-serif", fontWeight:700, fontSize:7, letterSpacing:'0.1em', color: selectedHero === hm.hero ? hm.colour : 'rgba(245,240,232,0.25)' }}>
                          {hm.label}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
                
                <motion.div
                    animate={{ boxShadow: question.length > 0 ? '0 0 14px rgba(26,74,138,0.2)' : 'none' }}
                    transition={{ duration: 0.3 }}
                    className="relative flex-1"
                >
                    <input
                        type="text"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        placeholder={disabled ? "// OFFLINE — UPLOAD DOCUMENTS TO ACTIVATE" : "// ENTER INTELLIGENCE QUERY..."}
                        disabled={disabled || isLoading}
                        className="cap-input"
                    />
                    {isLoading && (
                        <div style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)' }}>
                          <div style={{ width:18, height:18, borderRadius:'50%', border:'2px solid rgba(26,74,138,0.2)', borderTopColor:'#5b9bd5', animation:'spin 0.9s linear infinite' }}/>
                        </div>
                    )}
                </motion.div>

                <AnimatePresence>
                  {isFocused && (
                    <motion.div
                      initial={{ opacity:0, y:-4 }}
                      animate={{ opacity:1, y:0 }}
                      exit={{ opacity:0, y:-4 }}
                      transition={{ duration:0.18 }}
                      style={{ display:'flex', alignItems:'center', gap:14, padding:'5px 4px 0', flexWrap:'wrap' }}
                    >
                      {[
                        ['↵', 'Execute'],
                        ['⌘K', 'Command palette'],
                      ].map(([key, label]) => (
                        <span key={key} style={{ display:'flex', alignItems:'center', gap:4 }}>
                          <kbd style={{
                            fontFamily:"'Space Mono', monospace", fontSize:9,
                            padding:'1px 5px', borderRadius:3,
                            background:'rgba(245,240,232,0.05)',
                            border:'1px solid rgba(245,240,232,0.12)',
                            color:'rgba(245,240,232,0.45)',
                          }}>{key}</kbd>
                          <span style={{ fontFamily:"'Rajdhani', sans-serif", fontSize:9, letterSpacing:'0.08em', color:'rgba(245,240,232,0.28)' }}>
                            {label}
                          </span>
                        </span>
                      ))}

                      {/* Character counter */}
                      {question.length > 80 && (
                        <span style={{
                          marginLeft:'auto', fontFamily:"'Space Mono', monospace", fontSize:9,
                          color: question.length > 200 ? 'var(--av-iron-lt)' : 'rgba(245,240,232,0.3)',
                        }}>
                          {question.length}/400
                        </span>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.button
                  whileHover={!disabled && !isLoading && question.trim() ? { scale:1.03, y:-1 } : {}}
                  whileTap={!disabled && !isLoading && question.trim() ? { scale:0.97 } : {}}
                  transition={{ type:'spring', stiffness:400, damping:20 }}
                  type="submit"
                  disabled={disabled || isLoading}
                  className={
                    disabled ? 'btn-iron opacity-25 cursor-not-allowed' :
                    isLoading ? 'btn-iron opacity-80 cursor-not-allowed' :
                    !question.trim() ? 'btn-iron opacity-40 cursor-not-allowed' :
                    'btn-iron'
                  }
                  style={{ minWidth:88, display:'flex', alignItems:'center', justifyContent:'center', gap:6, position:'relative' }}
                >
                  {disabled ? (
                    /* OFFLINE state */
                    <span style={{ fontFamily:"'Rajdhani', sans-serif", fontSize:11, fontWeight:700, letterSpacing:'0.12em' }}>
                      OFFLINE
                    </span>
                  ) : isLoading ? (
                    /* Arc reactor spinner state */
                    <span style={{ display:'flex', alignItems:'center', gap:7 }}>
                      <span style={{ position:'relative', width:16, height:16, display:'inline-flex', alignItems:'center', justifyContent:'center' }}>
                        <span style={{
                          position:'absolute', width:16, height:16, borderRadius:'50%',
                          border:'1.5px solid transparent',
                          borderTopColor:'var(--av-iron-lt)',
                          borderRightColor:'rgba(192,57,27,0.3)',
                          animation:'spin 0.8s linear infinite',
                        }}/>
                        <span style={{
                          position:'absolute', width:9, height:9, borderRadius:'50%',
                          border:'1px solid transparent',
                          borderTopColor:'rgba(232,130,74,0.6)',
                          animation:'spin 0.5s linear infinite reverse',
                        }}/>
                        <span style={{ width:3, height:3, borderRadius:'50%', background:'var(--av-iron-lt)', animation:'hero-pulse 1s ease-in-out infinite' }}/>
                      </span>
                      <span style={{ fontFamily:"'Rajdhani', sans-serif", fontSize:11, fontWeight:700, letterSpacing:'0.1em' }}>PROCESSING</span>
                    </span>
                  ) : (
                    /* EXECUTE state with arrow */
                    <span style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <span style={{ fontFamily:"'Rajdhani', sans-serif", fontSize:12, fontWeight:700, letterSpacing:'0.12em' }}>EXECUTE</span>
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5h6M5.5 2.5L8 5l-2.5 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                  )}
                </motion.button>
            </form>
        </div>
    );
}

export default QuestionInput;

