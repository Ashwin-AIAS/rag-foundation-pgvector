import { useState, useEffect, useRef, useState as useSourceState } from 'react';
import FeedbackButtons from './FeedbackButtons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'framer-motion';
import TypingCursor from './TypingCursor';

function ConfidenceBadge({ confidence }) {
    if (confidence == null || confidence === 0) return null;
    let level = 'low';
    if (confidence >= 80) level = 'high';
    else if (confidence >= 60) level = 'mid';
    return (
        <span className={`confidence-badge confidence-${level}`}>
            {confidence}% confidence
        </span>
    );
}

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

function SourceCard({ chunk, index }) {
  const [expanded, setExpanded] = useSourceState(false);
  const score = Math.round((chunk.similarity_score || 0) * 100);
  const barColor = 'rgba(245,245,247,0.5)';
  const filename = (chunk.source_file || 'unknown').split('/').pop();
  const truncatedName = filename.length > 28 ? filename.slice(0, 25) + '...' : filename;
  const preview = (chunk.chunk_text || '').slice(0, 160);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 350, damping: 25, delay: index * 0.08 }}
      whileHover={{ y: -1, borderColor: 'rgba(255,255,255,0.18)' }}
      onClick={() => setExpanded(!expanded)}
      style={{
        background: 'rgba(10,15,28,0.5)',
        border: '1px solid rgba(245,245,247,0.15)',
        borderRadius: '10px',
        padding: '12px',
        cursor: 'pointer',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        marginBottom: '8px',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="2" y="1" width="10" height="12" rx="2" stroke="rgba(245,245,247,0.85)" strokeWidth="1.2"/>
            <line x1="4" y1="5" x2="10" y2="5" stroke="rgba(245,245,247,0.85)" strokeWidth="0.8"/>
            <line x1="4" y1="7.5" x2="10" y2="7.5" stroke="rgba(245,245,247,0.85)" strokeWidth="0.8"/>
            <line x1="4" y1="10" x2="8" y2="10" stroke="rgba(245,245,247,0.85)" strokeWidth="0.8"/>
          </svg>
          <span style={{ fontSize: '11px', color: 'rgba(230,241,255,0.8)', fontFamily: 'JetBrains Mono, monospace' }}>
            {truncatedName}
          </span>
        </div>
        <span style={{
          fontSize: '10px', fontWeight: '700', padding: '2px 8px',
          borderRadius: '999px', fontFamily: 'Orbitron, sans-serif',
          background: 'rgba(255,255,255,0.05)', color: 'rgba(245,245,247,0.7)', border: '0.5px solid rgba(255,255,255,0.1)',
        }}>
          {score}%
        </span>
      </div>

      {/* Relevance bar */}
      <div style={{ height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', marginBottom: '10px', overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ delay: index * 0.06 + 0.2, duration: 0.6, ease: 'easeOut' }}
          style={{ height: '100%', background: barColor, borderRadius: '2px' }}
        />
      </div>

      {/* Chunk preview */}
      <p style={{ fontSize: '11px', color: 'rgba(230,241,255,0.5)', fontFamily: 'JetBrains Mono, monospace', lineHeight: '1.6', margin: 0 }}>
        {preview}{chunk.chunk_text?.length > 160 && !expanded ? '…' : ''}
      </p>

      {/* Expanded full chunk */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: 'hidden' }}
          >
            <p style={{ fontSize: '11px', color: 'rgba(230,241,255,0.7)', fontFamily: 'JetBrains Mono, monospace', lineHeight: '1.7', marginTop: '8px', borderTop: '1px solid rgba(245,245,247,0.1)', paddingTop: '8px' }}>
              {chunk.chunk_text}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ fontSize: '10px', color: 'rgba(245,245,247,0.4)', marginTop: '6px', textAlign: 'right' }}>
        {expanded ? '↑ collapse' : '↓ expand chunk'}
      </div>
    </motion.div>
  );
}

function SynapseLoader() {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-4">
      <svg width="120" height="80" viewBox="0 0 120 80" fill="none">
        {/* Nodes */}
        {[
          [20, 20], [60, 20], [100, 20],
          [40, 60], [80, 60],
        ].map(([cx, cy], i) => (
          <circle
            key={i} cx={cx} cy={cy} r="6"
            fill="rgba(245,245,247,0.06)"
            stroke="rgba(245,245,247,0.4)" strokeWidth="1.5"
            style={{
              animation: `synapse-node-pulse 1.8s ease-in-out ${i * 0.18}s infinite`,
            }}
          />
        ))}

        {/* Edges (animate stroke-dashoffset) */}
        {[
          'M20 20 L40 60', 'M60 20 L40 60', 'M60 20 L80 60',
          'M100 20 L80 60', 'M20 20 L60 20', 'M60 20 L100 20',
        ].map((d, i) => (
          <path
            key={i} d={d}
            stroke="rgba(245,245,247,0.2)" strokeWidth="1"
            fill="none"
            strokeDasharray="60"
            strokeDashoffset="60"
            style={{
              animation: `synapse-edge-fire 1.8s ease-in-out ${i * 0.22}s infinite`,
            }}
          />
        ))}
      </svg>

      <div className="flex items-center gap-2">
        <span
          className="hud-label"
          style={{ animation: 'synapse-text-pulse 1.8s ease-in-out infinite' }}
        >
          Neural Processing
        </span>
        {[0, 0.2, 0.4].map((delay, i) => (
          <span
            key={i}
            className="w-1 h-1 rounded-full"
            style={{ background: 'rgba(245,245,247,0.4)', animation: `synapse-dot 1.2s ease-in-out ${delay}s infinite` }}
          />
        ))}
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

export default function AnswerDisplay({ answer, isLoading, isThinking, isStreaming, confidence }) {
    // Empty state
    if (!answer && !isLoading && !isThinking) {
        return (
            <div className="answer-display">
                <h2>Answer</h2>
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                        <rect x="6" y="4" width="20" height="24" rx="3" stroke="rgba(245,245,247,0.15)" strokeWidth="1"/>
                        <line x1="10" y1="10" x2="22" y2="10" stroke="rgba(245,245,247,0.12)" strokeWidth="1"/>
                        <line x1="10" y1="14" x2="22" y2="14" stroke="rgba(245,245,247,0.12)" strokeWidth="1"/>
                        <line x1="10" y1="18" x2="18" y2="18" stroke="rgba(245,245,247,0.12)" strokeWidth="1"/>
                    </svg>
                    <p className="hud-label">Upload a document and ask a question</p>
                </div>
            </div>
        );
    }

    // Thinking skeleton — shown before first streaming token arrives
    const showSkeleton = isThinking && (!answer?.answer || answer.answer.length === 0);


    // Table Response
    if (answer?.answer_type === 'table' && answer.columns && answer.rows) {
        return (
            <div className="answer-display">
                <div className="answer-header-row">
                    <h2>Generated Analysis</h2>
                    {!isStreaming && <ConfidenceBadge confidence={confidence} />}
                </div>
                <div className="answer-markdown mb-4">
                    <div className="answer-wrapper">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {answer.answer}
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
                <div className="answer-header-row">
                    <h2>Generated Analysis</h2>
                    {!isStreaming && <ConfidenceBadge confidence={confidence} />}
                </div>
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
            </div>
        );
    }

    // Display answer with skeleton or content
    return (
        <div className="answer-display">
            <div className="answer-header-row">
                <h2>Answer</h2>
                {!isStreaming && !isThinking && <ConfidenceBadge confidence={confidence} />}
            </div>
            {showSkeleton ? (
                <SynapseLoader />
            ) : (
                <>
                    <div className="answer-markdown fade-reveal-container">
                        <div className="answer-wrapper">
                            {isStreaming ? (
                                <StreamingText text={answer?.answer || ''} isStreaming={isStreaming} />
                            ) : (
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {answer?.answer || ""}
                                </ReactMarkdown>
                            )}
                        </div>
                    </div>
                    {confidence != null && !isLoading && !isThinking && (
                        <ConfidenceArc value={confidence} />
                    )}
                    
                    {answer?.retrieved_chunks?.length > 0 && !isLoading && !isThinking && (
                      <div style={{ marginTop: '16px' }}>
                        <div style={{
                          fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em',
                          color: 'rgba(230,241,255,0.4)', fontFamily: 'Orbitron, sans-serif',
                          marginBottom: '10px',
                        }}>
                          Source Citations — {answer.retrieved_chunks.length} chunk{answer.retrieved_chunks.length !== 1 ? 's' : ''}
                        </div>
                        {answer.retrieved_chunks.map((chunk, i) => (
                          <SourceCard key={i} chunk={chunk} index={i} />
                        ))}
                      </div>
                    )}

                    {answer?.answer && !isStreaming && !isThinking && (
                        <FeedbackButtons
                            question={answer.question}
                            answer={answer.answer}
                            numChunksRetrieved={answer.num_chunks_retrieved}
                        />
                    )}
                </>
            )}
        </div>
    );
}


