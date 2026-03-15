# RAG Terminal — Iron Man Mark L HUD
## Complete Single-Agent Implementation Prompt
## Paste this entire prompt to your agent as one task

---

```
You are rebuilding the visual layer of the RAG Terminal React + Vite + Tailwind app 
with the Iron Man Mark L HUD theme. Execute every step in order without stopping.

═══════════════════════════════════════════════════════════════
DESIGN SYSTEM — memorise these, use them everywhere
═══════════════════════════════════════════════════════════════

COLOURS:
  --im-void:      #0a0602   (page background — near-black with warm tint)
  --im-s1:        #130c06   (primary surface)
  --im-s2:        #1e1108   (elevated surface)
  --im-s3:        #2d1a0a   (hover/active surface)
  --im-s4:        #3d2510   (border-highlight surface)
  --im-crimson:   #c0391b   (primary accent — arc reactor red)
  --im-orange:    #e8824a   (secondary accent — molten orange)
  --im-gold:      #f5a623   (tertiary — gold HUD detail)
  --im-cream:     #ffd4b8   (primary text — warm cream)
  --im-mid:       rgba(255,212,184,0.65)  (secondary text)
  --im-muted:     rgba(255,212,184,0.35)  (tertiary text)
  --im-faint:     rgba(255,212,184,0.06)  (subtle fills)
  --im-border:    rgba(192,57,27,0.25)    (default border)
  --im-borderHv:  rgba(232,130,74,0.50)   (hover border)
  --im-hex:       rgba(192,57,27,0.08)    (hex cell fill)

FONTS:
  Display/Brand:  'Orbitron', sans-serif            (headings, labels, badges)
  Body/Reading:   'Share Tech Mono', monospace       (ALL body text, inputs, answers)
  
  Google Fonts import URL:
  https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Share+Tech+Mono&display=swap

IDENTITY:
  - The inside of Tony Stark's helmet: HUD overlays, hexagonal grid cells, 
    angular clip-path panel cuts, arc reactor glow, JARVIS readout monospace
  - NO rounded pill buttons — use angular clip-path shapes instead
  - ALL uppercase labels with wide letter-spacing
  - Subtle orange/crimson glow on focus/active states (yes glow — this is Iron Man)
  - Hexagonal SVG grid pattern as background texture
  - Angular decorative corner brackets on cards

═══════════════════════════════════════════════════════════════
STEP 1 — frontend/index.html
═══════════════════════════════════════════════════════════════

Replace the entire <head> block with:

<head>
  <meta charset="UTF-8" />
  <link rel="icon" type="image/svg+xml" href="/vite.svg" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="dark" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Share+Tech+Mono&display=swap" rel="stylesheet">
  <title>RAG Terminal — Mark L</title>
</head>

═══════════════════════════════════════════════════════════════
STEP 2 — frontend/tailwind.config.js  (full replacement)
═══════════════════════════════════════════════════════════════

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html","./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans:    ["'Share Tech Mono'", 'monospace'],
        display: ["'Orbitron'", 'sans-serif'],
        mono:    ["'Share Tech Mono'", 'monospace'],
      },
      colors: {
        im: {
          void:    '#0a0602',
          s1:      '#130c06',
          s2:      '#1e1108',
          s3:      '#2d1a0a',
          s4:      '#3d2510',
          crimson: '#c0391b',
          orange:  '#e8824a',
          gold:    '#f5a623',
          cream:   '#ffd4b8',
        },
      },
      boxShadow: {
        'arc-sm':  '0 0 8px rgba(192,57,27,0.4), 0 0 2px rgba(232,130,74,0.3)',
        'arc-md':  '0 0 20px rgba(192,57,27,0.35), 0 0 8px rgba(232,130,74,0.2)',
        'arc-lg':  '0 0 40px rgba(192,57,27,0.3), 0 0 15px rgba(232,130,74,0.15)',
        'arc-xl':  '0 0 60px rgba(192,57,27,0.25), 0 20px 40px rgba(0,0,0,0.8)',
        'arc-inset': 'inset 0 0 20px rgba(192,57,27,0.08)',
      },
      animation: {
        'hud-pulse':   'hud-pulse 2s ease-in-out infinite',
        'arc-spin':    'arc-spin 3s linear infinite',
        'hex-shift':   'hex-shift 8s ease-in-out infinite',
        'scanline':    'scanline 6s linear infinite',
        'data-stream': 'data-stream 1.4s ease-in-out infinite',
        'corner-draw': 'corner-draw 0.4s ease-out forwards',
      },
      keyframes: {
        'hud-pulse': {
          '0%,100%': { boxShadow: '0 0 8px rgba(192,57,27,0.4)' },
          '50%':      { boxShadow: '0 0 25px rgba(192,57,27,0.8), 0 0 10px rgba(232,130,74,0.4)' },
        },
        'arc-spin': {
          '0%':   { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'scanline': {
          '0%':   { transform: 'translateY(-4px)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        'data-stream': {
          '0%':   { strokeDashoffset: '200' },
          '100%': { strokeDashoffset: '0' },
        },
        'corner-draw': {
          '0%':   { opacity: '0', strokeDashoffset: '40' },
          '100%': { opacity: '1', strokeDashoffset: '0' },
        },
      },
    },
  },
  plugins: [],
}

═══════════════════════════════════════════════════════════════
STEP 3 — frontend/src/index.css  (full replacement)
═══════════════════════════════════════════════════════════════

Replace the ENTIRE contents of index.css with:

@tailwind base;
@tailwind components;
@tailwind utilities;

@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Share+Tech+Mono&display=swap');

:root {
  --im-void:     #0a0602;
  --im-s1:       #130c06;
  --im-s2:       #1e1108;
  --im-s3:       #2d1a0a;
  --im-s4:       #3d2510;
  --im-crimson:  #c0391b;
  --im-orange:   #e8824a;
  --im-gold:     #f5a623;
  --im-cream:    #ffd4b8;
  --im-mid:      rgba(255,212,184,0.65);
  --im-muted:    rgba(255,212,184,0.35);
  --im-faint:    rgba(255,212,184,0.06);
  --im-border:   rgba(192,57,27,0.25);
  --im-borderHv: rgba(232,130,74,0.50);
  --im-glow-sm:  0 0 8px rgba(192,57,27,0.5);
  --im-glow-md:  0 0 20px rgba(192,57,27,0.4), 0 0 8px rgba(232,130,74,0.2);
  --im-glow-lg:  0 0 40px rgba(192,57,27,0.3), 0 0 15px rgba(232,130,74,0.15);

  font-family: 'Share Tech Mono', monospace;
  color-scheme: dark;
  line-height: 1.5;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

html, body, #root {
  height: 100%; width: 100%; min-height: 100vh;
  margin: 0; padding: 0; overflow: hidden;
}

body {
  background-color: var(--im-void);
  color: var(--im-cream);
  min-width: 320px;
  position: relative;
}

#root { display: flex; flex-direction: column; }
* { box-sizing: border-box; }
::selection { background: rgba(192,57,27,0.35); color: #ffd4b8; }

/* ── Hex grid background ─────────────────────────────────────── */
body::before {
  content: '';
  position: fixed; inset: 0;
  pointer-events: none; z-index: 0;
  background-image:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='100'%3E%3Cpolygon points='28,2 54,16 54,44 28,58 2,44 2,16' fill='none' stroke='rgba(192,57,27,0.07)' stroke-width='0.5'/%3E%3Cpolygon points='28,52 54,66 54,94 28,108 2,94 2,66' fill='none' stroke='rgba(192,57,27,0.07)' stroke-width='0.5'/%3E%3C/svg%3E");
  background-size: 56px 100px;
  opacity: 1;
}

/* ── Scanline sweep ──────────────────────────────────────────── */
body::after {
  content: '';
  position: fixed; left: 0; top: 0; width: 100%; height: 3px;
  background: linear-gradient(90deg, transparent 0%, rgba(192,57,27,0.2) 30%, rgba(232,130,74,0.3) 50%, rgba(192,57,27,0.2) 70%, transparent 100%);
  pointer-events: none; z-index: 9999;
  animation: scanline 6s linear infinite;
}

@keyframes scanline {
  0%   { transform: translateY(-4px); }
  100% { transform: translateY(100vh); }
}

/* ── HUD card ────────────────────────────────────────────────── */
.hud-card {
  background: var(--im-s1);
  border: 1px solid var(--im-border);
  border-radius: 4px;
  position: relative;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px));
}
.hud-card::before, .hud-card::after {
  content: '';
  position: absolute;
  width: 10px; height: 10px;
  border-color: var(--im-orange);
  border-style: solid;
  opacity: 0.6;
  transition: opacity 0.2s;
}
.hud-card::before { top: -1px; left: -1px; border-width: 2px 0 0 2px; }
.hud-card::after  { bottom: -1px; right: -1px; border-width: 0 2px 2px 0; }
.hud-card:hover {
  border-color: var(--im-borderHv);
  box-shadow: var(--im-glow-sm);
}
.hud-card:hover::before,
.hud-card:hover::after { opacity: 1; }
.hud-card:focus-within {
  border-color: var(--im-orange);
  box-shadow: var(--im-glow-md);
}

/* ── HUD label (Orbitron uppercase) ─────────────────────────── */
.hud-label {
  font-family: 'Orbitron', sans-serif;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--im-muted);
}

/* ── HUD title ───────────────────────────────────────────────── */
.hud-title {
  font-family: 'Orbitron', sans-serif;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--im-orange);
}

/* ── Angular button (clip-path, no border-radius) ───────────── */
.im-btn {
  font-family: 'Orbitron', sans-serif;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 10px 24px;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  clip-path: polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%);
}
.im-btn-primary {
  background: var(--im-crimson);
  color: var(--im-cream);
  box-shadow: var(--im-glow-sm);
}
.im-btn-primary:hover:not(:disabled) {
  background: var(--im-orange);
  box-shadow: var(--im-glow-md);
  transform: translateY(-1px);
}
.im-btn-primary:active:not(:disabled) {
  transform: translateY(0) scale(0.98);
}
.im-btn-primary:disabled {
  background: var(--im-s3);
  color: var(--im-muted);
  box-shadow: none;
  cursor: not-allowed;
}
.im-btn-ghost {
  background: transparent;
  color: var(--im-muted);
  border: 1px solid var(--im-border) !important;
  clip-path: none;
  border-radius: 2px;
}
.im-btn-ghost:hover:not(:disabled) {
  border-color: var(--im-borderHv) !important;
  color: var(--im-orange);
  background: var(--im-faint);
}

/* ── JARVIS input ────────────────────────────────────────────── */
.jarvis-input {
  background: var(--im-s1);
  border: 1px solid var(--im-border);
  border-radius: 2px;
  color: var(--im-cream);
  font-family: 'Share Tech Mono', monospace;
  font-size: 14px;
  padding: 12px 16px;
  outline: none;
  width: 100%;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  caret-color: var(--im-orange);
}
.jarvis-input::placeholder { color: var(--im-muted); }
.jarvis-input:focus {
  border-color: var(--im-orange);
  box-shadow: var(--im-glow-sm);
}
.jarvis-input:disabled { opacity: 0.3; cursor: not-allowed; }

/* ── JARVIS select ───────────────────────────────────────────── */
.jarvis-select {
  background: var(--im-s1);
  border: 1px solid var(--im-border);
  border-radius: 2px;
  color: var(--im-orange);
  font-family: 'Orbitron', sans-serif;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 10px 32px 10px 14px;
  outline: none;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
  appearance: none;
  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%23e8824a' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E");
  background-position: right 6px center;
  background-repeat: no-repeat;
  background-size: 18px;
}
.jarvis-select:focus {
  border-color: var(--im-orange);
  box-shadow: var(--im-glow-sm);
}
.jarvis-select:disabled { opacity: 0.3; cursor: not-allowed; }

/* ── Upload zone ─────────────────────────────────────────────── */
.im-upload-zone {
  border: 1px dashed var(--im-border);
  border-radius: 4px;
  background: var(--im-s1);
  clip-path: polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px));
  transition: all 0.2s ease;
}
.im-upload-zone.drag-over,
.im-upload-zone:hover {
  border-color: var(--im-borderHv);
  background: var(--im-s2);
  box-shadow: var(--im-glow-sm);
}

/* ── Progress bar ────────────────────────────────────────────── */
.im-progress-track {
  width: 100%; height: 2px;
  background: rgba(192,57,27,0.15);
  position: relative; overflow: hidden;
}
.im-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--im-crimson), var(--im-orange));
  box-shadow: 0 0 8px rgba(232,130,74,0.6);
  transition: width 0.15s ease;
  min-width: 4px;
}
.im-progress-indeterminate {
  width: 35%;
  animation: data-stream-bar 1.4s ease-in-out infinite;
}
@keyframes data-stream-bar {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(400%); }
}

/* ── Arc reactor spinner ─────────────────────────────────────── */
.arc-reactor {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.arc-reactor-ring {
  border-radius: 50%;
  border: 1.5px solid transparent;
  border-top-color: var(--im-orange);
  border-right-color: rgba(192,57,27,0.4);
  animation: arc-spin 1s linear infinite;
}
.arc-reactor-core {
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(232,130,74,0.6) 0%, rgba(192,57,27,0.2) 60%, transparent 100%);
  animation: hud-pulse 1.5s ease-in-out infinite;
}

/* ── Answer display ──────────────────────────────────────────── */
.answer-display {
  padding: 20px 24px;
  background: var(--im-s1);
  border: 1px solid var(--im-border);
  border-radius: 4px;
  min-height: 120px;
  position: relative;
  clip-path: polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px));
}
.answer-display::before, .answer-display::after {
  content: ''; position: absolute;
  width: 12px; height: 12px;
  border-color: var(--im-gold); border-style: solid;
}
.answer-display::before { top: -1px; left: -1px; border-width: 2px 0 0 2px; }
.answer-display::after  { bottom: -1px; right: -1px; border-width: 0 2px 2px 0; }

.answer-header-row {
  display: flex; align-items: center; gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(192,57,27,0.15);
}
.answer-header-row h2 {
  font-family: 'Orbitron', sans-serif;
  font-size: 10px; font-weight: 700;
  letter-spacing: 0.2em; text-transform: uppercase;
  color: var(--im-orange); margin: 0;
}

/* ── Markdown ────────────────────────────────────────────────── */
.answer-markdown {
  font-family: 'Share Tech Mono', monospace;
  font-size: 14px; line-height: 1.7;
  color: var(--im-cream);
  word-wrap: break-word; overflow-wrap: break-word;
}
.answer-markdown h1, .answer-markdown h2 {
  font-family: 'Orbitron', sans-serif;
  font-size: 15px; font-weight: 700;
  letter-spacing: 0.06em; text-transform: uppercase;
  color: var(--im-orange);
  margin-top: 2rem; margin-bottom: 0.8rem;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(192,57,27,0.2);
}
.answer-markdown h3 {
  font-family: 'Orbitron', sans-serif;
  font-size: 12px; font-weight: 600; letter-spacing: 0.08em;
  text-transform: uppercase; color: var(--im-gold);
  margin-top: 1.5rem; margin-bottom: 0.5rem;
}
.answer-markdown p { margin-bottom: 1rem; }
.answer-markdown ul, .answer-markdown ol { margin-left: 1.5rem; margin-bottom: 1rem; }
.answer-markdown li { margin-bottom: 0.4rem; }
.answer-markdown li::marker { color: var(--im-crimson); }
.answer-markdown strong { color: var(--im-gold); font-weight: 700; }
.answer-markdown em { color: var(--im-mid); }
.answer-markdown a { color: var(--im-orange); text-decoration: underline; text-underline-offset: 3px; }
.answer-markdown code {
  background: rgba(192,57,27,0.12);
  color: var(--im-orange);
  padding: 2px 6px;
  border: 1px solid rgba(192,57,27,0.2);
  font-family: 'Share Tech Mono', monospace; font-size: 12px;
}
.answer-markdown pre {
  background: var(--im-s2);
  border: 1px solid var(--im-border);
  padding: 16px; overflow-x: auto; margin-bottom: 1rem;
}
.answer-markdown pre code { background: none; border: none; padding: 0; }
.answer-markdown blockquote {
  border-left: 2px solid var(--im-crimson);
  padding-left: 14px; color: var(--im-mid); margin: 1rem 0;
}
.answer-markdown table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 1rem; }
.answer-markdown th {
  font-family: 'Orbitron', sans-serif;
  font-size: 9px; font-weight: 700;
  letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--im-orange);
  border-bottom: 1px solid rgba(192,57,27,0.3);
  padding: 8px 12px; text-align: left;
}
.answer-markdown td {
  padding: 10px 12px; border-bottom: 1px solid rgba(192,57,27,0.08);
  color: var(--im-cream); vertical-align: top; font-family: 'Share Tech Mono', monospace;
}
.answer-markdown tr:last-child td { border-bottom: none; }
.answer-markdown tr:hover td { background: rgba(192,57,27,0.04); }

/* ── Confidence badge ────────────────────────────────────────── */
.confidence-badge {
  font-family: 'Orbitron', sans-serif;
  display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 10px;
  font-size: 10px; font-weight: 700; letter-spacing: 0.1em;
  text-transform: uppercase; border: 1px solid;
  clip-path: polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%);
  animation: badge-pop 0.35s ease-out;
}
@keyframes badge-pop {
  0%   { transform: scale(0.7) skewX(-4deg); opacity: 0; }
  60%  { transform: scale(1.05) skewX(-4deg); }
  100% { transform: scale(1) skewX(0deg); opacity: 1; }
}
.confidence-high {
  color: var(--im-gold); background: rgba(245,166,35,0.1);
  border-color: rgba(245,166,35,0.35);
}
.confidence-mid {
  color: var(--im-orange); background: rgba(232,130,74,0.08);
  border-color: rgba(232,130,74,0.25);
}
.confidence-low {
  color: var(--im-mid); background: rgba(255,212,184,0.04);
  border-color: rgba(255,212,184,0.12);
}

/* ── Typing cursor ───────────────────────────────────────────── */
.typing-cursor::after {
  content: '█';
  color: var(--im-orange); opacity: 0.8;
  animation: cursor-blink 1s step-end infinite;
  margin-left: 2px; font-size: 0.8em;
}
@keyframes cursor-blink { 0%,100% { opacity: 0.8; } 50% { opacity: 0; } }

/* ── Skeleton loader ─────────────────────────────────────────── */
.skeleton-line {
  height: 11px; background: var(--im-s3);
  margin-bottom: 10px; position: relative; overflow: hidden;
  clip-path: polygon(3px 0%, 100% 0%, calc(100% - 3px) 100%, 0% 100%);
}
.skeleton-line::after {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(90deg, transparent 0%, rgba(232,130,74,0.08) 50%, transparent 100%);
  background-size: 200% 100%;
  animation: skel-sweep 1.6s ease-in-out infinite;
}
@keyframes skel-sweep { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.skeleton-line-long  { width: 88%; }
.skeleton-line-medium { width: 64%; }
.skeleton-line-short { width: 40%; }

/* ── Fade reveal ─────────────────────────────────────────────── */
.fade-reveal-container > * { animation: im-fade-in 0.3s ease both; }
.fade-reveal-container > *:nth-child(1) { animation-delay: 0ms; }
.fade-reveal-container > *:nth-child(2) { animation-delay: 50ms; }
.fade-reveal-container > *:nth-child(3) { animation-delay: 100ms; }
.fade-reveal-container > *:nth-child(4) { animation-delay: 150ms; }
.fade-reveal-container > *:nth-child(n+5) { animation-delay: 200ms; }
@keyframes im-fade-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
.answer-wrapper { position: relative; }

/* ── Document selector ───────────────────────────────────────── */
.doc-selector { background: var(--im-s1); border: 1px solid var(--im-border); border-radius: 4px; overflow: hidden; }
.doc-selector-toggle {
  width: 100%; display: flex; align-items: center; gap: 8px;
  padding: 12px 16px; background: transparent; border: none;
  color: var(--im-muted); font-family: 'Orbitron', sans-serif;
  font-size: 10px; font-weight: 600; letter-spacing: 0.14em;
  text-transform: uppercase; cursor: pointer; transition: color 0.15s;
}
.doc-selector-toggle:hover { color: var(--im-orange); }
.doc-selector-icon { font-size: 12px; color: var(--im-crimson); }
.doc-selector-title { flex: 1; text-align: left; }
.doc-selector-badge {
  font-family: 'Share Tech Mono', monospace; font-size: 11px;
  color: var(--im-orange); background: rgba(192,57,27,0.12);
  padding: 2px 8px; border: 1px solid rgba(192,57,27,0.2);
}
.doc-selector-body { padding: 0 16px 14px; border-top: 1px solid rgba(192,57,27,0.1); }
.doc-selector-actions { display: flex; gap: 8px; padding: 10px 0 8px; }
.doc-selector-action {
  font-family: 'Orbitron', sans-serif; font-size: 9px;
  font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--im-muted); background: rgba(192,57,27,0.06);
  border: 1px solid var(--im-border); padding: 4px 12px;
  cursor: pointer; transition: all 0.15s;
}
.doc-selector-action:hover { background: rgba(192,57,27,0.14); color: var(--im-orange); border-color: var(--im-borderHv); }
.doc-selector-list { list-style: none; padding: 0; margin: 0; max-height: 180px; overflow-y: auto; }
.doc-selector-item { padding: 5px 0; }
.doc-selector-label { display: flex; align-items: center; gap: 8px; cursor: pointer; color: var(--im-mid); font-size: 12px; font-family: 'Share Tech Mono', monospace; transition: color 0.15s; }
.doc-selector-label:hover { color: var(--im-cream); }
.doc-selector-checkbox { accent-color: var(--im-crimson); width: 13px; height: 13px; cursor: pointer; }
.doc-selector-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.doc-selector-hint { font-size: 11px; color: var(--im-muted); margin-top: 8px; font-family: 'Share Tech Mono', monospace; }

/* ── Analytics ───────────────────────────────────────────────── */
.admin-analytics { border-top: 1px solid rgba(192,57,27,0.1); }
.analytics-toggle { width: 100%; display: flex; align-items: center; gap: 6px; padding: 10px 16px; background: none; border: none; color: var(--im-muted); font-family: 'Orbitron', sans-serif; font-size: 9px; font-weight: 700; letter-spacing: 0.16em; cursor: pointer; text-transform: uppercase; transition: color 0.15s; }
.analytics-toggle:hover { color: var(--im-orange); }
.analytics-body { padding: 8px 16px 16px; }
.analytics-loading, .analytics-empty { font-size: 11px; font-family: 'Share Tech Mono', monospace; color: var(--im-muted); text-align: center; padding: 16px 0; }
.kpi-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 6px; margin-bottom: 12px; }
.kpi-card { background: rgba(192,57,27,0.06); border: 1px solid rgba(192,57,27,0.15); padding: 10px 8px; display: flex; flex-direction: column; align-items: center; gap: 2px; }
.kpi-value { font-family: 'Orbitron', sans-serif; font-size: 17px; font-weight: 900; color: var(--im-orange); letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
.kpi-label { font-family: 'Orbitron', sans-serif; font-size: 8px; color: var(--im-muted); text-transform: uppercase; letter-spacing: 0.1em; text-align: center; }
.analytics-section { margin-bottom: 12px; }
.analytics-section-title { font-family: 'Orbitron', sans-serif; font-size: 9px; text-transform: uppercase; letter-spacing: 0.14em; color: var(--im-muted); margin: 0 0 6px; font-weight: 700; }
.mini-bar-chart { display: flex; flex-direction: column; gap: 4px; }
.bar-row { display: flex; align-items: center; gap: 6px; }
.bar-label { flex: 0 0 56px; font-size: 10px; color: var(--im-muted); font-family: 'Share Tech Mono', monospace; text-align: right; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bar-track { flex: 1; height: 4px; background: rgba(192,57,27,0.1); overflow: hidden; }
.bar-fill { height: 100%; transition: width 0.5s ease; min-width: 2px; background: linear-gradient(90deg, var(--im-crimson), var(--im-orange)); box-shadow: 0 0 4px rgba(232,130,74,0.4); }
.bar-value { flex: 0 0 24px; font-size: 10px; color: var(--im-muted); font-family: 'Share Tech Mono', monospace; font-variant-numeric: tabular-nums; }
.recent-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 3px; }
.recent-item { display: flex; justify-content: space-between; align-items: center; padding: 5px 8px; background: rgba(192,57,27,0.04); border: 1px solid transparent; transition: all 0.15s; }
.recent-item:hover { border-color: rgba(192,57,27,0.2); background: rgba(192,57,27,0.08); }
.recent-question { font-size: 11px; font-family: 'Share Tech Mono', monospace; color: var(--im-mid); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-right: 8px; }
.recent-meta { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.confidence-dot { font-family: 'Orbitron', sans-serif; font-size: 9px; font-weight: 700; padding: 1px 6px; letter-spacing: 0.06em; background: rgba(192,57,27,0.1); color: var(--im-orange); border: 1px solid rgba(192,57,27,0.2); }
.recent-time { font-size: 10px; font-family: 'Share Tech Mono', monospace; color: var(--im-muted); font-variant-numeric: tabular-nums; }
.analytics-refresh { width: 100%; padding: 6px; border: 1px solid var(--im-border); background: transparent; color: var(--im-muted); font-family: 'Orbitron', sans-serif; font-size: 9px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; cursor: pointer; transition: all 0.15s; margin-top: 4px; }
.analytics-refresh:hover { background: rgba(192,57,27,0.08); color: var(--im-orange); border-color: var(--im-borderHv); }

/* ── Feedback ────────────────────────────────────────────────── */
.feedback-container { display: flex; align-items: center; gap: 10px; margin-top: 16px; padding-top: 14px; border-top: 1px solid rgba(192,57,27,0.12); }
.feedback-label { font-family: 'Orbitron', sans-serif; font-size: 9px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: var(--im-muted); }
.feedback-btn { display: flex; align-items: center; justify-content: center; width: 30px; height: 30px; background: transparent; border: 1px solid var(--im-border); color: var(--im-muted); cursor: pointer; transition: all 0.15s; clip-path: polygon(3px 0%,100% 0%,calc(100% - 3px) 100%,0% 100%); }
.feedback-btn:hover { border-color: var(--im-borderHv); color: var(--im-orange); background: rgba(192,57,27,0.08); }
.feedback-btn.active { background: rgba(192,57,27,0.15); border-color: var(--im-orange); color: var(--im-orange); }

/* ── Scrollbar ───────────────────────────────────────────────── */
.custom-scrollbar::-webkit-scrollbar { width: 3px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(192,57,27,0.3); }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(232,130,74,0.5); }

/* ── Animations ──────────────────────────────────────────────── */
@keyframes arc-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
@keyframes hud-pulse { 0%,100% { opacity: 0.6; transform: scale(0.95); } 50% { opacity: 1; transform: scale(1.05); } }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

/* ── History items ───────────────────────────────────────────── */
.history-item-success { border-left: 2px solid rgba(192,57,27,0.5) !important; }
.history-item-refusal { border-left: 2px solid rgba(245,166,35,0.4) !important; }
.history-item-success:hover { border-left-color: var(--im-orange) !important; }

═══════════════════════════════════════════════════════════════
STEP 4 — frontend/src/App.jsx  (colour + layout retheme)
═══════════════════════════════════════════════════════════════

Do NOT change any state, logic, API calls, or imports.
Apply these className and style replacements:

1. Root wrapper div:
   NEW: className="h-full w-full flex flex-col overflow-hidden"
        style={{ background: '#0a0602', color: '#ffd4b8', fontFamily: "'Share Tech Mono', monospace" }}

2. Remove the two static background blur divs entirely.
   If AnimatedBackground component exists, keep it.

3. Header section wrapper div:
   NEW style: { borderBottom: '1px solid rgba(192,57,27,0.2)', background: 'rgba(19,12,6,0.8)', backdropFilter: 'blur(8px)', padding: '16px 0' }

4. h1 "RAG TERMINAL" — replace with:
   <h1 style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 900, fontSize: 'clamp(22px,3.5vw,34px)', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'linear-gradient(135deg, #ffd4b8 0%, #e8824a 40%, #c0391b 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
     RAG TERMINAL
   </h1>

5. Subtitle p tag:
   NEW: className="hud-label mt-2" — text: "// ADVANCED DOCUMENT ANALYSIS SYSTEM //"

6. ⌘K button if present:
   NEW: className="im-btn im-btn-ghost mt-2 text-[9px]"

7. Each main panel (upload div, document filter div, Q&A div):
   Add className="hud-card" and appropriate padding

8. DATA_MODULES heading text → "// DATA_MODULES //"
   NEW className: "hud-title flex items-center gap-2"

9. File count badge: className="doc-selector-badge"

10. File list items (li):
    NEW style={{ background: 'rgba(192,57,27,0.04)', borderLeft: '1px solid rgba(192,57,27,0.15)', marginBottom: '3px', padding: '8px 12px', transition: 'all 0.15s', fontFamily: "'Share Tech Mono', monospace", fontSize: '12px' }}
    Add onMouseEnter/Leave to toggle borderLeftColor between rgba(192,57,27,0.15) and var(--im-orange)

11. Delete button: color var(--im-muted), hover color var(--im-crimson)

12. Aside / right sidebar:
    NEW style={{ borderLeft: '1px solid rgba(192,57,27,0.15)', background: '#130c06' }}

13. Footer text → "// MARK_L · JARVIS_ONLINE · SYSTEMS_NOMINAL //"
    NEW style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '9px', letterSpacing: '0.16em', color: 'rgba(255,212,184,0.2)', borderTop: '1px solid rgba(192,57,27,0.1)', padding: '6px 0' }}

═══════════════════════════════════════════════════════════════
STEP 5 — frontend/src/components/QuestionInput.jsx
═══════════════════════════════════════════════════════════════

1. <select>: remove all className → className="jarvis-select"

2. <input>: remove all className → className="jarvis-input"
   placeholder: disabled ? '// OFFLINE — UPLOAD DATA TO ACTIVATE //' : '// ENTER QUERY FOR JARVIS...'

3. Loading spinner div:
   Replace with:
   <div className="arc-reactor" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
     <div className="arc-reactor-ring" style={{ width: 18, height: 18 }}></div>
     <div className="arc-reactor-core" style={{ width: 6, height: 6 }}></div>
   </div>

4. Submit button — replace entirely:
   <motion.button
     whileHover={!disabled && !isLoading && question.trim() ? { scale: 1.03, y: -1 } : {}}
     whileTap={!disabled && !isLoading && question.trim() ? { scale: 0.97 } : {}}
     transition={{ type: 'spring', stiffness: 400, damping: 20 }}
     type="submit"
     disabled={disabled || isLoading || !question.trim()}
     className={disabled || isLoading || !question.trim() ? 'im-btn im-btn-primary opacity-30 cursor-not-allowed' : 'im-btn im-btn-primary'}
   >
     {isLoading ? 'PROCESSING' : 'EXECUTE'}
   </motion.button>

5. Animated wrapper around input:
   <motion.div
     animate={{ boxShadow: question.length > 0 ? '0 0 12px rgba(192,57,27,0.3)' : 'none' }}
     transition={{ duration: 0.3 }}
     className="relative flex-1"
   >

═══════════════════════════════════════════════════════════════
STEP 6 — frontend/src/components/FileUpload.jsx
═══════════════════════════════════════════════════════════════

1. Drag-drop zone div:
   NEW: className={`im-upload-zone p-8 text-center ${isDragging ? 'drag-over' : ''} ${isUploading ? 'opacity-40 pointer-events-none' : ''}`}

2. Icon wrapper div:
   NEW style={{ width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, background: 'rgba(192,57,27,0.1)', border: '1px solid rgba(192,57,27,0.2)', color: 'rgba(232,130,74,0.7)', clipPath: 'polygon(6px 0%,100% 0%,calc(100% - 6px) 100%,0% 100%)' }}

3. Upload spinner: replace with arc-reactor component (same as QuestionInput step 3, size 32px ring / 10px core)

4. Upload title: NEW style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#ffd4b8', marginBottom: 4 }}
   Text: "// INITIATE DATA UPLOAD //"  |  uploading: "// TRANSMITTING //"

5. Upload subtitle: NEW className="hud-label mt-1"
   Text: "PDF · DOCX · TXT · CSV · EXCEL"

6. Progress bar:
   <div className="mt-4 px-1">
     <div className="flex justify-between hud-label mb-2">
       <span>TRANSMITTING</span><span>{uploadProgress}%</span>
     </div>
     <div className="im-progress-track">
       <motion.div className="im-progress-fill" style={{ height: '100%' }}
         initial={{ width: 0 }} animate={{ width: `${uploadProgress}%` }}
         transition={{ duration: 0.15 }} />
     </div>
   </div>

7. Message feedback:
   success style={{ background: 'rgba(192,57,27,0.08)', border: '1px solid rgba(192,57,27,0.25)', color: 'var(--im-orange)', fontFamily: 'Share Tech Mono, monospace', fontSize: 12, padding: '10px 14px', marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}
   error: same but color: 'rgba(255,212,184,0.5)'

═══════════════════════════════════════════════════════════════
STEP 7 — frontend/src/components/ConversationHistory.jsx
═══════════════════════════════════════════════════════════════

1. Outer div: NEW style={{ background: '#130c06', display: 'flex', flexDirection: 'column', height: '100%' }}

2. Header div: NEW style={{ borderBottom: '1px solid rgba(192,57,27,0.15)', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(10,6,2,0.5)' }}

3. LOGS heading: NEW className="hud-title flex items-center gap-2"
   Change text: "// MISSION_LOGS ({history.length}) //"

4. Clear/Purge button: NEW className="im-btn im-btn-ghost" style={{ fontSize: 9, padding: '4px 12px' }}
   Text: "PURGE"

5. Empty state:
   <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 180, gap: 8 }}>
     <div style={{ fontSize: 28, opacity: 0.1, fontFamily: 'Orbitron, sans-serif', fontWeight: 900 }}>◈</div>
     <p className="hud-label">NO MISSION DATA</p>
     <p style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 11, color: 'rgba(255,212,184,0.25)' }}>// execute query to initialize logs //</p>
   </div>

═══════════════════════════════════════════════════════════════
STEP 8 — frontend/src/components/HistoryItem.jsx
═══════════════════════════════════════════════════════════════

1. Main motion.div:
   className stays minimal — use inline style:
   style={{
     background: isExpanded ? '#1e1108' : 'rgba(192,57,27,0.03)',
     border: `1px solid ${isExpanded ? 'rgba(232,130,74,0.35)' : 'rgba(192,57,27,0.12)'}`,
     marginBottom: 4, cursor: 'pointer', transition: 'all 0.2s',
     clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))'
   }}
   transition: { type: 'spring', stiffness: 500, damping: 35 }

2. Question text:
   style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 12, color: isExpanded ? '#ffd4b8' : 'rgba(255,212,184,0.65)', lineHeight: 1.5 }}

3. Timestamp:
   NEW className="hud-label" — keep existing formatTimestamp logic

4. Expanded answer:
   style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 12, color: 'rgba(255,212,184,0.7)', lineHeight: 1.65, marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(192,57,27,0.1)' }}

═══════════════════════════════════════════════════════════════
STEP 9 — frontend/src/components/Toast.jsx  (full replacement)
═══════════════════════════════════════════════════════════════

Replace entire file with:

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

═══════════════════════════════════════════════════════════════
STEP 10 — frontend/src/components/LoadingOverlay.jsx  (full replacement)
═══════════════════════════════════════════════════════════════

Replace entire file with:

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

═══════════════════════════════════════════════════════════════
STEP 11 — AnimatedBackground.jsx  (recolor for Iron Man)
═══════════════════════════════════════════════════════════════

If this file exists, update ONLY these values:

  COLORS array:
    ['rgba(192,57,27,0.7)', 'rgba(232,130,74,0.5)', 'rgba(245,166,35,0.4)']

  CONNECT_DIST: 120
  PARTICLE_COUNT: 50
  velocity multiplier: 0.20 (slow, ember drift)
  speed cap: 0.6
  particle radius: Math.random() * 1.4 + 0.5
  edge strokeStyle: rgba(192,57,27,${alpha * 0.5})
  edge lineWidth: 0.4
  canvas opacity: 0.5

  Glow draw (after main fill):
    ctx.fillStyle = p.color.replace(/[\d.]+\)$/, '0.06)');

═══════════════════════════════════════════════════════════════
STEP 12 — Global cleanup scan
═══════════════════════════════════════════════════════════════

Search ALL files in frontend/src/ and replace:

  'text-cyber-primary'     → style={{ color: 'var(--im-orange)' }}
  'text-cyber-secondary'   → style={{ color: 'var(--im-muted)' }}
  'border-cyber-primary'   → style={{ borderColor: 'var(--im-border)' }}
  'bg-cyber-primary'       → style={{ background: 'rgba(192,57,27,0.15)' }}
  'bg-cyber-darker'        → style={{ background: '#130c06' }}
  'text-cyber-text'        → style={{ color: 'var(--im-cream)' }}
  'shadow-neon'            → (remove, replace with 'shadow-arc-sm' Tailwind class or inline)
  'text-apple-*'           → (remove, replace with im equivalents)
  'apple-*' class names    → equivalent im-* classes
  Any hex #00d4ff          → #e8824a
  Any hex #a855f7          → #c0391b
  Any hex #f5f5f7          → #ffd4b8
  Any hex #1d1d1f          → #1e1108

═══════════════════════════════════════════════════════════════
VERIFICATION
═══════════════════════════════════════════════════════════════

Run: cd frontend && npm install && npm run build

Expected visual result when complete:
  ✓ Near-black #0a0602 background with hex grid pattern overlay
  ✓ Crimson scanline sweep animated across viewport
  ✓ "RAG TERMINAL" in Orbitron 900 with gradient crimson→orange→cream
  ✓ All cards have angular clip-path cuts + corner bracket decorations
  ✓ Ember-orange particle field drifting slowly
  ✓ Input placeholder reads "// ENTER QUERY FOR JARVIS..."
  ✓ Submit button is angular clip-path shape, glows on hover
  ✓ Loading overlay shows dual-ring arc reactor spinner
  ✓ JARVIS PROCESSING in Orbitron during loading
  ✓ Answer panel has angular HUD frame with gold corner brackets
  ✓ All body text in Share Tech Mono monospace
  ✓ All labels/headings in Orbitron uppercase wide-tracking
  ✓ Confidence badge is angular clip-path pill
  ✓ Toast slides in as angular HUD notification with crimson progress bar
  ✓ History sidebar shows "// MISSION_LOGS //" heading
  ✓ Footer reads "// MARK_L · JARVIS_ONLINE · SYSTEMS_NOMINAL //"
  ✓ Zero cyan, zero purple, zero Apple white — full Iron Man palette
```
