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
