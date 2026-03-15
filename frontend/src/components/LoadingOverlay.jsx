import { motion, AnimatePresence } from 'framer-motion';

export default function LoadingOverlay({ isLoading }) {
  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity:0 }}
          animate={{ opacity:1 }}
          exit={{ opacity:0 }}
          transition={{ duration:0.2 }}
          style={{ position:'fixed', inset:0, background:'rgba(10,6,2,0.85)', backdropFilter:'blur(4px)', zIndex:9000, display:'flex', alignItems:'center', justifyContent:'center' }}
        >
          <motion.div
            initial={{ opacity:0, scale:0.9, y:10 }}
            animate={{ opacity:1, scale:1, y:0 }}
            exit={{ opacity:0, scale:0.9 }}
            transition={{ delay:0.05, type:'spring', stiffness:400, damping:28 }}
            style={{
              background:'#1e1108', border:'1px solid rgba(192,57,27,0.35)',
              padding:'32px 48px', display:'flex', flexDirection:'column',
              alignItems:'center', gap:20,
              boxShadow:'0 0 60px rgba(192,57,27,0.25), 0 20px 60px rgba(0,0,0,0.9)',
              clipPath:'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))',
            }}
          >
            <div style={{ position:'relative', width:64, height:64, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <div style={{ position:'absolute', width:64, height:64, borderRadius:'50%', border:'1px solid rgba(192,57,27,0.15)' }}/>
              <div style={{ position:'absolute', width:48, height:48, borderRadius:'50%', border:'1px solid rgba(232,130,74,0.12)' }}/>
              <div style={{ position:'absolute', width:64, height:64, borderRadius:'50%', border:'2px solid transparent', borderTopColor:'var(--im-orange)', borderRightColor:'rgba(192,57,27,0.3)', animation:'arc-spin 1s linear infinite' }}/>
              <div style={{ position:'absolute', width:48, height:48, borderRadius:'50%', border:'1px solid transparent', borderTopColor:'rgba(192,57,27,0.6)', animation:'arc-spin 0.7s linear infinite reverse' }}/>
              <div style={{ width:16, height:16, borderRadius:'50%', background:'radial-gradient(circle, rgba(232,130,74,0.8) 0%, rgba(192,57,27,0.3) 60%, transparent 100%)', animation:'hud-pulse 1.2s ease-in-out infinite' }}/>
            </div>
            <div style={{ textAlign:'center' }}>
              <p style={{ fontFamily:'Orbitron, sans-serif', fontWeight:900, fontSize:13, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--im-orange)', margin:'0 0 6px' }}>JARVIS PROCESSING</p>
              <p style={{ fontFamily:'Share Tech Mono, monospace', fontSize:11, color:'var(--im-muted)', letterSpacing:'0.06em', margin:0 }}>// ANALYZING DOCUMENTS //</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
