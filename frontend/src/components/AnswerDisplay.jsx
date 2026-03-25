import { useState, useEffect, useRef, useState as useSourceState } from 'react';
import FeedbackButtons from './FeedbackButtons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'framer-motion';
import TypingCursor from './TypingCursor';

function ConfidenceArc({ value }) {
  // value: 0-1
  const pct = Math.max(0, Math.min(1, value || 0));
  const percent = Math.round(pct * 100);

  // SVG arc math (semicircle)
  const R = 44;
  const cx = 60, cy = 60;
  const startAngle = -180; // left
  const endAngle = 0;      // right (full arc = 180 degrees)
  const arcDegrees = pct * 180;

  // Convert polar to cartesian
  const toXY = (deg) => {
    const rad = (deg * Math.PI) / 180;
    return {
      x: cx + R * Math.cos(rad),
      y: cy + R * Math.sin(rad),
    };
  };

  const start = toXY(startAngle);
  const end   = toXY(startAngle + arcDegrees);
  const largeArc = arcDegrees > 180 ? 1 : 0;

  // Color by confidence
  const color = pct > 0.75 ? 'rgba(245,245,247,0.9)' : pct >= 0.5 ? 'rgba(245,245,247,0.65)' : 'rgba(245,245,247,0.35)';
  const label = pct > 0.75 ? 'HIGH' : pct >= 0.5 ? 'MED' : 'LOW';

  const arcPath = arcDegrees > 0
    ? `M ${start.x} ${start.y} A ${R} ${R} 0 ${largeArc} 1 ${end.x} ${end.y}`
    : '';

  // Track arc (full 180°)
  const trackEnd = toXY(0);
  const trackPath = `M ${start.x} ${start.y} A ${R} ${R} 0 1 1 ${trackEnd.x} ${trackEnd.y}`;

  return (
    <div className="flex items-center gap-3 mt-3 mb-1">
      <svg width="120" height="70" viewBox="0 0 120 70" fill="none">
        {/* Track */}
        <path d={trackPath} stroke="rgba(255,255,255,0.06)" strokeWidth="6" fill="none" strokeLinecap="round"/>
        {/* Filled arc */}
        {arcPath && (
          <path
            d={arcPath}
            stroke={color}
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
            style={{
              filter: 'none',
              animation: 'arc-grow 0.8s cubic-bezier(0.25,0.46,0.45,0.94) forwards',
            }}
          />
        )}
        {/* Center text */}
        <text x="60" y="58" textAnchor="middle" fill={color}
          fontSize="14" fontFamily="Orbitron, sans-serif" fontWeight="700">
          {percent}%
        </text>
      </svg>
      <div>
        <div className="text-[10px] uppercase tracking-widest text-white/40 font-mono">Confidence</div>
        <div className="text-sm font-display font-bold" style={{ color }}>{label}</div>
      </div>
    </div>
  );
}

function SuggestedQuestions({ questions, onSelect }) {
  if (!questions || questions.length === 0) return null;
  return (
    <div className="mt-4 pt-4 border-t border-cyber-primary/10" style={{ borderColor: 'rgba(192,57,27,0.15)' }}>
      <p className="text-[10px] uppercase tracking-widest mb-3" style={{ color: 'rgba(245,240,232,0.4)', fontFamily: "'Rajdhani', sans-serif" }}>
        // SUGGESTED QUERIES
      </p>
      <div className="flex flex-col gap-2">
        {questions.map((q, i) => (
          <button
            key={i}
            onClick={() => onSelect(q)}
            className="text-left text-sm px-4 py-2.5 rounded-lg transition-all duration-200 tracking-wide"
            style={{
              color: 'rgba(245,240,232,0.7)',
              fontFamily: "'Space Mono', monospace",
              border: '1px solid rgba(192,57,27,0.2)',
              backgroundColor: 'rgba(14,14,20,0.4)'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(192,57,27,0.5)'; e.currentTarget.style.backgroundColor = 'rgba(192,57,27,0.05)'; e.currentTarget.style.color = '#e8824a'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(192,57,27,0.2)'; e.currentTarget.style.backgroundColor = 'rgba(14,14,20,0.4)'; e.currentTarget.style.color = 'rgba(245,240,232,0.7)'; }}
          >
            <span style={{ color: 'rgba(192,57,27,0.5)', marginRight: '8px' }}>▸</span>
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

const HERO_COLOURS = [
  { accent:'#c0391b', light:'#e8824a', dim:'rgba(192,57,27,0.12)'  },
  { accent:'#1a4a8a', light:'#5b9bd5', dim:'rgba(26,74,138,0.12)'  },
  { accent:'#c0a030', light:'#e8c040', dim:'rgba(192,160,48,0.12)' },
  { accent:'#8b5cf6', light:'#c084fc', dim:'rgba(139,92,246,0.12)' },
  { accent:'#16a34a', light:'#4ade80', dim:'rgba(22,163,74,0.12)'  },
];

function SourceCard({ chunk, index }) {
  const [expanded, setExpanded] = useSourceState(false);
  const hero = HERO_COLOURS[index % HERO_COLOURS.length];
  const score = Math.round((chunk.similarity_score || 0) * 100);
  const filename = (chunk.source_file || '').split('/').pop();
  const truncName = filename.length > 30 ? filename.slice(0,27)+'...' : filename;
  const preview = (chunk.chunk_text || '').slice(0, 130);

  return (
    <motion.div
      initial={{ opacity:0, y:8 }}
      animate={{ opacity:1, y:0 }}
      transition={{ delay: index * 0.07, type:'spring', stiffness:400, damping:30 }}
      onClick={() => setExpanded(!expanded)}
      style={{
        background:'var(--av-s2)',
        borderLeft:`2px solid ${hero.accent}`,
        border:`1px solid ${hero.accent}25`,
        borderLeftWidth:2,
        borderLeftColor: hero.accent,
        borderRadius:5,
        padding:'10px 14px',
        marginBottom:7,
        cursor:'pointer',
        transition:'border-color 0.2s, box-shadow 0.2s',
      }}
      whileHover={{ borderColor: hero.light, boxShadow:`0 0 12px ${hero.accent}20` }}
    >
      {/* Header row */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:7 }}>
        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
          <svg width="12" height="13" viewBox="0 0 12 13" fill="none" style={{ flexShrink:0 }}>
            <rect x="1" y="1" width="10" height="11" rx="1.5" stroke={hero.light} strokeWidth="1"/>
            <line x1="3" y1="4.5" x2="9" y2="4.5" stroke={hero.light} strokeWidth="0.7"/>
            <line x1="3" y1="6.5" x2="9" y2="6.5" stroke={hero.light} strokeWidth="0.7"/>
            <line x1="3" y1="8.5" x2="7" y2="8.5" stroke={hero.light} strokeWidth="0.7"/>
          </svg>
          <span style={{ fontFamily:"'Space Mono', monospace", fontSize:10, color:'rgba(245,240,232,0.75)' }}>{truncName}</span>
        </div>
        {/* Score badge */}
        <span style={{
          fontFamily:"'Rajdhani', sans-serif", fontWeight:700, fontSize:9,
          letterSpacing:'0.1em', padding:'2px 7px', borderRadius:2,
          background: hero.dim, color: hero.light,
          border:`1px solid ${hero.accent}35`,
        }}>
          {score}% MATCH
        </span>
      </div>

      {/* Score bar */}
      <div style={{ height:2, background:'rgba(245,240,232,0.06)', borderRadius:1, marginBottom:9, overflow:'hidden' }}>
        <motion.div
          initial={{ width:0 }}
          animate={{ width:`${score}%` }}
          transition={{ delay: index * 0.07 + 0.2, duration:0.7, ease:'easeOut' }}
          style={{ height:'100%', background:`linear-gradient(90deg, ${hero.accent}, ${hero.light})`, borderRadius:1 }}
        />
      </div>

      {/* Chunk preview */}
      <p style={{ fontFamily:"'Space Mono', monospace", fontSize:11, color:'rgba(245,240,232,0.5)', lineHeight:1.6, margin:0 }}>
        {preview}{(chunk.chunk_text||'').length > 130 && !expanded ? '…' : ''}
      </p>

      {/* Expanded full chunk */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height:0, opacity:0 }}
            animate={{ height:'auto', opacity:1 }}
            exit={{ height:0, opacity:0 }}
            transition={{ duration:0.25 }}
            style={{ overflow:'hidden' }}
          >
            <p style={{ fontFamily:"'Space Mono', monospace", fontSize:11, color:'rgba(245,240,232,0.65)', lineHeight:1.7, marginTop:10, paddingTop:10, borderTop:`1px solid ${hero.accent}15` }}>
              {chunk.chunk_text}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ fontFamily:"'Rajdhani', sans-serif", fontSize:9, color:`${hero.light}50`, marginTop:7, letterSpacing:'0.08em' }}>
        CHUNK {chunk.chunk_index} · {expanded ? 'COLLAPSE ↑' : 'EXPAND ↓'}
      </div>
    </motion.div>
  );
}

function ThinkingSkeleton() {
  const SEQUENCE = [
    { name:'STARK',    colour:'#e8824a', task:'EMBEDDING QUERY'     },
    { name:'ROGERS',   colour:'#5b9bd5', task:'RETRIEVING INTEL'    },
    { name:'ODINSON',  colour:'#e8c040', task:'RERANKING RESULTS'   },
    { name:"T'CHALLA", colour:'#c084fc', task:'ANALYZING CONTEXT'   },
    { name:'BANNER',   colour:'#4ade80', task:'GENERATING RESPONSE' },
  ];

  const [activeIdx, useSourceState] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => {
      useSourceState(prev => (prev + 1) % SEQUENCE.length);
    }, 600);
    return () => clearInterval(iv);
  }, []);

  return (
    <div style={{ padding:'16px 0' }}>
      {/* Sequence rows */}
      <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
        {SEQUENCE.map((hero, i) => {
          const isActive = i === activeIdx;
          const isDone = i < activeIdx;
          return (
            <div
              key={hero.name}
              style={{
                display:'flex', alignItems:'center', gap:10,
                opacity: isDone ? 0.35 : isActive ? 1 : 0.18,
                transition:'opacity 0.3s ease',
              }}
            >
              {/* Status dot */}
              <div style={{
                width:7, height:7, borderRadius:'50%',
                background: isDone ? 'rgba(245,240,232,0.2)' : hero.colour,
                boxShadow: isActive ? `0 0 8px ${hero.colour}` : 'none',
                transition:'all 0.3s',
                flexShrink:0,
              }}/>

              {/* Hero name */}
              <span style={{ fontFamily:"'Rajdhani', sans-serif", fontWeight:700, fontSize:10, letterSpacing:'0.14em', color: hero.colour, minWidth:70 }}>
                {hero.name}
              </span>

              {/* Task label */}
              <span style={{ fontFamily:"'Space Mono', monospace", fontSize:10, color:'rgba(245,240,232,0.55)', flex:1 }}>
                {isDone ? '✓ COMPLETE' : isActive ? `${hero.task}...` : hero.task}
              </span>

              {/* Active shimmer bar */}
              {isActive && (
                <div style={{ width:60, height:2, background:'rgba(245,240,232,0.06)', borderRadius:1, overflow:'hidden' }}>
                  <div style={{
                    height:'100%', width:'40%',
                    background:`linear-gradient(90deg, transparent, ${hero.colour}, transparent)`,
                    animation:'av-progress-slide 0.9s ease-in-out infinite',
                  }}/>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ASSEMBLING RESPONSE final line */}
      <div style={{ marginTop:14, paddingTop:12, borderTop:'1px solid rgba(245,240,232,0.06)', display:'flex', alignItems:'center', gap:8 }}>
        <div style={{ display:'flex', gap:3 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ width:4, height:4, borderRadius:'50%', background:'var(--av-muted)', animation:`hero-pulse 1.2s ease-in-out ${i*0.2}s infinite` }}/>
          ))}
        </div>
        <span style={{ fontFamily:"'Rajdhani', sans-serif", fontWeight:700, fontSize:10, letterSpacing:'0.16em', color:'var(--av-muted)' }}>
          ASSEMBLING RESPONSE
        </span>
      </div>
    </div>
  );
}

function StreamingText({ text, isStreaming }) {
  const words = (text || '').split(' ').filter(Boolean);

  return (
    <span>
      {words.map((word, i) => (
        <span
          key={i}
          style={{
            display: 'inline',
            opacity: 0,
            animation: `word-fade-in 0.06s ease-out ${i * 0.025}s forwards`,
          }}
        >
          {word}{' '}
        </span>
      ))}
      {isStreaming && (
        <span
          style={{
            display: 'inline-block',
            width: '2px',
            height: '1em',
            background: 'rgba(245,245,247,0.6)',
            marginLeft: '2px',
            verticalAlign: 'text-bottom',
            animation: 'cursor-blink 1.1s step-end infinite',
          }}
        />
      )}
    </span>
  );
}

function DebugIntel({ latency, numChunks }) {
  const [open, setOpen] = useSourceState(false);
  if (!latency) return null;

  const bars = [
    { label:'EMBED',    ms: latency.embedding_ms,  colour:'#e8824a', hero:'iron'    },
    { label:'RETRIEVE', ms: latency.retrieval_ms,  colour:'#5b9bd5', hero:'cap'     },
    { label:'GENERATE', ms: latency.generation_ms, colour:'#e8c040', hero:'thor'    },
  ];
  const maxMs = Math.max(...bars.map(b => b.ms), 1);

  return (
    <div style={{ marginTop:12, borderTop:'1px solid rgba(245,240,232,0.06)', paddingTop:12 }}>
      {/* Toggle */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          background:'none', border:'none', cursor:'pointer', padding:0,
          display:'flex', alignItems:'center', gap:6,
        }}
      >
        <span style={{ fontFamily:"'Rajdhani', sans-serif", fontWeight:700, fontSize:9, letterSpacing:'0.16em', color:'rgba(245,240,232,0.28)' }}>
          {open ? '▾' : '▸'} DEBUG INTEL
        </span>
        <span style={{ fontFamily:"'Space Mono', monospace", fontSize:9, color:'rgba(245,240,232,0.2)' }}>
          {Math.round(latency.total_ms)}ms · {numChunks} src
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height:0, opacity:0 }}
            animate={{ height:'auto', opacity:1 }}
            exit={{ height:0, opacity:0 }}
            transition={{ duration:0.2 }}
            style={{ overflow:'hidden' }}
          >
            <div style={{ paddingTop:12, display:'flex', flexDirection:'column', gap:8 }}>
              {bars.map((bar, i) => (
                <div key={bar.label} style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontFamily:"'Rajdhani', sans-serif", fontWeight:700, fontSize:9, letterSpacing:'0.12em', color:bar.colour, minWidth:62 }}>
                    {bar.label}
                  </span>
                  <div style={{ flex:1, height:4, background:'rgba(245,240,232,0.05)', borderRadius:2, overflow:'hidden' }}>
                    <motion.div
                      initial={{ width:0 }}
                      animate={{ width:`${(bar.ms/maxMs)*100}%` }}
                      transition={{ delay:i*0.1, duration:0.6, ease:'easeOut' }}
                      style={{
                        height:'100%', borderRadius:2,
                        background:`linear-gradient(90deg, ${bar.colour}80, ${bar.colour})`,
                        boxShadow:`0 0 4px ${bar.colour}40`,
                      }}
                    />
                  </div>
                  <span style={{ fontFamily:"'Space Mono', monospace", fontSize:9, color:'rgba(245,240,232,0.4)', minWidth:52, textAlign:'right' }}>
                    {Math.round(bar.ms)}ms
                  </span>
                </div>
              ))}

              {/* Total + chunks row */}
              <div style={{ display:'flex', justifyContent:'space-between', paddingTop:6, borderTop:'1px solid rgba(245,240,232,0.05)' }}>
                <span style={{ fontFamily:"'Rajdhani', sans-serif", fontSize:9, fontWeight:700, letterSpacing:'0.12em', color:'rgba(245,240,232,0.4)' }}>
                  TOTAL: {Math.round(latency.total_ms)}ms
                </span>
                <span style={{ fontFamily:"'Rajdhani', sans-serif", fontSize:9, fontWeight:700, letterSpacing:'0.12em', color:'rgba(245,240,232,0.4)' }}>
                  SOURCES: {numChunks}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AnswerDisplay({ answer, isLoading, isThinking, isStreaming, confidence, onSelectSuggestion }) {
    const cleanAnswer = (answer?.answer || '').replace(/^(Answer:|Answer\s*:)\s*/i, '');
    // Empty state
    if (!answer && !isLoading && !isThinking) {
        return (
            <div className="answer-display" style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:220, gap:18 }}>
              {/* Avengers A triangle */}
              <svg width="64" height="58" viewBox="0 0 64 58" fill="none" style={{ opacity:0.18 }}>
                <polygon points="32,3 61,55 3,55" stroke="var(--av-thor-lt)" strokeWidth="1.5" fill="none"/>
                <polygon points="32,15 51,49 13,49" stroke="var(--av-cap-lt)" strokeWidth="0.8" fill="none"/>
                <circle cx="32" cy="38" r="5" stroke="var(--av-iron-lt)" strokeWidth="1" fill="rgba(192,57,27,0.1)"/>
                <line x1="32" y1="3" x2="32" y2="26" stroke="var(--av-panther-lt)" strokeWidth="0.6" opacity="0.6"/>
              </svg>

              {/* Label */}
              <p style={{ fontFamily:"'Rajdhani', sans-serif", fontWeight:700, fontSize:11, letterSpacing:'0.2em', textTransform:'uppercase', color:'var(--av-muted)' }}>
                INTELLIGENCE STANDBY
              </p>

              {/* 5 hero pulse dots */}
              <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                {[
                  ['#c0391b','iron'],['#1a4a8a','cap'],['#c0a030','thor'],
                  ['#8b5cf6','panther'],['#16a34a','hulk']
                ].map(([colour, name], i) => (
                  <div
                    key={name}
                    title={name.toUpperCase()}
                    style={{
                      width:6, height:6, borderRadius:'50%',
                      background: colour, opacity:0.5,
                      animation:`hero-pulse 2.5s ease-in-out ${i*0.25}s infinite`,
                    }}
                  />
                ))}
              </div>

              <p style={{ fontFamily:"'Space Mono', monospace", fontSize:11, color:'var(--av-muted)', opacity:0.6 }}>
                Upload documents and execute a query
              </p>
            </div>
        );
    }

    // Thinking skeleton — shown before first streaming token arrives
    const showSkeleton = isThinking && (!answer?.answer || answer.answer.length === 0);


    // Table Response
    if (answer?.answer_type === 'table' && answer.columns && answer.rows) {
        return (
            <div className="answer-display">
                <div className="answer-markdown mb-4">
                    <div className="answer-wrapper">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {cleanAnswer}
                        </ReactMarkdown>
                    </div>
                </div>

                <div className="answer-markdown overflow-x-auto">
                    <table>
                        <thead>
                            <tr>
                                {answer.columns.map((col, idx) => (
                                    <th key={idx}>
                                        {col}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {answer.rows.map((row, rowIdx) => (
                                <tr key={rowIdx}>
                                    {answer.columns.map((col, colIdx) => (
                                        <td key={colIdx}>
                                            {row[col]}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="mt-4">
                    <FeedbackButtons
                        question={answer.question}
                        answer={answer.answer}
                        numChunksRetrieved={answer.num_chunks_retrieved}
                    />
                </div>
                <SuggestedQuestions
                  questions={answer?.suggested_questions}
                  onSelect={onSelectSuggestion}
                />
            </div>
        );
    }

    // Fallback: Check if answer is a JSON string (for robustness)
    let fallbackTableData = null;
    if (answer?.answer && typeof answer.answer === 'string' && (answer.answer.trim().startsWith('[') || answer.answer.trim().startsWith('```json'))) {
        try {
            let cleanJson = answer.answer.trim();
            if (cleanJson.startsWith('```json')) {
                cleanJson = cleanJson.replace(/^```json/, '').replace(/```$/, '');
            } else if (cleanJson.startsWith('```')) {
                cleanJson = cleanJson.replace(/^```/, '').replace(/```$/, '');
            }

            // Try to find array brackets if there's text around it
            const match = cleanJson.match(/\[.*\]/s);
            if (match) {
                cleanJson = match[0];
            }

            const parsed = JSON.parse(cleanJson);
            if (Array.isArray(parsed) && parsed.length > 0) {
                const cols = Object.keys(parsed[0]);
                fallbackTableData = { rows: parsed, columns: cols };
            }
        } catch (e) {
            // Not valid JSON, ignore
        }
    }

    if (fallbackTableData) {
        return (
            <div className="answer-display">
                <div className="answer-markdown overflow-x-auto">
                    <table>
                        <thead>
                            <tr>
                                {fallbackTableData.columns.map((col, idx) => (
                                    <th key={idx}>
                                        {col}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {fallbackTableData.rows.map((row, rowIdx) => (
                                <tr key={rowIdx}>
                                    {fallbackTableData.columns.map((col, colIdx) => (
                                        <td key={colIdx}>
                                            {typeof row[col] === 'object' ? JSON.stringify(row[col]) : row[col]}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="mt-4">
                    <FeedbackButtons
                        question={answer.question}
                        answer={answer.answer}
                        numChunksRetrieved={answer.num_chunks_retrieved}
                    />
                </div>
                <SuggestedQuestions
                  questions={answer?.suggested_questions}
                  onSelect={onSelectSuggestion}
                />
            </div>
        );
    }

    // Display answer with skeleton or content
    return (
        <div className="answer-display">
            {showSkeleton ? (
                <ThinkingSkeleton />
            ) : (
                <>
                    <div className="answer-markdown fade-reveal-container">
                        <div className="answer-wrapper">
                            {isStreaming ? (
                                <StreamingText text={cleanAnswer} isStreaming={isStreaming} />
                            ) : (
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {cleanAnswer}
                                </ReactMarkdown>
                            )}
                        </div>
                    </div>
                    {confidence != null && !isLoading && !isThinking && (
                        <ConfidenceArc value={confidence} />
                    )}
                    
                    {answer?.retrieved_chunks?.length > 0 && !isStreaming && !isThinking && (
                      <div style={{ marginTop:18 }}>
                        <div style={{ fontFamily:"'Rajdhani', sans-serif", fontWeight:700, fontSize:9, letterSpacing:'0.18em', textTransform:'uppercase', color:'var(--av-muted)', marginBottom:10 }}>
                          INTELLIGENCE SOURCES — {answer.retrieved_chunks.length} CHUNK{answer.retrieved_chunks.length !== 1 ? 'S' : ''} RETRIEVED
                        </div>
                        <motion.div
                          variants={{ hidden:{}, visible:{ transition:{ staggerChildren:0.07 } } }}
                          initial="hidden"
                          animate="visible"
                        >
                          {answer.retrieved_chunks.map((chunk, i) => (
                            <SourceCard key={i} chunk={chunk} index={i} />
                          ))}
                        </motion.div>
                      </div>
                    )}

                    {answer?.answer && !isStreaming && !isThinking && (
                        <FeedbackButtons
                            question={answer.question}
                            answer={answer.answer}
                            numChunksRetrieved={answer.num_chunks_retrieved}
                        />
                    )}

                    {!isStreaming && !isThinking && (
                        <SuggestedQuestions
                          questions={answer?.suggested_questions}
                          onSelect={onSelectSuggestion}
                        />
                    )}

                    <DebugIntel
                      latency={answer?.debug_latency}
                      numChunks={answer?.num_chunks_retrieved || 0}
                    />
                </>
            )}
        </div>
    );
}


