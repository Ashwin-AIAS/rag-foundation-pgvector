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
