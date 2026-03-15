import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ICONS = {
  success: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" stroke="#39FF14" strokeWidth="1.2"/>
      <path d="M4.5 8l2.5 2.5 4.5-4.5" stroke="#39FF14" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  error: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" stroke="#ef4444" strokeWidth="1.2"/>
      <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  info: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" stroke="#00d4ff" strokeWidth="1.2"/>
      <path d="M8 7v4M8 5.5v.5" stroke="#00d4ff" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  warning: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 2L14.5 13H1.5L8 2z" stroke="#fbbf24" strokeWidth="1.2" strokeLinejoin="round"/>
      <path d="M8 7v3M8 11.5v.5" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
};

const COLORS = {
  success: { border: 'rgba(57,255,20,0.3)',  glow: 'rgba(57,255,20,0.1)',  bar: '#39FF14' },
  error:   { border: 'rgba(239,68,68,0.3)',  glow: 'rgba(239,68,68,0.1)', bar: '#ef4444' },
  info:    { border: 'rgba(0,212,255,0.3)',  glow: 'rgba(0,212,255,0.1)', bar: '#00d4ff' },
  warning: { border: 'rgba(251,191,36,0.3)', glow: 'rgba(251,191,36,0.1)',bar: '#fbbf24' },
};

const DURATION = 4000;

export default function Toast({ message, type = 'info', onClose }) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!message) return;
    setProgress(100);
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / DURATION) * 100);
      setProgress(remaining);
      if (remaining <= 0) { clearInterval(interval); onClose?.(); }
    }, 30);
    return () => clearInterval(interval);
  }, [message]);

  const c = COLORS[type] || COLORS.info;

  return (
    <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 50000, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none' }}>
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, x: 60, scale: 0.95 }}
            animate={{ opacity: 1, x: 0,  scale: 1 }}
            exit={{ opacity: 0, x: 60, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            style={{ pointerEvents: 'all' }}
          >
            <div
              onClick={onClose}
              style={{
                background: 'rgba(10,15,28,0.95)',
                border: `1px solid ${c.border}`,
                borderRadius: 12,
                padding: '12px 14px',
                minWidth: 260, maxWidth: 380,
                cursor: 'pointer',
                boxShadow: `0 0 30px ${c.glow}, 0 8px 24px rgba(0,0,0,0.5)`,
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flexShrink: 0 }}>{ICONS[type] || ICONS.info}</div>
                <span style={{ fontSize: 13, color: 'rgba(230,241,255,0.9)', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1.4 }}>
                  {message}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); onClose?.(); }}
                  style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'rgba(230,241,255,0.3)', fontSize: 16, cursor: 'pointer', lineHeight: 1, paddingLeft: 8 }}
                >
                  ×
                </button>
              </div>

              {/* Progress bar */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: 'rgba(255,255,255,0.04)' }}>
                <motion.div
                  style={{ height: '100%', background: c.bar, width: `${progress}%`, originX: 0 }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
