import { motion, AnimatePresence } from 'framer-motion';

const HEROES = [
  { colour:'#c0391b', label:'STARK',   delay:0 },
  { colour:'#1a4a8a', label:'ROGERS',  delay:0.1 },
  { colour:'#c0a030', label:'ODINSON', delay:0.2 },
  { colour:'#8b5cf6', label:"T'CHALLA",delay:0.3 },
  { colour:'#16a34a', label:'BANNER',  delay:0.4 },
];

export default function LoadingOverlay({ isLoading }) {
  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity:0 }}
          animate={{ opacity:1 }}
          exit={{ opacity:0 }}
          transition={{ duration:0.2 }}
          style={{ position:'fixed', inset:0, background:'rgba(6,6,10,0.88)', backdropFilter:'blur(6px)', zIndex:9000, display:'flex', alignItems:'center', justifyContent:'center' }}
        >
          <motion.div
            initial={{ opacity:0, scale:0.88, y:16 }}
            animate={{ opacity:1, scale:1, y:0 }}
            exit={{ opacity:0, scale:0.88 }}
            transition={{ delay:0.06, type:'spring', stiffness:380, damping:28 }}
            style={{
              background:'#161620', border:'1px solid rgba(245,240,232,0.08)',
              borderRadius:10, padding:'32px 44px',
              display:'flex', flexDirection:'column', alignItems:'center', gap:22,
              boxShadow:'0 0 0 1px rgba(245,240,232,0.04), 0 24px 64px rgba(0,0,0,0.9)',
              minWidth:280,
            }}
          >
            {/* 5-ring hero spinner */}
            <div style={{ position:'relative', width:64, height:64, display:'flex', alignItems:'center', justifyContent:'center' }}>
              {HEROES.map((h,i) => (
                <div key={i} style={{
                  position:'absolute',
                  width: 64 - i*10, height: 64 - i*10,
                  borderRadius:'50%',
                  border:`1.5px solid transparent`,
                  borderTopColor: h.colour,
                  opacity:0.85,
                  animation:`spin ${0.9 + i*0.15}s linear infinite ${i%2===0?'':'reverse'}`,
                }}/>
              ))}
              {/* A logo centre */}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <polygon points="8,1 15,14 1,14" fill="none" stroke="rgba(245,240,232,0.5)" strokeWidth="1.5"/>
                <polygon points="8,5 12,12 4,12" fill="rgba(245,240,232,0.06)" stroke="rgba(245,240,232,0.2)" strokeWidth="0.8"/>
              </svg>
            </div>

            {/* Status */}
            <div style={{ textAlign:'center' }}>
              <p style={{ fontFamily:'Rajdhani, sans-serif', fontWeight:700, fontSize:14, letterSpacing:'0.14em', textTransform:'uppercase', color:'#f5f0e8', margin:'0 0 8px' }}>
                AVENGERS PROCESSING
              </p>
              {/* Hero status bar */}
              <div style={{ display:'flex', gap:8, justifyContent:'center', marginBottom:8 }}>
                {HEROES.map((h,i) => (
                  <motion.div key={i}
                    initial={{ opacity:0.2 }}
                    animate={{ opacity:[0.2,1,0.2] }}
                    transition={{ duration:1.2, delay:h.delay, repeat:Infinity, ease:'easeInOut' }}
                    style={{ fontFamily:'Rajdhani, sans-serif', fontSize:8, fontWeight:700, letterSpacing:'0.1em', color:h.colour }}
                  >
                    {h.label}
                  </motion.div>
                ))}
              </div>
              <p style={{ fontFamily:'Space Mono, monospace', fontSize:10, color:'rgba(245,240,232,0.35)', margin:0 }}>
                Analyzing intelligence data...
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
