import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CommandPalette({ isOpen, onClose, conversationHistory = [], uploadedFiles = [], onClearHistory, onSelectQuery }) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const recentQueries = (conversationHistory || []).slice(0, 5).map(h => ({
    type: 'query',
    label: h.question,
    meta: 'Recent query',
    action: () => { onSelectQuery?.(h.question); onClose(); },
  }));

  const docItems = (uploadedFiles || []).slice(0, 5).map(f => ({
    type: 'doc',
    label: f,
    meta: 'Document',
    action: () => { onClose(); },
  }));

  const actionItems = [
    { type: 'action', label: 'Clear conversation history', meta: 'Action', action: () => { onClearHistory?.(); onClose(); } },
    { type: 'action', label: 'Export chat as text', meta: 'Action',
      action: () => {
        const text = (conversationHistory || []).map(h => `Q: ${h.question}\nA: ${h.answer}`).join('\n\n---\n\n');
        const blob = new Blob([text], { type: 'text/plain' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
        a.download = 'rag-chat-export.txt'; a.click();
        onClose();
      }
    },
  ];

  const allItems = [...recentQueries, ...docItems, ...actionItems];

  const filtered = query.trim()
    ? allItems.filter(i => i.label.toLowerCase().includes(query.toLowerCase()))
    : allItems;

  const handleKey = useCallback((e) => {
    if (!isOpen) return;
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i+1, filtered.length-1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIndex(i => Math.max(i-1, 0)); }
    if (e.key === 'Enter') { filtered[activeIndex]?.action?.(); }
  }, [isOpen, filtered, activeIndex, onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  const typeIcon = (type) => {
    if (type === 'query')  return <span style={{ color: '#f5f5f7', fontSize: 12 }}>›</span>;
    if (type === 'doc')    return <span style={{ color: 'rgba(245,245,247,0.55)', fontSize: 12 }}>◈</span>;
    if (type === 'action') return <span style={{ color: 'rgba(245,245,247,0.4)', fontSize: 12 }}>⚡</span>;
    return null;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(5,7,13,0.75)',
            backdropFilter: 'blur(6px)', zIndex: 10000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
          }}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: -10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: -10 }}
            transition={{ duration: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 560,
              background: 'rgba(10,15,28,0.95)',
              border: '1px solid rgba(245,245,247,0.3)',
              borderRadius: 16, overflow: 'hidden',
              boxShadow: '0 0 0 0.5px rgba(255,255,255,0.12), 0 25px 60px rgba(0,0,0,0.8)',
            }}
          >
            {/* Search input */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid rgba(245,245,247,0.1)', gap: 10 }}>
              <span style={{ color: 'rgba(245,245,247,0.35)', fontFamily: 'JetBrains Mono', fontSize: 16 }}>⌘</span>
              <input
                ref={inputRef}
                value={query}
                onChange={e => { setQuery(e.target.value); setActiveIndex(0); }}
                placeholder="> type a command or search..."
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  color: 'rgba(230,241,255,0.9)', fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 14,
                }}
              />
              <kbd style={{ fontSize: 10, color: 'rgba(230,241,255,0.3)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, padding: '2px 6px', fontFamily: 'JetBrains Mono' }}>ESC</kbd>
            </div>

            {/* Results */}
            <div style={{ maxHeight: 340, overflowY: 'auto', padding: '8px 0' }}>
              {filtered.length === 0 && (
                <div style={{ padding: '24px', textAlign: 'center', color: 'rgba(230,241,255,0.3)', fontSize: 13, fontFamily: 'JetBrains Mono' }}>
                  No results for "{query}"
                </div>
              )}
              {filtered.map((item, i) => (
                <motion.div
                  key={i}
                  whileHover={{ x: 4 }}
                  onClick={item.action}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 16px', cursor: 'pointer',
                    background: i === activeIndex ? 'rgba(255,255,255,0.05)' : 'transparent',
                    borderLeft: i === activeIndex ? '2px solid rgba(245,245,247,0.4)' : '2px solid transparent',
                    transition: 'background 0.1s',
                  }}
                >
                  <span style={{ width: 16, flexShrink: 0 }}>{typeIcon(item.type)}</span>
                  <span style={{ flex: 1, fontSize: 13, color: 'rgba(230,241,255,0.85)', fontFamily: 'JetBrains Mono', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.label}
                  </span>
                  <span style={{ fontSize: 10, color: 'rgba(230,241,255,0.3)', flexShrink: 0 }}>{item.meta}</span>
                </motion.div>
              ))}
            </div>

            {/* Footer */}
            <div style={{ padding: '8px 16px', borderTop: '1px solid rgba(245,245,247,0.08)', display: 'flex', gap: 16 }}>
              {[['↑↓','navigate'],['↵','select'],['esc','close']].map(([key, label]) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <kbd style={{ fontSize: 10, color: 'rgba(230,241,255,0.4)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, padding: '1px 5px', fontFamily: 'JetBrains Mono' }}>{key}</kbd>
                  <span style={{ fontSize: 10, color: 'rgba(230,241,255,0.25)' }}>{label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
