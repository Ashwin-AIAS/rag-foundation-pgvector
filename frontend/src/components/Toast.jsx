import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const CFG = {
  success: { icon: '✓', color: 'var(--im-gold)',   bg: 'rgba(245,166,35,0.08)',  border: 'rgba(245,166,35,0.3)'  },
  error:   { icon: '✕', color: 'var(--im-crimson)', bg: 'rgba(192,57,27,0.1)',   border: 'rgba(192,57,27,0.35)'  },
  info:    { icon: '◈', color: 'var(--im-orange)',  bg: 'rgba(232,130,74,0.07)', border: 'rgba(232,130,74,0.25)' },
  warning: { icon: '!', color: 'var(--im-gold)',    bg: 'rgba(245,166,35,0.06)', border: 'rgba(245,166,35,0.2)'  },
};
const DUR = 4000;

export default function Toast({ message, type = 'info', onClose }) {
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
            initial={{ opacity:0, x:60, scale:0.95 }}
            animate={{ opacity:1, x:0, scale:1 }}
            exit={{ opacity:0, x:60, scale:0.95 }}
            transition={{ type:'spring', stiffness:450, damping:32 }}
            style={{ pointerEvents:'all' }}
          >
            <div onClick={onClose} style={{
              background:'#1e1108', border:`1px solid ${c.border}`,
              minWidth:240, maxWidth:360, cursor:'pointer',
              boxShadow:`0 0 30px rgba(192,57,27,0.2), 0 8px 32px rgba(0,0,0,0.8)`,
              overflow:'hidden', position:'relative',
              clipPath:'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))',
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px' }}>
                <div style={{
                  width:24, height:24, flexShrink:0, display:'flex',
                  alignItems:'center', justifyContent:'center',
                  background:c.bg, border:`1px solid ${c.border}`,
                  fontFamily:'Orbitron, sans-serif', fontWeight:700, fontSize:11,
                  color:c.color,
                  clipPath:'polygon(3px 0%,100% 0%,calc(100% - 3px) 100%,0% 100%)',
                }}>{c.icon}</div>
                <span style={{ flex:1, fontSize:12, color:'var(--im-cream)', fontFamily:'Share Tech Mono, monospace', lineHeight:1.45 }}>{message}</span>
                <button onClick={e=>{e.stopPropagation();onClose?.();}} style={{ background:'none',border:'none',color:'var(--im-muted)',fontSize:16,cursor:'pointer',paddingLeft:8 }}>×</button>
              </div>
              <div style={{ position:'absolute', bottom:0, left:0, right:0, height:2, background:'rgba(192,57,27,0.15)' }}>
                <div style={{ height:'100%', background:`linear-gradient(90deg, var(--im-crimson), var(--im-orange))`, width:`${pct}%`, boxShadow:'0 0 6px rgba(232,130,74,0.5)' }}/>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
