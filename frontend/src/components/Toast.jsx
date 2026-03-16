import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const CFG = {
  success: { icon:'✓', colour:'var(--av-thor-lt)',    bg:'rgba(192,160,48,0.08)', border:'rgba(192,160,48,0.3)' },
  error:   { icon:'✕', colour:'var(--av-iron-lt)',    bg:'rgba(192,57,27,0.1)',   border:'rgba(192,57,27,0.35)' },
  info:    { icon:'◈', colour:'var(--av-cap-lt)',     bg:'rgba(26,74,138,0.1)',   border:'rgba(26,74,138,0.3)' },
  warning: { icon:'!', colour:'var(--av-panther-lt)', bg:'rgba(139,92,246,0.08)',  border:'rgba(139,92,246,0.3)' },
};
const DUR = 4000;

export default function Toast({ message, type='info', onClose }) {
  const [pct, setPct] = useState(100);
  const c = CFG[type] || CFG.info;

  useEffect(() => {
    if (!message) return;
    setPct(100);
    const t0 = Date.now();
    const iv = setInterval(() => {
      const r = Math.max(0, 100 - ((Date.now()-t0)/DUR)*100);
      setPct(r);
      if (r <= 0) { clearInterval(iv); onClose?.(); }
    }, 30);
    return () => clearInterval(iv);
  }, [message]);

  return (
    <div style={{ position:'fixed', top:16, right:16, zIndex:50000, pointerEvents:'none' }}>
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity:0, x:50, scale:0.95 }}
            animate={{ opacity:1, x:0,  scale:1 }}
            exit={{ opacity:0, x:50, scale:0.95 }}
            transition={{ type:'spring', stiffness:450, damping:32 }}
            style={{ pointerEvents:'all' }}
          >
            <div onClick={onClose} style={{
              background:'#161620', border:`1px solid ${c.border}`,
              borderTop:`2px solid ${c.colour}`,
              minWidth:250, maxWidth:370, cursor:'pointer',
              boxShadow:'0 8px 32px rgba(0,0,0,0.8)',
              overflow:'hidden', position:'relative', borderRadius:6,
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px' }}>
                <div style={{
                  width:24, height:24, flexShrink:0, display:'flex',
                  alignItems:'center', justifyContent:'center', borderRadius:4,
                  background:c.bg, border:`1px solid ${c.border}`,
                  fontFamily:'Rajdhani, sans-serif', fontWeight:700, fontSize:12,
                  color:c.colour,
                }}>{c.icon}</div>
                <span style={{ flex:1, fontSize:12, fontFamily:'Space Mono, monospace', color:'var(--av-text)', lineHeight:1.5 }}>{message}</span>
                <button onClick={e=>{e.stopPropagation();onClose?.();}} style={{ background:'none', border:'none', color:'var(--av-muted)', fontSize:18, cursor:'pointer', lineHeight:1, paddingLeft:8 }}>×</button>
              </div>
              <div style={{ height:2, background:'rgba(245,240,232,0.05)' }}>
                <div style={{ height:'100%', background:c.colour, width:`${pct}%`, opacity:0.7, transition:'none' }}/>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
