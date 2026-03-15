# RAG Terminal — Complete Agentic Implementation Prompts
## All 8 Prompts · Phases 1–4 · Ready for Antigravity

---

## PHASE 1 · PROMPT 1A
### Font System, Colour Tokens & Tailwind Config

```
You are an expert frontend engineer upgrading the RAG Terminal app — a dark-themed React + Vite + Tailwind CSS single-page application.

CONTEXT:
- App lives at frontend/
- Current font: Inter (system font via Tailwind)
- Current brand: cyber-primary #00d4ff, cyber-secondary #a855f7, cyber-darker #05070d, cyber-text rgba(255,255,255,0.87)
- Tailwind config is at frontend/tailwind.config.js
- Global styles are at frontend/src/index.css
- HTML entry is at frontend/index.html

YOUR TASK: Execute all of the following changes exactly. Do not change any React component logic.

────────────────────────────────────────
STEP 1 — frontend/index.html
────────────────────────────────────────
Inside <head>, BEFORE the existing <title> tag, add these two blocks:

<!-- Font preconnect -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

<!-- Font load: Orbitron (display) + JetBrains Mono (terminal) -->
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;900&family=JetBrains+Mono:wght@300;400;500;600&display=swap" rel="stylesheet">

Also update <title> from "frontend" to "RAG Terminal".

────────────────────────────────────────
STEP 2 — frontend/tailwind.config.js
────────────────────────────────────────
Replace the entire contents of tailwind.config.js with this exact file:

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"JetBrains Mono"', 'monospace'],
        display: ['"Orbitron"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        'cyber-primary':  '#00d4ff',
        'cyber-secondary': '#a855f7',
        'cyber-darker':   '#05070d',
        'cyber-dark':     '#0a0f1c',
        'cyber-text':     'rgba(255,255,255,0.87)',
        // New accent tokens
        'neon-green':     '#39FF14',
        'plasma':         '#a855f7',
        'hot-amber':      '#fbbf24',
        'cyber-red':      '#ef4444',
        // Glass surface tokens
        'glass-surface':  'rgba(10,15,28,0.60)',
        'glass-border':   'rgba(0,212,255,0.18)',
      },
      boxShadow: {
        'neon-sm':  '0 0 8px rgba(0,212,255,0.3)',
        'neon-md':  '0 0 20px rgba(0,212,255,0.25)',
        'neon-lg':  '0 0 40px rgba(0,212,255,0.2)',
        'neon-purple': '0 0 20px rgba(168,85,247,0.3)',
        'neon-green':  '0 0 20px rgba(57,255,20,0.3)',
      },
      animation: {
        'pulse-neon':   'pulse-neon 2s cubic-bezier(0.4,0,0.6,1) infinite',
        'scan-line':    'scan-line 8s linear infinite',
        'border-flow':  'border-flow 3s linear infinite',
        'flicker':      'flicker 0.15s infinite',
        'data-stream':  'data-stream 1.5s ease-in-out infinite',
      },
      keyframes: {
        'pulse-neon': {
          '0%, 100%': { boxShadow: '0 0 8px rgba(0,212,255,0.3)' },
          '50%':       { boxShadow: '0 0 25px rgba(0,212,255,0.7)' },
        },
        'scan-line': {
          '0%':   { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        'border-flow': {
          '0%':   { backgroundPosition: '0% 50%' },
          '50%':  { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        'flicker': {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.8' },
        },
        'data-stream': {
          '0%':   { strokeDashoffset: '100' },
          '100%': { strokeDashoffset: '0' },
        },
      },
    },
  },
  plugins: [],
}

────────────────────────────────────────
STEP 3 — frontend/src/index.css
────────────────────────────────────────
At the very TOP of index.css (before all existing rules), add this block:

/* ── CSS Custom Properties ─────────────────────────────────── */
:root {
  --font-display: 'Orbitron', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  --cyber-primary: #00d4ff;
  --cyber-secondary: #a855f7;
  --cyber-darker: #05070d;
  --cyber-dark: #0a0f1c;
  --neon-green: #39FF14;
  --hot-amber: #fbbf24;
  --cyber-red: #ef4444;

  /* Glass card system */
  --glass-bg: rgba(10, 15, 28, 0.60);
  --glass-border: rgba(0, 212, 255, 0.18);
  --glass-border-hover: rgba(0, 212, 255, 0.45);
  --glass-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,212,255,0.05) inset;

  /* Transition timings */
  --t-fast: 120ms;
  --t-normal: 250ms;
  --t-slow: 400ms;
}

/* ── Global font override ───────────────────────────────────── */
html, body, #root {
  font-family: 'JetBrains Mono', monospace !important;
}

h1, h2, h3,
.font-display,
[class*="RAG"],
.rag-brand {
  font-family: 'Orbitron', sans-serif !important;
  letter-spacing: 0.06em;
}

/* ── Glass card utility ─────────────────────────────────────── */
.glass-card {
  background: var(--glass-bg);
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  border: 1px solid var(--glass-border);
  border-radius: 14px;
  box-shadow: var(--glass-shadow);
  transition: border-color var(--t-normal) ease, box-shadow var(--t-normal) ease;
}

.glass-card:hover {
  border-color: var(--glass-border-hover);
  box-shadow: var(--glass-shadow), 0 0 30px rgba(0,212,255,0.08);
}

.glass-card:focus-within {
  border-color: rgba(0, 212, 255, 0.55);
  box-shadow: var(--glass-shadow), 0 0 0 3px rgba(0,212,255,0.12);
}

/* ── Scan-line overlay ──────────────────────────────────────── */
body::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9998;
  background-image: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 0, 0, 0.03) 2px,
    rgba(0, 0, 0, 0.03) 4px
  );
}

/* Subtle scan-line sweep */
body::after {
  content: '';
  position: fixed;
  left: 0;
  top: 0;
  width: 100%;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(0,212,255,0.15), transparent);
  pointer-events: none;
  z-index: 9999;
  animation: scan-line 8s linear infinite;
}

@keyframes scan-line {
  0%   { transform: translateY(-4px); }
  100% { transform: translateY(100vh); }
}

/* ── Neon glow pulse for active elements ────────────────────── */
@keyframes pulse-neon {
  0%, 100% { box-shadow: 0 0 8px rgba(0,212,255,0.3); }
  50%       { box-shadow: 0 0 25px rgba(0,212,255,0.7); }
}

/* ── Gradient animated border ───────────────────────────────── */
.border-gradient-animated {
  position: relative;
  border-radius: 14px;
}
.border-gradient-animated::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: 15px;
  background: linear-gradient(90deg, #00d4ff, #a855f7, #39FF14, #00d4ff);
  background-size: 300% 100%;
  animation: border-flow 3s linear infinite;
  z-index: -1;
  opacity: 0;
  transition: opacity 0.3s;
}
.border-gradient-animated:hover::before,
.border-gradient-animated:focus-within::before {
  opacity: 1;
}

@keyframes border-flow {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

Now find the existing h1 in App.jsx (the "RAG TERMINAL" heading) and ensure its className includes font-display. Specifically, find:
  className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent ...
and add  font-display  after  font-bold.

Do not change any other component logic. Run: cd frontend && npm run build to verify no errors.
```

---

## PHASE 1 · PROMPT 1B
### Neural Grid Background + App Layout Glass Cards

```
You are upgrading the RAG Terminal React app's visual background and card system.

CONTEXT — existing file locations:
- frontend/src/App.jsx — main layout
- frontend/src/index.css — global styles (glass-card class already added in prior step)
- Tailwind config already has neon-green, plasma, hot-amber, glass-surface, glass-border tokens
- framer-motion is already installed (version ^11.0.0)

YOUR TASK: Two changes — (1) replace static background blobs with an animated SVG grid, (2) apply glass-card to the main panels.

────────────────────────────────────────
STEP 1 — Create frontend/src/components/AnimatedBackground.jsx
────────────────────────────────────────
Create this file exactly:

import { useEffect, useRef } from 'react';

export default function AnimatedBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;
    let raf;

    const PARTICLE_COUNT = 70;
    const CONNECT_DIST = 130;
    const COLORS = ['#00d4ff', '#a855f7', '#39FF14'];

    const particles = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 2 + 1,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));

    let mouse = { x: -999, y: -999 };
    const onMouseMove = (e) => { mouse.x = e.clientX; mouse.y = e.clientY; };
    window.addEventListener('mousemove', onMouseMove);

    const onResize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);

    function hexToRgb(hex) {
      const r = parseInt(hex.slice(1,3),16);
      const g = parseInt(hex.slice(3,5),16);
      const b = parseInt(hex.slice(5,7),16);
      return `${r},${g},${b}`;
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Mouse repulsion
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 120) {
          const force = (120 - dist) / 120 * 0.8;
          p.vx += (dx / dist) * force * 0.4;
          p.vy += (dy / dist) * force * 0.4;
        }

        // Velocity damping
        p.vx *= 0.99;
        p.vy *= 0.99;

        // Speed cap
        const speed = Math.sqrt(p.vx*p.vx + p.vy*p.vy);
        if (speed > 1.2) { p.vx = (p.vx/speed)*1.2; p.vy = (p.vy/speed)*1.2; }

        p.x += p.vx;
        p.y += p.vy;

        // Wrap
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;

        // Draw edges to nearby particles
        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const ex = p.x - q.x;
          const ey = p.y - q.y;
          const ed = Math.sqrt(ex*ex + ey*ey);
          if (ed < CONNECT_DIST) {
            const alpha = (1 - ed / CONNECT_DIST) * 0.25;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(${hexToRgb(p.color)},${alpha})`;
            ctx.lineWidth = 0.6;
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
        }

        // Draw node
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${hexToRgb(p.color)},0.75)`;
        ctx.fill();

        // Glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r + 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${hexToRgb(p.color)},0.12)`;
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: -1,
        opacity: 0.7,
      }}
    />
  );
}

────────────────────────────────────────
STEP 2 — Modify frontend/src/App.jsx
────────────────────────────────────────
At the top of App.jsx, add this import after the last existing import:
  import AnimatedBackground from './components/AnimatedBackground';

Find the existing background effects div that looks like:
  <div className="fixed inset-0 pointer-events-none z-[-1]">
    <div className="absolute top-0 left-1/2 ... bg-cyber-primary/10 ... blur-[120px] ..."></div>
    <div className="absolute bottom-0 right-0 ... bg-cyber-secondary/10 ... blur-[100px] ..."></div>
  </div>

Replace that entire div with:
  <AnimatedBackground />

Then, for each of the following panel elements, add the class  glass-card  to their existing className string:
1. The <main> element that wraps the left content column — add  glass-card  and  p-4  to its classes.
2. The <aside> element for the right sidebar — add  glass-card  to its classes.
3. Any top-level div that wraps the FileUpload component.
4. Any top-level div that wraps the QuestionInput component.
5. Any top-level div that wraps the AnswerDisplay component.

Do not change any state logic, callbacks, or API calls. Only visual className changes and adding AnimatedBackground.

────────────────────────────────────────
STEP 3 — Add depth grid to body background
────────────────────────────────────────
In frontend/src/index.css, find the existing body rule and APPEND (do not replace) this to it:

body {
  background-image:
    linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px);
  background-size: 50px 50px;
}

Run: cd frontend && npm run build to verify no TypeScript/ESLint errors.
```

---

## PHASE 2 · PROMPT 2A
### Spring Micro-interactions & Stagger Entrance Animations

```
You are upgrading the micro-interaction layer of the RAG Terminal React app.

CONTEXT:
- framer-motion ^11.0.0 is already installed
- Files to modify: frontend/src/App.jsx, frontend/src/components/QuestionInput.jsx, frontend/src/components/FileUpload.jsx, frontend/src/components/AnswerDisplay.jsx
- Do NOT modify any API call logic, state handlers, or prop interfaces
- Tailwind and CSS variables are already configured

────────────────────────────────────────
STEP 1 — frontend/src/App.jsx — Stagger entrance
────────────────────────────────────────
At the top of App.jsx add this import (merge with existing framer-motion import if present):
  import { motion, AnimatePresence } from 'framer-motion';

Define these animation variants OUTSIDE the App component function, at module level:

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden:  { opacity: 0, y: 24, scale: 0.98 },
  visible: { opacity: 1, y: 0,  scale: 1,
    transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }
  },
};

In the JSX, wrap the flex/grid container that holds the FileUpload column, the Q&A column, and the sidebar with:
  <motion.div variants={containerVariants} initial="hidden" animate="visible">
    ...existing children...
  </motion.div>

Wrap each direct child panel (the left column div, the Q&A div, the aside) with:
  <motion.div variants={itemVariants}>
    ...existing content...
  </motion.div>

For the AnswerDisplay wrapper div, replace it with:
  <AnimatePresence mode="wait">
    {(currentAnswer || isQuerying) && (
      <motion.div
        key={currentAnswer?.question || 'loading'}
        variants={itemVariants}
        initial="hidden"
        animate="visible"
        exit={{ opacity: 0, y: -10, transition: { duration: 0.2 } }}
      >
        <AnswerDisplay ... />
      </motion.div>
    )}
  </AnimatePresence>

────────────────────────────────────────
STEP 2 — frontend/src/components/QuestionInput.jsx — Terminal bar & ripple
────────────────────────────────────────
Add this import at top:
  import { motion, useMotionValue, useTransform } from 'framer-motion';

Replace the existing <motion.button> submit button with this exact block:

<motion.button
  whileHover={{ scale: 1.04, boxShadow: '0 0 20px rgba(0, 212, 255, 0.5)' }}
  whileTap={{ scale: 0.96 }}
  transition={{ type: 'spring', stiffness: 400, damping: 17 }}
  type="submit"
  disabled={disabled || isLoading || !question.trim()}
  data-cursor-hover="true"
  className={`
    relative overflow-hidden px-6 py-3 rounded-lg font-bold uppercase tracking-wider text-sm
    transition-all duration-300 font-display
    ${disabled || isLoading || !question.trim()
      ? 'bg-cyber-darker border border-cyber-text/10 text-cyber-text/20 cursor-not-allowed'
      : 'bg-gradient-to-r from-cyber-primary to-[#00a3cc] text-black border border-cyber-primary shadow-neon-sm'
    }
  `}
>
  {isLoading ? (
    <span className="flex items-center gap-2">
      <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25"/>
        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
      </svg>
      PROCESSING
    </span>
  ) : 'EXECUTE'}
</motion.button>

Wrap the entire input text field in a motion.div with:
  <motion.div
    animate={{ boxShadow: question.length > 0 ? '0 0 15px rgba(0,212,255,0.2)' : '0 0 0px transparent' }}
    transition={{ duration: 0.3 }}
    className="relative flex-1"
  >
    ...existing input...
  </motion.div>

Add a blinking cursor prefix to the placeholder. Change the input's placeholder to:
  {disabled ? '> SYSTEM OFFLINE — upload documents to activate' : '> ENTER QUERY PROTOCOL...'}

────────────────────────────────────────
STEP 3 — frontend/src/components/FileUpload.jsx — Animated drag zone
────────────────────────────────────────
Add these imports at the top:
  import { motion, AnimatePresence } from 'framer-motion';
  import { useState, useCallback } from 'react';  // (merge with existing useState import)

Add state for drag tracking (add alongside existing useState declarations):
  const [isDragging, setIsDragging] = useState(false);
  const [particles, setParticles] = useState([]);

Add these drag event handlers inside the component:
  const handleDragOver = useCallback((e) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback(() => setIsDragging(false), []);
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileChange({ target: { files: [file] } });
  }, []);

  const triggerParticles = useCallback(() => {
    const newParticles = Array.from({ length: 12 }, (_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 100,
      angle: (i / 12) * 360,
      color: ['#00d4ff','#a855f7','#39FF14'][i % 3],
    }));
    setParticles(newParticles);
    setTimeout(() => setParticles([]), 1000);
  }, []);

In the existing success handling (where successMessage is set), add: triggerParticles();

Wrap the outermost container div with:
  <motion.div
    onDragOver={handleDragOver}
    onDragLeave={handleDragLeave}
    onDrop={handleDrop}
    animate={{
      borderColor: isDragging ? 'rgba(0,212,255,0.8)' : 'rgba(0,212,255,0.2)',
      boxShadow: isDragging ? '0 0 30px rgba(0,212,255,0.3), inset 0 0 30px rgba(0,212,255,0.05)' : '0 0 0px transparent',
      scale: isDragging ? 1.02 : 1,
    }}
    transition={{ duration: 0.2 }}
    className="relative"
  >
    {/* Particle burst on success */}
    <AnimatePresence>
      {particles.map(p => (
        <motion.div
          key={p.id}
          initial={{ opacity: 1, scale: 1, x: `${p.x}%`, y: '50%' }}
          animate={{
            opacity: 0, scale: 0,
            x: `${p.x + Math.cos(p.angle * Math.PI/180) * 60}%`,
            y: `${50 + Math.sin(p.angle * Math.PI/180) * 60}%`,
          }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{
            position: 'absolute', width: 6, height: 6, borderRadius: '50%',
            background: p.color, pointerEvents: 'none', zIndex: 10,
          }}
        />
      ))}
    </AnimatePresence>
    ...existing children...
  </motion.div>

Do not alter any upload API logic, error handling, or success callback props.
```

---

## PHASE 2 · PROMPT 2B
### Neon Pulse Borders + History Item Micro-animations

```
You are adding the final motion layer to the RAG Terminal React app's sidebar and log components.

CONTEXT:
- framer-motion ^11.0.0 is installed
- Files to modify: frontend/src/components/ConversationHistory.jsx, frontend/src/components/HistoryItem.jsx, frontend/src/index.css
- Do NOT change any data logic, state, or callback props

────────────────────────────────────────
STEP 1 — frontend/src/index.css — Neon pulse keyframe
────────────────────────────────────────
Add this block anywhere in index.css (append to end):

/* ── Neon border pulse on focused glass cards ────────────────── */
@keyframes neon-pulse {
  0%, 100% { border-color: rgba(0,212,255,0.18); box-shadow: 0 0 8px rgba(0,212,255,0.1); }
  50%       { border-color: rgba(0,212,255,0.55); box-shadow: 0 0 20px rgba(0,212,255,0.25); }
}

.glass-card:focus-within {
  animation: neon-pulse 1.8s ease-in-out infinite;
}

/* ── History item neon accent bar ───────────────────────────── */
.history-item-refusal {
  border-left: 3px solid rgba(168,85,247,0.6) !important;
}

.history-item-success {
  border-left: 3px solid rgba(0,212,255,0.5) !important;
}

/* ── Scrollbar styling ──────────────────────────────────────── */
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(0,212,255,0.2);
  border-radius: 2px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(0,212,255,0.4);
}

────────────────────────────────────────
STEP 2 — frontend/src/components/HistoryItem.jsx — Spring card
────────────────────────────────────────
The existing HistoryItem already uses framer-motion. Upgrade its motion.div:

Find the existing <motion.div layout initial={{ opacity: 0, x: -20 }} ...> wrapper and REPLACE the entire motion.div attributes (not children) with:

<motion.div
  layout
  initial={{ opacity: 0, x: -20, scale: 0.97 }}
  animate={{ opacity: 1, x: 0, scale: 1 }}
  exit={{ opacity: 0, x: -20, scale: 0.97 }}
  transition={{ type: 'spring', stiffness: 380, damping: 28 }}
  whileHover={{ x: 3, transition: { type: 'spring', stiffness: 500, damping: 25 } }}
  className={`
    group rounded-lg border transition-all duration-300 overflow-hidden cursor-pointer
    backdrop-blur-sm
    ${item.isRefusal ? 'history-item-refusal' : 'history-item-success'}
    ${isExpanded
      ? 'bg-cyber-darker border-cyber-primary shadow-neon-sm'
      : 'bg-black/20 border-white/5 hover:border-cyber-primary/50 hover:bg-cyber-darker/60'
    }
  `}
  onClick={toggleExpanded}
>

Inside the expanded content, wrap the answer text div with:
  <motion.div
    initial={{ height: 0, opacity: 0 }}
    animate={{ height: 'auto', opacity: 1 }}
    exit={{ height: 0, opacity: 0 }}
    transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
    style={{ overflow: 'hidden' }}
  >
    ...existing expanded content...
  </motion.div>

────────────────────────────────────────
STEP 3 — frontend/src/components/ConversationHistory.jsx — Empty state animation
────────────────────────────────────────
Find the empty state div that says "No Data Streams Active" and replace it with:

<motion.div
  initial={{ opacity: 0, scale: 0.95 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ delay: 0.3, duration: 0.4 }}
  className="flex flex-col items-center justify-center h-48 text-cyber-text/30"
>
  <motion.div
    animate={{ opacity: [0.3, 0.7, 0.3] }}
    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
  >
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="mb-3 opacity-40">
      <circle cx="16" cy="16" r="12" stroke="#00d4ff" strokeWidth="1" strokeDasharray="4 4"/>
      <circle cx="16" cy="16" r="6" stroke="#00d4ff" strokeWidth="1" opacity="0.5"/>
      <circle cx="16" cy="16" r="2" fill="#00d4ff" opacity="0.6"/>
    </svg>
  </motion.div>
  <p className="text-xs uppercase tracking-widest text-center font-display">No Data Streams Active</p>
  <p className="text-[10px] opacity-50 mt-1 font-mono">Execute query to initialize logs</p>
</motion.div>

Do not change the history array rendering, onClearHistory logic, or any parent callback.
```

---

## PHASE 3 · PROMPT 3A
### Synapse Thinking Animation + Token Stream Renderer

```
You are upgrading the AnswerDisplay component of the RAG Terminal React app to have a cinematic response experience.

CONTEXT:
- File to modify: frontend/src/components/AnswerDisplay.jsx
- framer-motion is installed
- react-markdown and remark-gfm are installed
- AnswerDisplay receives these props: { answer, isLoading, isThinking, isStreaming, confidence }
  - answer: object | null  { answer: string, retrieved_chunks: [], num_chunks_retrieved: int, confidence: float 0-1 }
  - isLoading: boolean
  - isThinking: boolean (backend is processing, before stream starts)
  - isStreaming: boolean (tokens are streaming in)
  - confidence: float 0-1 | null
- Do NOT change the props interface, refusal detection logic, or react-markdown rendering

────────────────────────────────────────
STEP 1 — Replace the "thinking" loading state
────────────────────────────────────────
Find the existing loading/thinking state JSX (typically a skeleton or spinner shown when isThinking is true).

Replace it with this exact SynapseLoader component defined INLINE at the top of the file (before the main component):

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
            fill="rgba(0,212,255,0.15)"
            stroke="#00d4ff" strokeWidth="1.5"
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
            stroke="rgba(0,212,255,0.4)" strokeWidth="1"
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
          className="text-cyber-primary text-xs uppercase tracking-widest font-display"
          style={{ animation: 'synapse-text-pulse 1.8s ease-in-out infinite' }}
        >
          Neural Processing
        </span>
        {[0, 0.2, 0.4].map((delay, i) => (
          <span
            key={i}
            className="w-1 h-1 rounded-full bg-cyber-primary"
            style={{ animation: `synapse-dot 1.2s ease-in-out ${delay}s infinite` }}
          />
        ))}
      </div>
    </div>
  );
}

Add these keyframes to frontend/src/index.css (append to end of file):

@keyframes synapse-node-pulse {
  0%, 100% { r: 6px; opacity: 0.6; }
  50%       { r: 8px; opacity: 1; }
}

@keyframes synapse-edge-fire {
  0%        { stroke-dashoffset: 60; opacity: 0; }
  20%       { opacity: 1; }
  60%, 100% { stroke-dashoffset: 0; opacity: 0; }
}

@keyframes synapse-text-pulse {
  0%, 100% { opacity: 0.5; }
  50%       { opacity: 1; }
}

@keyframes synapse-dot {
  0%, 100% { transform: scale(0.6); opacity: 0.3; }
  50%       { transform: scale(1.4); opacity: 1; }
}

In AnswerDisplay, find the code block that handles isThinking (or the spinner that was shown before the skeleton):
Replace/augment so that when isThinking is true, render <SynapseLoader /> instead.

────────────────────────────────────────
STEP 2 — Streaming word-by-word render
────────────────────────────────────────
Add this hook and component INLINE at the top of AnswerDisplay.jsx (before the main export):

import { useState, useEffect, useRef } from 'react'; // merge with existing

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
            background: '#00d4ff',
            marginLeft: '2px',
            verticalAlign: 'text-bottom',
            animation: 'cursor-blink 1.1s step-end infinite',
          }}
        />
      )}
    </span>
  );
}

Add these keyframes to frontend/src/index.css:

@keyframes word-fade-in {
  from { opacity: 0; transform: translateX(-3px); }
  to   { opacity: 1; transform: translateX(0); }
}

@keyframes cursor-blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0; }
}

In AnswerDisplay's main JSX, find where answer.answer is rendered inside ReactMarkdown. If isStreaming is true, INSTEAD of ReactMarkdown render:
  <StreamingText text={answer?.answer || ''} isStreaming={isStreaming} />
If isStreaming is false (complete answer), keep the existing ReactMarkdown render.

The condition should be:
  {isStreaming
    ? <StreamingText text={answer?.answer || ''} isStreaming={isStreaming} />
    : <ReactMarkdown ...existing props...>{answer?.answer}</ReactMarkdown>
  }

Do not remove any existing answer-markdown CSS classes. Do not change refusal detection.
```

---

## PHASE 3 · PROMPT 3B
### Confidence Arc Meter + Source Citation Glass Cards

```
You are upgrading the answer result display in the RAG Terminal app.

CONTEXT:
- File to modify: frontend/src/components/AnswerDisplay.jsx
- The component receives prop: confidence (float 0-1 | null)
- The component receives answer.retrieved_chunks array of: { chunk_text, source_file, chunk_index, similarity_score }
- framer-motion is installed
- Do NOT change any refusal detection, markdown rendering, or loading state logic

────────────────────────────────────────
STEP 1 — Confidence Arc Meter component
────────────────────────────────────────
Add this component INLINE at the top of AnswerDisplay.jsx before the main export:

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
  const color = pct > 0.75 ? '#39FF14' : pct >= 0.5 ? '#fbbf24' : '#ef4444';
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
              filter: `drop-shadow(0 0 6px ${color}80)`,
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
        <div className="text-[10px] uppercase tracking-widest text-cyber-text/40 font-mono">Confidence</div>
        <div className="text-sm font-display font-bold" style={{ color }}>{label}</div>
      </div>
    </div>
  );
}

Add this keyframe to frontend/src/index.css:

@keyframes arc-grow {
  from { stroke-dasharray: 0 999; }
  to   { stroke-dasharray: 999 0; }
}

In AnswerDisplay's JSX, AFTER the answer content div (but still inside the answer wrapper), add:
  {confidence != null && !isLoading && !isThinking && (
    <ConfidenceArc value={confidence} />
  )}

────────────────────────────────────────
STEP 2 — Source Citation Glass Cards
────────────────────────────────────────
Add this component INLINE in AnswerDisplay.jsx (before the main export, after ConfidenceArc):

import { useState as useSourceState } from 'react'; // note: React already imported, just use useState

function SourceCard({ chunk, index }) {
  const [expanded, setExpanded] = useState(false);
  const score = Math.round((chunk.similarity_score || 0) * 100);
  const barColor = score >= 75 ? '#39FF14' : score >= 50 ? '#fbbf24' : '#ef4444';
  const filename = (chunk.source_file || 'unknown').split('/').pop();
  const truncatedName = filename.length > 28 ? filename.slice(0, 25) + '...' : filename;
  const preview = (chunk.chunk_text || '').slice(0, 160);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.3 }}
      whileHover={{ y: -1, borderColor: 'rgba(0,212,255,0.45)' }}
      onClick={() => setExpanded(!expanded)}
      style={{
        background: 'rgba(10,15,28,0.5)',
        border: '1px solid rgba(0,212,255,0.15)',
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
            <rect x="2" y="1" width="10" height="12" rx="2" stroke="#00d4ff" strokeWidth="1.2"/>
            <line x1="4" y1="5" x2="10" y2="5" stroke="#00d4ff" strokeWidth="0.8"/>
            <line x1="4" y1="7.5" x2="10" y2="7.5" stroke="#00d4ff" strokeWidth="0.8"/>
            <line x1="4" y1="10" x2="8" y2="10" stroke="#00d4ff" strokeWidth="0.8"/>
          </svg>
          <span style={{ fontSize: '11px', color: 'rgba(230,241,255,0.8)', fontFamily: 'JetBrains Mono, monospace' }}>
            {truncatedName}
          </span>
        </div>
        <span style={{
          fontSize: '10px', fontWeight: '700', padding: '2px 8px',
          borderRadius: '999px', fontFamily: 'Orbitron, sans-serif',
          background: `${barColor}18`, color: barColor, border: `1px solid ${barColor}40`,
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
            <p style={{ fontSize: '11px', color: 'rgba(230,241,255,0.7)', fontFamily: 'JetBrains Mono, monospace', lineHeight: '1.7', marginTop: '8px', borderTop: '1px solid rgba(0,212,255,0.1)', paddingTop: '8px' }}>
              {chunk.chunk_text}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ fontSize: '10px', color: 'rgba(0,212,255,0.4)', marginTop: '6px', textAlign: 'right' }}>
        {expanded ? '↑ collapse' : '↓ expand chunk'}
      </div>
    </motion.div>
  );
}

In AnswerDisplay's JSX, find the section that renders source citations / retrieved_chunks.
Replace the existing source list render with:

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

Make sure AnimatePresence is imported from framer-motion at the top of the file.
Do not remove or modify the existing refusal detection, confidence prop, or markdown classes.
```

---

## PHASE 4 · PROMPT 4A
### Magnetic Cursor + Command Palette (Cmd+K)

```
You are adding advanced UX chrome to the RAG Terminal React app — a custom magnetic cursor and a Cmd+K command palette.

CONTEXT:
- framer-motion is installed (useMotionValue, useSpring are available)
- Files: frontend/src/App.jsx (modify), frontend/src/index.css (modify)
- New files: frontend/src/components/CyberCursor.jsx, frontend/src/components/CommandPalette.jsx
- Do NOT modify any API, query, or upload logic

────────────────────────────────────────
STEP 1 — frontend/src/components/CyberCursor.jsx (CREATE NEW FILE)
────────────────────────────────────────
Create this file exactly:

import { useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

export default function CyberCursor() {
  const dotX  = useMotionValue(-100);
  const dotY  = useMotionValue(-100);
  const ringX = useSpring(useMotionValue(-100), { damping: 20, stiffness: 300, mass: 0.5 });
  const ringY = useSpring(useMotionValue(-100), { damping: 20, stiffness: 300, mass: 0.5 });
  const isHovering = useRef(false);

  // We need to keep spring sources separate for the ring
  const rawRingX = useMotionValue(-100);
  const rawRingY = useMotionValue(-100);
  const springRingX = useSpring(rawRingX, { damping: 20, stiffness: 300, mass: 0.5 });
  const springRingY = useSpring(rawRingY, { damping: 20, stiffness: 300, mass: 0.5 });
  const ringScale = useSpring(1, { stiffness: 400, damping: 25 });

  useEffect(() => {
    const move = (e) => {
      dotX.set(e.clientX);
      dotY.set(e.clientY);
      rawRingX.set(e.clientX);
      rawRingY.set(e.clientY);
    };

    const checkHover = (e) => {
      const el = e.target;
      const isInteractive =
        el.closest('button') ||
        el.closest('a') ||
        el.closest('[data-cursor-hover]') ||
        el.closest('select') ||
        el.closest('input') ||
        el.closest('[role="button"]');
      if (isInteractive && !isHovering.current) {
        isHovering.current = true;
        ringScale.set(2.2);
      } else if (!isInteractive && isHovering.current) {
        isHovering.current = false;
        ringScale.set(1);
      }
    };

    window.addEventListener('mousemove', move);
    window.addEventListener('mouseover', checkHover);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseover', checkHover);
    };
  }, []);

  return (
    <>
      {/* Dot — no lag */}
      <motion.div
        style={{
          x: dotX,
          y: dotY,
          position: 'fixed',
          top: -4,
          left: -4,
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: '#00d4ff',
          pointerEvents: 'none',
          zIndex: 99999,
          boxShadow: '0 0 8px #00d4ff',
          translateX: '-50%',
          translateY: '-50%',
        }}
      />
      {/* Ring — spring lag */}
      <motion.div
        style={{
          x: springRingX,
          y: springRingY,
          scale: ringScale,
          position: 'fixed',
          top: -16,
          left: -16,
          width: 32,
          height: 32,
          borderRadius: '50%',
          border: '1.5px solid rgba(0,212,255,0.5)',
          pointerEvents: 'none',
          zIndex: 99998,
          translateX: '-50%',
          translateY: '-50%',
          background: isHovering.current ? 'rgba(0,212,255,0.1)' : 'transparent',
        }}
      />
    </>
  );
}

────────────────────────────────────────
STEP 2 — frontend/src/index.css — Hide native cursor
────────────────────────────────────────
Add to the top of index.css (right after the :root block):

* { cursor: none !important; }

────────────────────────────────────────
STEP 3 — frontend/src/components/CommandPalette.jsx (CREATE NEW FILE)
────────────────────────────────────────
Create this file exactly:

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
    if (type === 'query')  return <span style={{ color: '#00d4ff', fontSize: 12 }}>›</span>;
    if (type === 'doc')    return <span style={{ color: '#a855f7', fontSize: 12 }}>◈</span>;
    if (type === 'action') return <span style={{ color: '#39FF14', fontSize: 12 }}>⚡</span>;
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
              border: '1px solid rgba(0,212,255,0.3)',
              borderRadius: 16, overflow: 'hidden',
              boxShadow: '0 0 60px rgba(0,212,255,0.15), 0 25px 50px rgba(0,0,0,0.6)',
            }}
          >
            {/* Search input */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid rgba(0,212,255,0.1)', gap: 10 }}>
              <span style={{ color: '#00d4ff', fontFamily: 'JetBrains Mono', fontSize: 16 }}>⌘</span>
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
                    background: i === activeIndex ? 'rgba(0,212,255,0.08)' : 'transparent',
                    borderLeft: i === activeIndex ? '2px solid #00d4ff' : '2px solid transparent',
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
            <div style={{ padding: '8px 16px', borderTop: '1px solid rgba(0,212,255,0.08)', display: 'flex', gap: 16 }}>
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

────────────────────────────────────────
STEP 4 — frontend/src/App.jsx — Wire both components
────────────────────────────────────────
Add these imports at the top of App.jsx (after existing imports):
  import CyberCursor from './components/CyberCursor';
  import CommandPalette from './components/CommandPalette';

Add this state inside the App function (alongside existing useState declarations):
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false);

Add this Cmd+K keyboard listener inside a useEffect in App:
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

Add a callback for when a query is selected from the palette:
  const handleSelectQuery = useCallback((questionText) => {
    // Trigger the query as if the user typed it
    handleQueryStart(questionText, 'hybrid');
  }, [handleQueryStart]);

In the JSX return, add these two components INSIDE the outermost div, as first children (before LoadingOverlay and Toast):
  <CyberCursor />
  <CommandPalette
    isOpen={cmdPaletteOpen}
    onClose={() => setCmdPaletteOpen(false)}
    conversationHistory={conversationHistory}
    uploadedFiles={uploadedFiles}
    onClearHistory={handleClearHistory}
    onSelectQuery={handleSelectQuery}
  />

Add a small Cmd+K hint to the header area of App.jsx. Find the header p tag with tracking-widest and add after it:
  <button
    onClick={() => setCmdPaletteOpen(true)}
    data-cursor-hover="true"
    className="mt-2 text-[10px] text-cyber-text/25 border border-cyber-primary/10 px-3 py-1 rounded-full font-mono hover:text-cyber-primary/60 hover:border-cyber-primary/30 transition-all"
  >
    ⌘K command palette
  </button>

Do not change any API, query streaming, or upload logic.
```

---

## PHASE 4 · PROMPT 4B
### Analytics Chart Upgrade + Toast Redesign

```
You are upgrading the AdminAnalytics dashboard and Toast notification system of the RAG Terminal React app.

CONTEXT:
- Files to modify: frontend/src/components/AdminAnalytics.jsx, frontend/src/components/Toast.jsx
- framer-motion is installed
- The analytics component fetches from /analytics endpoint and renders KPI cards + bar charts
- The toast component receives: { message, type, onClose }
- Do NOT change any data fetching logic or API endpoints

────────────────────────────────────────
STEP 1 — Upgrade AdminAnalytics.jsx
────────────────────────────────────────
In AdminAnalytics.jsx, keep all existing data fetching (fetch from /analytics, state management, error handling) unchanged.

For the KPI cards section, find the existing .kpi-grid div and replace the inner KPI card JSX with this pattern (apply to all 3+ KPI cards):

<motion.div
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: index * 0.1 }}
  className="kpi-card group hover:border-cyber-primary/40 transition-all duration-300"
  style={{ cursor: 'default' }}
>
  <motion.div
    initial={{ scale: 0 }}
    animate={{ scale: 1 }}
    transition={{ type: 'spring', delay: 0.2 + index * 0.1, stiffness: 400, damping: 20 }}
    className="kpi-value"
    style={{
      background: 'linear-gradient(135deg, #00d4ff, #a855f7)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    }}
  >
    {value}
  </motion.div>
  <div className="kpi-label">{label}</div>
</motion.div>

For the bar chart section (the mini-bar-chart divs), replace the static bar fills with animated ones:
For each .bar-fill div, add inline style:
  style={{ width: 0, animation: `bar-grow-${index} 0.8s ease-out ${0.3 + index * 0.08}s forwards` }}

Add these keyframes to index.css (generate 10 variants, one per bar):
For i in 0..9, generate:
  @keyframes bar-grow-{i} {
    from { width: 0%; }
    to   { width: {actual_percent}%; }  ← this is set dynamically via JS, so instead use:
  }

Actually, since widths are dynamic (data-driven), instead of CSS keyframes, wrap each .bar-fill in a motion.div:

  <motion.div
    className="bar-fill"
    initial={{ width: 0 }}
    animate={{ width: `${Math.round((value / maxValue) * 100)}%` }}
    transition={{ duration: 0.8, delay: 0.3 + index * 0.08, ease: 'easeOut' }}
    style={{ background: color }}
  />

Where color cycles through: ['#00d4ff', '#a855f7', '#39FF14', '#fbbf24'].

For the section title divs (.analytics-section-title), add:
  className="analytics-section-title font-display"

For the .analytics-toggle button (the one that expands/collapses the analytics panel), upgrade it with:
  <motion.button
    whileHover={{ x: 3 }}
    whileTap={{ scale: 0.97 }}
    className="analytics-toggle font-display"
    onClick={toggleAnalytics}
  >
    ...existing content...
  </motion.button>

────────────────────────────────────────
STEP 2 — Redesign Toast.jsx
────────────────────────────────────────
Replace the entire contents of frontend/src/components/Toast.jsx with:

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

After all changes, run: cd frontend && npm install && npm run build to verify zero errors.
If the build has any import errors, resolve them by checking that all motion imports are from 'framer-motion' and all useState/useEffect imports are from 'react'.
```

---

*End of prompts — 8 total, Phases 1–4 complete.*
*Each prompt is fully self-contained. Run them in order: 1A → 1B → 2A → 2B → 3A → 3B → 4A → 4B*
