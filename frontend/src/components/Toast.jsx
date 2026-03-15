import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ICONS = {
  success: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" fill="rgba(245,245,247,0.1)"/>
      <path d="M4.5 8l2.5 2.5 4.5-4.5" stroke="#f5f5f7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  error: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" fill="rgba(255,59,48,0.1)"/>
      <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="#ff3b30" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  info: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" fill="rgba(245,245,247,0.1)"/>
      <path d="M8 7v4M8 5.5v.5" stroke="#f5f5f7" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
};

const DURATION = 3000;

export default function Toast({ message, type = 'info', onClose }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => onClose?.(), DURATION);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[50000] pointer-events-none flex flex-col gap-2">
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95, filter: 'blur(4px)' }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="pointer-events-auto"
          >
            <div 
              onClick={onClose}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer"
              style={{
                background: 'rgba(20,20,20,0.85)',
                backdropFilter: 'blur(20px)',
                border: '0.5px solid rgba(255,255,255,0.15)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                minWidth: '280px'
              }}
            >
              <div className="flex-shrink-0">{ICONS[type] || ICONS.info}</div>
              <span className="text-[13px] font-medium tracking-tight text-[#f5f5f7]">
                {message}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
