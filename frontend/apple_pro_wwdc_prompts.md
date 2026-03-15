# RAG Terminal — Apple Pro · WWDC Stage
## Complete Implementation Prompts (6 total, run in order)

**Design system:**
- Background: `#000000`
- Surface 1: `#161617`
- Surface 2: `#1d1d1f`
- Surface 3: `#2d2d2f`
- Primary text: `#f5f5f7` (Apple warm-white — NOT #ffffff)
- Secondary text: `rgba(245,245,247,0.6)`
- Tertiary text: `rgba(245,245,247,0.35)`
- Border: `rgba(255,255,255,0.1)` (hairline)
- Border hover: `rgba(255,255,255,0.2)`
- Accent: `#ffffff`
- Font: `-apple-system, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', sans-serif`
- Heading tracking: `-0.04em`
- No gradients, no glow, no colour, no blur effects (zero neon)

---

## PROMPT 1 — Tailwind Config + HTML Entry

```
You are applying the Apple Pro WWDC Stage dark theme to the RAG Terminal React + Vite + Tailwind app.

CONTEXT:
- File: frontend/tailwind.config.js
- File: frontend/index.html
- Do NOT touch any component .jsx files in this step

────────────────────────────────────────
STEP 1 — Replace frontend/tailwind.config.js entirely with:
────────────────────────────────────────

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', 'Arial', 'sans-serif'],
        display: ['-apple-system', 'SF Pro Display', 'Helvetica Neue', 'sans-serif'],
        mono: ['SF Mono', 'ui-monospace', 'Menlo', 'Monaco', 'monospace'],
      },
      colors: {
        apple: {
          black:    '#000000',
          s1:       '#161617',
          s2:       '#1d1d1f',
          s3:       '#2d2d2f',
          s4:       '#3a3a3c',
          white:    '#f5f5f7',
          mid:      'rgba(245,245,247,0.6)',
          muted:    'rgba(245,245,247,0.35)',
          faint:    'rgba(245,245,247,0.12)',
          border:   'rgba(255,255,255,0.10)',
          borderHv: 'rgba(255,255,255,0.20)',
          pure:     '#ffffff',
        },
      },
      borderColor: {
        DEFAULT: 'rgba(255,255,255,0.10)',
      },
      fontSize: {
        '2xs': ['10px', { lineHeight: '1.4', letterSpacing: '0.08em' }],
      },
      letterSpacing: {
        apple:    '-0.04em',
        appleSm:  '-0.02em',
        appleWide: '0.06em',
      },
      boxShadow: {
        'apple-sm':  '0 1px 3px rgba(0,0,0,0.6)',
        'apple-md':  '0 4px 16px rgba(0,0,0,0.6)',
        'apple-lg':  '0 8px 32px rgba(0,0,0,0.7)',
        'apple-xl':  '0 20px 60px rgba(0,0,0,0.8)',
      },
      animation: {
        'apple-fade-up':   'apple-fade-up 0.5s cubic-bezier(0.25,0.46,0.45,0.94) forwards',
        'apple-fade-in':   'apple-fade-in 0.35s ease forwards',
        'apple-scale-in':  'apple-scale-in 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards',
        'apple-stagger-1': 'apple-fade-up 0.5s 0.05s cubic-bezier(0.25,0.46,0.45,0.94) forwards',
        'apple-stagger-2': 'apple-fade-up 0.5s 0.12s cubic-bezier(0.25,0.46,0.45,0.94) forwards',
        'apple-stagger-3': 'apple-fade-up 0.5s 0.20s cubic-bezier(0.25,0.46,0.45,0.94) forwards',
        'progress-bar':    'progress-bar 1.6s ease-in-out infinite',
      },
      keyframes: {
        'apple-fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'apple-fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'apple-scale-in': {
          '0%':   { opacity: '0', transform: 'scale(0.94)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'progress-bar': {
          '0%':   { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(400%)' },
        },
      },
    },
  },
  plugins: [],
}

────────────────────────────────────────
STEP 2 — Update frontend/index.html
────────────────────────────────────────

Replace the entire <head> content with:

  <meta charset="UTF-8" />
  <link rel="icon" type="image/svg+xml" href="/vite.svg" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="dark" />
  <title>RAG Terminal</title>

No external font links needed — SF Pro is a system font on Apple devices; Helvetica Neue is the fallback on others.

Run: cd frontend && npm run build to verify zero errors.
```

---

## PROMPT 2 — Global CSS (index.css full replacement)

```
You are replacing the entire contents of frontend/src/index.css with the Apple Pro WWDC Stage dark theme.

DESIGN SYSTEM:
  --apple-black:   #000000    (page background)
  --apple-s1:      #161617    (primary surface)
  --apple-s2:      #1d1d1f    (elevated surface)
  --apple-s3:      #2d2d2f    (hover/active surface)
  --apple-white:   #f5f5f7    (primary text — Apple warm-white)
  --apple-mid:     rgba(245,245,247,0.6)   (secondary text)
  --apple-muted:   rgba(245,245,247,0.35)  (tertiary text)
  --apple-faint:   rgba(245,245,247,0.06)  (subtle fills)
  --apple-border:  rgba(255,255,255,0.10)  (hairline border)
  --apple-borderHv:rgba(255,255,255,0.20)  (hover border)

Replace the FULL contents of frontend/src/index.css with exactly this:

@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --apple-black:    #000000;
  --apple-s1:       #161617;
  --apple-s2:       #1d1d1f;
  --apple-s3:       #2d2d2f;
  --apple-s4:       #3a3a3c;
  --apple-white:    #f5f5f7;
  --apple-mid:      rgba(245,245,247,0.6);
  --apple-muted:    rgba(245,245,247,0.35);
  --apple-faint:    rgba(245,245,247,0.06);
  --apple-border:   rgba(255,255,255,0.10);
  --apple-borderHv: rgba(255,255,255,0.20);
  --apple-pure:     #ffffff;

  font-family: -apple-system, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color-scheme: dark;
  line-height: 1.5;
}

html, body, #root {
  height: 100%;
  width: 100%;
  min-height: 100vh;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

body {
  background-color: var(--apple-black);
  color: var(--apple-white);
  min-width: 320px;
}

#root {
  display: flex;
  flex-direction: column;
}

* { box-sizing: border-box; }

::selection {
  background: rgba(255,255,255,0.18);
  color: #ffffff;
}

/* ── Scrollbar ───────────────────────────────────────────────── */
.custom-scrollbar::-webkit-scrollbar { width: 3px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.12);
  border-radius: 2px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255,255,255,0.22);
}

/* ── Apple surface cards ─────────────────────────────────────── */
.apple-card {
  background: var(--apple-s1);
  border: 0.5px solid var(--apple-border);
  border-radius: 18px;
  transition: border-color 0.2s ease;
}
.apple-card:hover {
  border-color: var(--apple-borderHv);
}
.apple-card-elevated {
  background: var(--apple-s2);
  border: 0.5px solid var(--apple-border);
  border-radius: 14px;
}

/* ── Typography helpers ──────────────────────────────────────── */
.apple-headline {
  font-size: clamp(28px, 4vw, 40px);
  font-weight: 700;
  letter-spacing: -0.04em;
  color: var(--apple-white);
  line-height: 1.05;
}
.apple-title {
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--apple-white);
}
.apple-body {
  font-size: 15px;
  font-weight: 400;
  letter-spacing: -0.01em;
  color: var(--apple-mid);
  line-height: 1.6;
}
.apple-caption {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--apple-muted);
}
.apple-mono {
  font-family: 'SF Mono', ui-monospace, Menlo, Monaco, monospace;
  font-size: 13px;
  color: var(--apple-mid);
}

/* ── Apple button ────────────────────────────────────────────── */
.apple-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 20px;
  border-radius: 980px;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: -0.01em;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  outline: none;
}
.apple-btn-primary {
  background: var(--apple-white);
  color: var(--apple-black);
}
.apple-btn-primary:hover:not(:disabled) {
  background: var(--apple-pure);
}
.apple-btn-primary:active:not(:disabled) {
  transform: scale(0.98);
  background: #e8e8ea;
}
.apple-btn-primary:disabled {
  background: var(--apple-s3);
  color: var(--apple-muted);
  cursor: not-allowed;
}
.apple-btn-ghost {
  background: transparent;
  color: var(--apple-mid);
  border: 0.5px solid var(--apple-border);
}
.apple-btn-ghost:hover:not(:disabled) {
  background: var(--apple-faint);
  border-color: var(--apple-borderHv);
  color: var(--apple-white);
}

/* ── Apple input ─────────────────────────────────────────────── */
.apple-input {
  background: var(--apple-s1);
  border: 0.5px solid var(--apple-border);
  border-radius: 10px;
  color: var(--apple-white);
  font-size: 15px;
  font-family: -apple-system, 'SF Pro Text', sans-serif;
  letter-spacing: -0.01em;
  padding: 12px 16px;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  width: 100%;
}
.apple-input::placeholder {
  color: var(--apple-muted);
}
.apple-input:focus {
  border-color: var(--apple-borderHv);
  box-shadow: 0 0 0 3px rgba(255,255,255,0.06);
}
.apple-input:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

/* ── Apple select ────────────────────────────────────────────── */
.apple-select {
  background: var(--apple-s1);
  border: 0.5px solid var(--apple-border);
  border-radius: 10px;
  color: var(--apple-white);
  font-size: 13px;
  font-family: -apple-system, 'SF Pro Text', sans-serif;
  padding: 10px 36px 10px 14px;
  outline: none;
  cursor: pointer;
  transition: border-color 0.2s;
  appearance: none;
  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='rgba(245,245,247,0.4)' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E");
  background-position: right 8px center;
  background-repeat: no-repeat;
  background-size: 20px;
}
.apple-select:focus {
  border-color: var(--apple-borderHv);
}
.apple-select:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

/* ── Upload zone ─────────────────────────────────────────────── */
.apple-upload-zone {
  border: 0.5px dashed rgba(255,255,255,0.18);
  border-radius: 18px;
  background: var(--apple-s1);
  transition: all 0.2s ease;
}
.apple-upload-zone:hover,
.apple-upload-zone.drag-over {
  border-color: rgba(255,255,255,0.35);
  background: var(--apple-s2);
}

/* ── Progress bar (indeterminate) ────────────────────────────── */
.apple-progress-track {
  width: 100%;
  height: 2px;
  background: rgba(255,255,255,0.08);
  border-radius: 1px;
  overflow: hidden;
}
.apple-progress-fill {
  height: 100%;
  width: 40%;
  background: var(--apple-white);
  border-radius: 1px;
  animation: progress-bar 1.6s ease-in-out infinite;
}
@keyframes progress-bar {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(400%); }
}

/* ── Answer display ──────────────────────────────────────────── */
.answer-display {
  padding: 24px 28px;
  background: var(--apple-s1);
  border: 0.5px solid var(--apple-border);
  border-radius: 18px;
  min-height: 120px;
}

.answer-header-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.answer-header-row h2 {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--apple-muted);
  margin: 0;
}

/* ── Markdown answer ─────────────────────────────────────────── */
.answer-markdown {
  font-size: 15px;
  line-height: 1.65;
  color: var(--apple-white);
  letter-spacing: -0.01em;
  word-wrap: break-word;
}
.answer-markdown h1,
.answer-markdown h2 {
  font-size: 19px;
  font-weight: 600;
  letter-spacing: -0.03em;
  color: var(--apple-white);
  margin-top: 1.8rem;
  margin-bottom: 0.8rem;
  padding-bottom: 8px;
  border-bottom: 0.5px solid var(--apple-border);
}
.answer-markdown h3 {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--apple-white);
  margin-top: 1.4rem;
  margin-bottom: 0.5rem;
}
.answer-markdown p { margin-bottom: 1rem; }
.answer-markdown ul, .answer-markdown ol {
  margin-left: 1.5rem;
  margin-bottom: 1rem;
}
.answer-markdown li { margin-bottom: 0.4rem; }
.answer-markdown li::marker { color: var(--apple-muted); }
.answer-markdown strong { color: var(--apple-pure); font-weight: 600; }
.answer-markdown em { color: var(--apple-mid); }
.answer-markdown a { color: var(--apple-white); text-decoration: underline; text-underline-offset: 3px; text-decoration-color: rgba(245,245,247,0.4); }
.answer-markdown a:hover { text-decoration-color: var(--apple-white); }
.answer-markdown code {
  background: var(--apple-s3);
  color: var(--apple-white);
  padding: 2px 7px;
  border-radius: 5px;
  font-family: 'SF Mono', ui-monospace, Menlo, monospace;
  font-size: 12px;
  border: 0.5px solid var(--apple-border);
}
.answer-markdown pre {
  background: var(--apple-s2);
  border: 0.5px solid var(--apple-border);
  border-radius: 12px;
  padding: 16px 20px;
  overflow-x: auto;
  margin-bottom: 1rem;
}
.answer-markdown pre code {
  background: none;
  border: none;
  padding: 0;
  font-size: 13px;
}
.answer-markdown blockquote {
  border-left: 2px solid rgba(255,255,255,0.2);
  padding-left: 16px;
  color: var(--apple-mid);
  margin: 1rem 0;
}
.answer-markdown table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  margin-bottom: 1rem;
}
.answer-markdown th {
  text-align: left;
  font-weight: 600;
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--apple-muted);
  border-bottom: 0.5px solid var(--apple-border);
  padding: 8px 12px;
}
.answer-markdown td {
  padding: 10px 12px;
  border-bottom: 0.5px solid rgba(255,255,255,0.05);
  color: var(--apple-white);
  vertical-align: top;
}
.answer-markdown tr:last-child td { border-bottom: none; }
.answer-markdown tr:hover td { background: var(--apple-faint); }

/* ── Confidence badge ────────────────────────────────────────── */
.confidence-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.04em;
  border: 0.5px solid;
  animation: apple-scale-in 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards;
}
@keyframes apple-scale-in {
  0%   { opacity: 0; transform: scale(0.85); }
  100% { opacity: 1; transform: scale(1); }
}
.confidence-high {
  color: rgba(245,245,247,0.9);
  background: rgba(255,255,255,0.08);
  border-color: rgba(255,255,255,0.15);
}
.confidence-mid {
  color: rgba(245,245,247,0.7);
  background: rgba(255,255,255,0.05);
  border-color: rgba(255,255,255,0.10);
}
.confidence-low {
  color: rgba(245,245,247,0.45);
  background: rgba(255,255,255,0.03);
  border-color: rgba(255,255,255,0.08);
}

/* ── Typing cursor ───────────────────────────────────────────── */
.typing-cursor::after {
  content: '|';
  color: var(--apple-mid);
  animation: cursor-blink 1s step-end infinite;
  margin-left: 2px;
}
@keyframes cursor-blink {
  0%,100% { opacity: 1; }
  50%      { opacity: 0; }
}

/* ── Skeleton loader ─────────────────────────────────────────── */
.skeleton-line {
  height: 12px;
  background: var(--apple-s3);
  border-radius: 6px;
  margin-bottom: 10px;
  position: relative;
  overflow: hidden;
}
.skeleton-line::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%);
  background-size: 200% 100%;
  animation: skeleton-sweep 1.8s ease-in-out infinite;
}
@keyframes skeleton-sweep {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
.skeleton-line-long  { width: 88%; }
.skeleton-line-medium { width: 66%; }
.skeleton-line-short { width: 42%; }

/* ── Fade reveal ─────────────────────────────────────────────── */
.fade-reveal-container > * {
  animation: apple-fade-in 0.3s ease both;
}
.fade-reveal-container > *:nth-child(1) { animation-delay: 0ms; }
.fade-reveal-container > *:nth-child(2) { animation-delay: 50ms; }
.fade-reveal-container > *:nth-child(3) { animation-delay: 100ms; }
.fade-reveal-container > *:nth-child(4) { animation-delay: 150ms; }
.fade-reveal-container > *:nth-child(n+5) { animation-delay: 200ms; }
@keyframes apple-fade-in {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
.answer-wrapper { position: relative; }

/* ── Document selector ───────────────────────────────────────── */
.doc-selector {
  background: var(--apple-s1);
  border: 0.5px solid var(--apple-border);
  border-radius: 14px;
  overflow: hidden;
}
.doc-selector-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: transparent;
  border: none;
  color: var(--apple-mid);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
  transition: color 0.15s;
  font-family: -apple-system, 'SF Pro Text', sans-serif;
}
.doc-selector-toggle:hover { color: var(--apple-white); }
.doc-selector-icon { font-size: 12px; color: var(--apple-muted); }
.doc-selector-title { flex: 1; text-align: left; }
.doc-selector-badge {
  font-size: 11px;
  color: var(--apple-muted);
  background: rgba(255,255,255,0.06);
  padding: 2px 8px;
  border-radius: 4px;
  font-family: 'SF Mono', monospace;
  border: 0.5px solid var(--apple-border);
}
.doc-selector-body {
  padding: 0 16px 14px;
  border-top: 0.5px solid var(--apple-border);
}
.doc-selector-actions {
  display: flex;
  gap: 8px;
  padding: 10px 0 8px;
}
.doc-selector-action {
  font-size: 11px;
  color: var(--apple-mid);
  background: rgba(255,255,255,0.04);
  border: 0.5px solid var(--apple-border);
  border-radius: 6px;
  padding: 4px 12px;
  cursor: pointer;
  transition: all 0.15s;
  font-family: -apple-system, sans-serif;
}
.doc-selector-action:hover {
  background: rgba(255,255,255,0.08);
  color: var(--apple-white);
  border-color: var(--apple-borderHv);
}
.doc-selector-list { list-style: none; padding: 0; margin: 0; max-height: 180px; overflow-y: auto; }
.doc-selector-item { padding: 5px 0; }
.doc-selector-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: var(--apple-mid);
  font-size: 13px;
  transition: color 0.15s;
}
.doc-selector-label:hover { color: var(--apple-white); }
.doc-selector-checkbox { accent-color: #f5f5f7; width: 14px; height: 14px; cursor: pointer; }
.doc-selector-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.doc-selector-hint { font-size: 11px; color: var(--apple-muted); margin-top: 8px; }

/* ── Analytics ───────────────────────────────────────────────── */
.admin-analytics { border-top: 0.5px solid var(--apple-border); padding: 0; }
.analytics-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: none;
  border: none;
  color: var(--apple-muted);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  cursor: pointer;
  text-transform: uppercase;
  transition: color 0.15s;
  font-family: -apple-system, 'SF Pro Text', sans-serif;
}
.analytics-toggle:hover { color: var(--apple-white); }
.analytics-body { padding: 8px 16px 16px; }
.analytics-loading, .analytics-empty {
  font-size: 12px;
  color: var(--apple-muted);
  text-align: center;
  padding: 16px 0;
}
.kpi-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 6px; margin-bottom: 12px; }
.kpi-card {
  background: rgba(255,255,255,0.03);
  border: 0.5px solid var(--apple-border);
  border-radius: 10px;
  padding: 10px 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.kpi-value { font-size: 18px; font-weight: 700; color: var(--apple-white); letter-spacing: -0.03em; font-variant-numeric: tabular-nums; }
.kpi-label { font-size: 9px; color: var(--apple-muted); text-transform: uppercase; letter-spacing: 0.08em; text-align: center; }
.analytics-section { margin-bottom: 12px; }
.analytics-section-title { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--apple-muted); margin: 0 0 6px; font-weight: 600; }
.mini-bar-chart { display: flex; flex-direction: column; gap: 4px; }
.bar-row { display: flex; align-items: center; gap: 6px; }
.bar-label { flex: 0 0 56px; font-size: 10px; color: var(--apple-muted); text-align: right; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bar-track { flex: 1; height: 4px; background: rgba(255,255,255,0.05); border-radius: 2px; overflow: hidden; }
.bar-fill { height: 100%; border-radius: 2px; transition: width 0.5s ease; background: rgba(245,245,247,0.5); min-width: 2px; }
.bar-value { flex: 0 0 24px; font-size: 10px; color: var(--apple-muted); font-variant-numeric: tabular-nums; }
.recent-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 3px; }
.recent-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 8px;
  border-radius: 7px;
  background: rgba(255,255,255,0.02);
  border: 0.5px solid transparent;
}
.recent-item:hover { border-color: var(--apple-border); background: rgba(255,255,255,0.04); }
.recent-question { font-size: 11px; color: var(--apple-mid); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-right: 8px; }
.recent-meta { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.confidence-dot {
  font-size: 10px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 999px;
  background: rgba(255,255,255,0.06);
  color: var(--apple-mid);
  border: 0.5px solid var(--apple-border);
}
.recent-time { font-size: 10px; color: var(--apple-muted); font-variant-numeric: tabular-nums; }
.analytics-refresh {
  width: 100%;
  padding: 6px;
  border: 0.5px solid var(--apple-border);
  border-radius: 8px;
  background: transparent;
  color: var(--apple-muted);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s;
  margin-top: 4px;
  font-family: -apple-system, sans-serif;
}
.analytics-refresh:hover { background: rgba(255,255,255,0.04); color: var(--apple-white); border-color: var(--apple-borderHv); }

/* ── Feedback buttons ────────────────────────────────────────── */
.feedback-container { display: flex; align-items: center; gap: 8px; margin-top: 16px; padding-top: 16px; border-top: 0.5px solid var(--apple-border); }
.feedback-label { font-size: 11px; color: var(--apple-muted); letter-spacing: 0.04em; text-transform: uppercase; }
.feedback-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 0.5px solid var(--apple-border);
  background: transparent;
  color: var(--apple-muted);
  cursor: pointer;
  transition: all 0.15s;
}
.feedback-btn:hover { border-color: var(--apple-borderHv); color: var(--apple-white); background: rgba(255,255,255,0.04); }
.feedback-btn.active { background: rgba(255,255,255,0.08); border-color: var(--apple-borderHv); color: var(--apple-white); }

Run: cd frontend && npm run build to verify no errors.
```

---

## PROMPT 3 — App.jsx Layout Retheme

```
You are rethreading every Tailwind className in frontend/src/App.jsx to match the Apple Pro WWDC Stage dark theme.

RULES:
- Replace ALL cyber-* colour references with apple-* equivalents
- Remove all glow, neon, shadow-neon, blur blob effects
- Use apple-card / apple-card-elevated CSS classes for surfaces
- Do NOT change any state logic, callbacks, API calls, or imports
- Typography uses font-display for the brand heading, font-sans everywhere else
- The new token set is in tailwind.config.js under colors.apple.*

REPLACEMENTS — apply every one of these:

1. Root wrapper div:
   OLD: className="h-full w-full flex flex-col text-cyber-text font-sans selection:bg-cyber-primary selection:text-cyber-darker overflow-hidden"
   NEW: className="h-full w-full flex flex-col overflow-hidden" style={{ background: '#000000', color: '#f5f5f7' }}

2. Background blobs div (the fixed inset-0 with two blur divs):
   REMOVE the entire div entirely. Replace with nothing — pure black body handles background.

3. Header section (the div wrapping h1 + p):
   OLD: className="flex-none py-4 sm:py-6 text-center border-b border-cyber-primary/10 bg-cyber-darker/30 backdrop-blur-sm"
   NEW: className="flex-none py-5 sm:py-7 text-center" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}

4. h1 "RAG TERMINAL":
   OLD: className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyber-primary to-cyber-secondary tracking-tight drop-shadow-[...]"
   NEW: className="font-display font-bold tracking-[-0.04em]" style={{ fontSize: 'clamp(26px,4vw,38px)', color: '#f5f5f7', letterSpacing: '-0.04em' }}

5. Subtitle p tag:
   OLD: className="text-cyber-text/60 text-xs sm:text-sm uppercase tracking-widest mt-1"
   NEW: className="apple-caption mt-2"

6. ⌘K hint button (if present):
   OLD: className="mt-2 text-[10px] text-cyber-text/25 border border-cyber-primary/10 px-3 py-1 rounded-full font-mono ..."
   NEW: className="mt-2 apple-caption apple-btn apple-btn-ghost px-3 py-1 text-[10px]"

7. Main content scrollable area:
   OLD: className="flex-1 overflow-y-auto custom-scrollbar p-2 sm:p-4 lg:p-6"
   NEW: className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-5 lg:p-7"

8. Document modules panel (the bg-cyber-darker/50 backdrop-blur-md border border-cyber-primary/20 rounded-xl div):
   OLD: className="bg-cyber-darker/50 backdrop-blur-md border border-cyber-primary/20 rounded-xl p-4 shadow-lg shadow-cyber-primary/5"
   NEW: className="apple-card p-4"

9. DATA_MODULES heading:
   OLD: className="text-cyber-primary font-semibold tracking-wide flex items-center gap-2"
   NEW: className="apple-caption flex items-center gap-2"

10. The green dot / indicator span inside DATA_MODULES heading:
    OLD: className="w-2 h-2 rounded-full bg-cyber-primary shadow-[0_0_8px_rgba(0,212,255,0.8)]"
    NEW: className="w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(245,245,247,0.4)' }}

11. File count badge span:
    OLD: className="text-xs text-cyber-text/50 bg-cyber-primary/10 px-2 py-0.5 rounded font-mono"
    NEW: className="doc-selector-badge"

12. Each file list item (li):
    OLD: className="group flex items-center justify-between bg-cyber-darker/80 p-3 rounded-lg border border-white/5 hover:border-cyber-primary/40 transition-all duration-300 hover:shadow-[...]"
    NEW: className="group flex items-center justify-between p-3 rounded-xl transition-all duration-200" style={{ background: 'rgba(255,255,255,0.02)', border: '0.5px solid transparent' }} onMouseEnter={(e) => e.currentTarget.style.borderColor='rgba(255,255,255,0.1)'} onMouseLeave={(e) => e.currentTarget.style.borderColor='transparent'}

13. File name span inside list:
    OLD: className="text-sm truncate max-w-[180px] text-cyber-text/80 group-hover:text-cyber-primary transition-colors"
    NEW: className="text-sm truncate max-w-[180px] transition-colors" style={{ color: 'rgba(245,245,247,0.65)' }}

14. Delete button inside list:
    OLD: className="opacity-0 group-hover:opacity-100 p-1.5 text-cyber-secondary hover:bg-cyber-secondary/20 rounded transition-all duration-300"
    NEW: className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all duration-200" style={{ color: 'rgba(245,245,247,0.4)' }}

15. Aside / right sidebar:
    OLD: className="w-full lg:w-[260px] xl:w-[280px] flex-none h-[40vh] lg:h-full border-t lg:border-t-0 lg:border-l border-cyber-primary/10 bg-cyber-darker/50 backdrop-blur-md overflow-hidden z-20"
    NEW: className="w-full lg:w-[260px] xl:w-[280px] flex-none h-[40vh] lg:h-full overflow-hidden z-20" style={{ borderTop: '0.5px solid rgba(255,255,255,0.08)', borderLeft: '0.5px solid rgba(255,255,255,0.08)', background: '#161617' }}

16. Footer:
    OLD: className="fixed bottom-0 left-0 w-full text-center py-1 text-[10px] text-cyber-text/30 pointer-events-none z-50 mix-blend-screen"
    NEW: className="fixed bottom-0 left-0 w-full text-center py-1 pointer-events-none z-50 apple-caption" style={{ opacity: 0.25 }}

After all replacements, run: cd frontend && npm run build
```

---

## PROMPT 4 — QuestionInput + FileUpload Components

```
You are rethreading the QuestionInput and FileUpload components to the Apple Pro WWDC Stage dark theme.

CONTEXT:
- frontend/src/components/QuestionInput.jsx
- frontend/src/components/FileUpload.jsx
- CSS utility classes available: apple-input, apple-select, apple-btn, apple-btn-primary, apple-btn-ghost, apple-upload-zone, apple-progress-track, apple-progress-fill, apple-caption, apple-mono
- Do NOT change any state logic, form handlers, or API calls
- framer-motion whileHover/whileTap can stay; remove all boxShadow glow values from them

────────────────────────────────────────
QuestionInput.jsx — full className replacements:
────────────────────────────────────────

1. Outer wrapper div:
   OLD: className="w-full"
   NEW: className="w-full"  (no change needed here)

2. The <select> element:
   Remove ALL existing className. Replace with: className="apple-select"

3. The text <input> element:
   Remove ALL existing className. Replace with: className="apple-input"
   Update placeholder to:
     disabled ? '> Upload documents to begin...' : '> Ask anything about your documents...'

4. The loading spinner div (inside the input wrapper):
   OLD: className="w-4 h-4 border-2 border-cyber-primary border-t-transparent rounded-full animate-spin"
   NEW: className="w-4 h-4 rounded-full animate-spin" style={{ border: '1.5px solid rgba(245,245,247,0.15)', borderTopColor: '#f5f5f7' }}

5. The submit <motion.button>:
   - Remove ALL existing className
   - Change whileHover to: whileHover={{ scale: 1.02 }}  (remove boxShadow)
   - Change whileTap to: whileTap={{ scale: 0.97 }}
   - Add: transition={{ type: 'spring', stiffness: 400, damping: 20 }}
   - New className:
     {disabled || isLoading || !question.trim()
       ? 'apple-btn apple-btn-primary opacity-30 cursor-not-allowed'
       : 'apple-btn apple-btn-primary'
     }
   - Button text: change 'EXECUTE' to 'Analyze' and 'PROCESSING...' to 'Analyzing...'

6. The form gap and layout:
   Keep: className="flex flex-col sm:flex-row gap-3"
   The select wrapper div: className="flex-none w-full sm:w-44"
   The input wrapper div: className="relative flex-1"

────────────────────────────────────────
FileUpload.jsx — full className replacements:
────────────────────────────────────────

1. The outer motion.div wrapper — keep framer-motion, update className:
   OLD: className="w-full"
   NEW: className="w-full"

2. The drag-drop zone div:
   OLD: className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${isDragging ? 'border-cyber-primary bg-cyber-primary/10 shadow-[...]' : 'border-cyber-primary/30 hover:border-cyber-primary/60 bg-cyber-darker/50'} ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
   NEW: className={`apple-upload-zone p-8 text-center ${isDragging ? 'drag-over' : ''} ${isUploading ? 'opacity-40 pointer-events-none' : ''}`}

3. Upload icon wrapper div:
   OLD: className={`w-16 h-16 mb-4 rounded-full flex items-center justify-center transition-all duration-300 ${isDragging ? 'bg-cyber-primary/20 text-cyber-primary' : 'bg-cyber-darker text-cyber-primary/50 group-hover:text-cyber-primary'}`}
   NEW: className="w-14 h-14 mb-4 rounded-2xl flex items-center justify-center transition-all duration-200" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(245,245,247,0.5)' }}

4. Upload spinner:
   OLD: className="w-8 h-8 border-2 border-cyber-primary border-t-transparent rounded-full animate-spin"
   NEW: className="w-7 h-7 rounded-full animate-spin" style={{ border: '1.5px solid rgba(245,245,247,0.1)', borderTopColor: '#f5f5f7' }}

5. Upload icon SVG:
   OLD: className="h-8 w-8"
   NEW: className="h-7 w-7" style={{ color: 'rgba(245,245,247,0.45)' }}

6. Upload title p tag:
   OLD: className="text-lg font-medium text-cyber-text mb-2"
   NEW: className="text-[15px] font-semibold mb-1 tracking-[-0.01em]" style={{ color: '#f5f5f7' }}
   Change text from 'INITIATE DATA UPLOAD' to 'Drop files to upload'
   Change text from 'UPLOADING...' to 'Uploading...'

7. Upload subtitle p tag:
   OLD: className="text-xs text-cyber-text/50 uppercase tracking-widest"
   NEW: className="apple-caption"
   Change text from 'Drag & Drop PDF, DOCX, TXT, Excel' to 'PDF, DOCX, TXT, CSV, Excel'

8. Progress bar section:
   Replace the existing progress bar div with:
   <div className="mt-4 px-1">
     <div className="flex justify-between apple-caption mb-2">
       <span>Uploading</span>
       <span>{uploadProgress}%</span>
     </div>
     <div className="apple-progress-track">
       <motion.div
         className="h-full rounded-full" style={{ background: '#f5f5f7' }}
         initial={{ width: 0 }}
         animate={{ width: `${uploadProgress}%` }}
         transition={{ duration: 0.15 }}
       />
     </div>
   </div>

9. Job status items:
   OLD: className={`flex items-center gap-2 text-xs px-2 py-1 rounded ${statusColor(j.status)}`}
   NEW: className="flex items-center gap-2 text-[11px] px-2 py-1 rounded-lg" style={{ color: 'rgba(245,245,247,0.6)', background: 'rgba(255,255,255,0.03)' }}

10. Message feedback div:
    OLD success: className="mt-4 p-3 rounded-lg border text-sm ... bg-green-500/10 border-green-500/30 text-green-400"
    NEW success: className="mt-4 p-3 rounded-xl border text-[13px] flex items-center gap-2" style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.12)', color: 'rgba(245,245,247,0.8)' }}
    OLD error: className="... bg-red-500/10 border-red-500/30 text-red-400"
    NEW error: same as success but color: 'rgba(245,245,247,0.5)'

After changes, run: cd frontend && npm run build
```

---

## PROMPT 5 — AnswerDisplay + ConversationHistory + HistoryItem

```
You are rethreading three components to the Apple Pro WWDC Stage dark theme.

FILES:
- frontend/src/components/AnswerDisplay.jsx
- frontend/src/components/ConversationHistory.jsx
- frontend/src/components/HistoryItem.jsx

CSS CLASSES AVAILABLE: answer-display, answer-header-row, answer-markdown, confidence-badge, confidence-high/mid/low, typing-cursor, skeleton-line, skeleton-line-long/medium/short, fade-reveal-container, answer-wrapper, apple-caption, apple-card, apple-mono

Do NOT change any logic, refusal detection, streaming handling, or props.

────────────────────────────────────────
AnswerDisplay.jsx replacements:
────────────────────────────────────────

The CSS classes answer-display, answer-header-row, answer-markdown, confidence-badge, skeleton-line variants, typing-cursor, and fade-reveal-container are already defined in index.css.

1. Find any hardcoded className on the outer answer wrapper div and replace with: className="answer-display"

2. Find any inline styles or className overrides on h2 "Answer" or "Generated Analysis" heading — remove them; the .answer-header-row h2 CSS handles it.

3. For the empty/idle state placeholder div:
   Replace with:
   <div className="flex flex-col items-center justify-center py-12 gap-3">
     <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
       <rect x="6" y="4" width="20" height="24" rx="3" stroke="rgba(245,245,247,0.15)" strokeWidth="1"/>
       <line x1="10" y1="10" x2="22" y2="10" stroke="rgba(245,245,247,0.12)" strokeWidth="1"/>
       <line x1="10" y1="14" x2="22" y2="14" stroke="rgba(245,245,247,0.12)" strokeWidth="1"/>
       <line x1="10" y1="18" x2="18" y2="18" stroke="rgba(245,245,247,0.12)" strokeWidth="1"/>
     </svg>
     <p className="apple-caption">Upload a document and ask a question</p>
   </div>

4. For the table output wrapper (structured answer):
   OLD: any className with cyber colors on the table wrapper, table, th, td
   NEW: Use the .answer-markdown table / th / td CSS already defined — wrap the table in <div className="answer-markdown overflow-x-auto">

────────────────────────────────────────
ConversationHistory.jsx — full retheme:
────────────────────────────────────────

1. Outer wrapper div:
   OLD: className="flex flex-col h-full bg-cyber-darker/30 backdrop-blur-sm border-l border-cyber-primary/10"
   NEW: className="flex flex-col h-full" style={{ background: '#161617' }}

2. Header div (title + purge button row):
   OLD: className="flex items-center justify-between p-4 border-b border-cyber-primary/10 bg-cyber-darker/80"
   NEW: className="flex items-center justify-between p-4" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}

3. LOGS heading:
   OLD: className="text-sm font-bold text-cyber-primary uppercase tracking-wider flex items-center gap-2"
   NEW: className="apple-caption flex items-center gap-2"

4. Clock SVG icon inside heading: change stroke to rgba(245,245,247,0.35)

5. Purge button:
   OLD: className="text-xs text-cyber-secondary hover:text-white ... border border-cyber-secondary/30 hover:bg-cyber-secondary/20 px-2 py-1 rounded"
   NEW: className="apple-btn apple-btn-ghost px-3 py-1 text-[11px]" style={{ borderRadius: '7px' }}
   Change text from 'Purge' to 'Clear'

6. Scroll area div: className="flex-1 overflow-y-auto p-4 custom-scrollbar"  (no change)

7. Empty state div:
   OLD: className="flex flex-col items-center justify-center h-48 text-cyber-text/30"
   NEW: className="flex flex-col items-center justify-center h-48 gap-2"
   Change p tags:
   - "No Data Streams Active" → "No queries yet"  — className="apple-caption"
   - subtitle → "Ask a question to see your history" — className="apple-caption" style={{ opacity: 0.4 }}

8. Buffer limit div:
   OLD: className="text-[10px] text-cyber-secondary/70 text-center py-2 bg-cyber-secondary/5 border-t border-cyber-secondary/10"
   NEW: className="apple-caption text-center py-2" style={{ borderTop: '0.5px solid rgba(255,255,255,0.08)', opacity: 0.5 }}

────────────────────────────────────────
HistoryItem.jsx — full retheme:
────────────────────────────────────────

1. The main motion.div wrapper — update className:
   OLD: className={`group rounded-lg border transition-all duration-300 overflow-hidden cursor-pointer backdrop-blur-sm ${isExpanded ? 'bg-cyber-darker border-cyber-primary shadow-[0_0_15px_rgba(0,212,255,0.1)]' : 'bg-black/20 border-white/5 hover:border-cyber-primary/50 hover:bg-cyber-darker/60'} ${item.isRefusal ? 'border-cyber-secondary/30 bg-cyber-secondary/5' : ''}`}
   NEW: Keep the motion.div, change className to:
   className="group rounded-xl cursor-pointer overflow-hidden transition-all duration-200"
   style={{
     background: isExpanded ? '#1d1d1f' : 'rgba(255,255,255,0.02)',
     border: `0.5px solid ${isExpanded ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)'}`,
   }}

2. Question text div:
   OLD: className={`font-medium text-sm line-clamp-2 ${isExpanded ? 'text-cyber-primary' : 'text-cyber-text/80 group-hover:text-cyber-text'}`}
   NEW: className="font-medium text-[13px] line-clamp-2 transition-colors" style={{ color: isExpanded ? '#f5f5f7' : 'rgba(245,245,247,0.7)', letterSpacing: '-0.01em' }}

3. Timestamp span: className="apple-caption flex-shrink-0" (remove any cyber color)

4. Refusal badge (if present):
   OLD: any className with text-cyber-secondary or bg-cyber-secondary
   NEW: className="apple-caption px-2 py-0.5 rounded-md" style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)' }}

5. Expanded answer text:
   OLD: any className with text-cyber-text
   NEW: className="text-[13px] leading-relaxed" style={{ color: 'rgba(245,245,247,0.65)', letterSpacing: '-0.01em' }}

6. Source count text: className="apple-caption mt-1"

After all changes, run: cd frontend && npm run build
```

---

## PROMPT 6 — Toast + LoadingOverlay + Footer Text

```
You are rethreading the Toast and LoadingOverlay components to the Apple Pro WWDC Stage dark theme.

FILES:
- frontend/src/components/Toast.jsx
- frontend/src/components/LoadingOverlay.jsx

Do NOT change animation logic or timing. Only visual styles.

────────────────────────────────────────
Toast.jsx — replace full file contents with:
────────────────────────────────────────

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const CONFIG = {
  success: { icon: '✓', color: 'rgba(245,245,247,0.9)',  bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.15)' },
  error:   { icon: '✕', color: 'rgba(245,245,247,0.6)',  bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.1)'  },
  info:    { icon: 'i', color: 'rgba(245,245,247,0.75)', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.12)' },
  warning: { icon: '!', color: 'rgba(245,245,247,0.65)', bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.1)'  },
};

const DURATION = 4000;

export default function Toast({ message, type = 'info', onClose }) {
  const [progress, setProgress] = useState(100);
  const c = CONFIG[type] || CONFIG.info;

  useEffect(() => {
    if (!message) return;
    setProgress(100);
    const start = Date.now();
    const interval = setInterval(() => {
      const remaining = Math.max(0, 100 - ((Date.now() - start) / DURATION) * 100);
      setProgress(remaining);
      if (remaining <= 0) { clearInterval(interval); onClose?.(); }
    }, 30);
    return () => clearInterval(interval);
  }, [message]);

  return (
    <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 50000, pointerEvents: 'none' }}>
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            style={{ pointerEvents: 'all' }}
          >
            <div
              onClick={onClose}
              style={{
                background: '#1c1c1e',
                border: `0.5px solid ${c.border}`,
                borderRadius: 14,
                padding: '11px 14px',
                minWidth: 240,
                maxWidth: 360,
                cursor: 'pointer',
                boxShadow: '0 8px 32px rgba(0,0,0,0.7), 0 1px 0 rgba(255,255,255,0.05) inset',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                  background: c.bg, border: `0.5px solid ${c.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 600, color: c.color,
                }}>
                  {c.icon}
                </div>
                <span style={{
                  flex: 1, fontSize: 13, color: '#f5f5f7', lineHeight: 1.45,
                  fontFamily: '-apple-system, SF Pro Text, Helvetica Neue, sans-serif',
                  letterSpacing: '-0.01em',
                }}>
                  {message}
                </span>
                <button onClick={(e) => { e.stopPropagation(); onClose?.(); }}
                  style={{ background: 'none', border: 'none', color: 'rgba(245,245,247,0.3)', fontSize: 16, cursor: 'pointer', paddingLeft: 8, lineHeight: 1 }}>
                  ×
                </button>
              </div>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '1.5px', background: 'rgba(255,255,255,0.04)' }}>
                <div style={{ height: '100%', background: 'rgba(245,245,247,0.3)', width: `${progress}%`, transition: 'none' }} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

────────────────────────────────────────
LoadingOverlay.jsx — replace full file contents with:
────────────────────────────────────────

import { motion, AnimatePresence } from 'framer-motion';

export default function LoadingOverlay({ isLoading }) {
  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            zIndex: 9000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ delay: 0.05, type: 'spring', stiffness: 400, damping: 30 }}
            style={{
              background: '#1c1c1e',
              border: '0.5px solid rgba(255,255,255,0.12)',
              borderRadius: 20,
              padding: '28px 40px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 16,
              boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
            }}
          >
            <div style={{ position: 'relative', width: 36, height: 36 }}>
              <div style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                border: '1.5px solid rgba(245,245,247,0.1)',
              }} />
              <div style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                border: '1.5px solid transparent',
                borderTopColor: '#f5f5f7',
                animation: 'spin 0.9s linear infinite',
              }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{
                fontSize: 14, fontWeight: 600, color: '#f5f5f7',
                letterSpacing: '-0.02em', margin: '0 0 4px',
                fontFamily: '-apple-system, SF Pro Display, sans-serif',
              }}>
                Analyzing
              </p>
              <p style={{
                fontSize: 12, color: 'rgba(245,245,247,0.4)',
                letterSpacing: '0.02em', margin: 0,
                fontFamily: '-apple-system, SF Pro Text, sans-serif',
              }}>
                Processing your query
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

Add this keyframe to the END of frontend/src/index.css:

@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

────────────────────────────────────────
FINAL PASS — scan all remaining files
────────────────────────────────────────

Do a global search across ALL files in frontend/src/ for these strings and replace:

  'text-cyber-primary'   → style={{ color: '#f5f5f7' }} or className="apple-caption" depending on context
  'border-cyber-primary' → style={{ borderColor: 'rgba(255,255,255,0.1)' }}
  'bg-cyber-primary'     → style={{ background: 'rgba(255,255,255,0.08)' }}
  'text-cyber-secondary' → style={{ color: 'rgba(245,245,247,0.5)' }}
  'border-cyber-secondary' → style={{ borderColor: 'rgba(255,255,255,0.08)' }}
  'bg-cyber-secondary'   → style={{ background: 'rgba(255,255,255,0.05)' }}
  'text-cyber-text'      → style={{ color: '#f5f5f7' }} or color: 'rgba(245,245,247,0.6)'
  'bg-cyber-darker'      → style={{ background: '#161617' }}
  'shadow-neon'          → (remove entirely)
  'drop-shadow-[0_0_'    → (remove entirely)
  Any hex #00d4ff        → rgba(245,245,247,0.7)
  Any hex #a855f7        → rgba(245,245,247,0.4)

After completing the global scan, run:
  cd frontend && npm run build

Verify zero TypeScript/ESLint errors. If any remain, fix them before finishing.
```

---

*6 prompts total. Run in order: 1 → 2 → 3 → 4 → 5 → 6.*
*Each prompt is self-contained. Zero backend changes required.*
*Result: apple.com Mac Pro product page aesthetic — pure black, #f5f5f7 warm-white, hairline borders, SF Pro typography.*
