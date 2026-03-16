/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html","./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans:    ["'Space Mono'", 'monospace'],
        display: ["'Rajdhani'", 'sans-serif'],
        mono:    ["'Space Mono'", 'monospace'],
      },
      colors: {
        av: {
          void:   '#06060a',
          s1:     '#0e0e14',
          s2:     '#161620',
          s3:     '#1e1e2a',
          s4:     '#26263a',
          text:   '#f5f0e8',
          mid:    'rgba(245,240,232,0.6)',
          muted:  'rgba(245,240,232,0.35)',
          faint:  'rgba(245,240,232,0.05)',
          border: 'rgba(245,240,232,0.08)',
          // Hero accents
          iron:   '#c0391b',
          cap:    '#1a4a8a',
          thor:   '#c0a030',
          panther:'#8b5cf6',
          hulk:   '#16a34a',
          // Lighter hero tints for text on dark
          ironLt: '#e8824a',
          capLt:  '#5b9bd5',
          thorLt: '#e8c040',
          pantherLt: '#c084fc',
          hulkLt: '#4ade80',
        },
      },
      boxShadow: {
        'iron-sm':    '0 0 10px rgba(192,57,27,0.35)',
        'iron-md':    '0 0 24px rgba(192,57,27,0.3)',
        'cap-sm':     '0 0 10px rgba(26,74,138,0.4)',
        'cap-md':     '0 0 24px rgba(26,74,138,0.35)',
        'thor-sm':    '0 0 10px rgba(192,160,48,0.4)',
        'thor-md':    '0 0 24px rgba(192,160,48,0.3)',
        'panther-sm': '0 0 10px rgba(139,92,246,0.4)',
        'panther-md': '0 0 24px rgba(139,92,246,0.3)',
        'hulk-sm':    '0 0 10px rgba(22,163,74,0.4)',
        'hulk-md':    '0 0 24px rgba(22,163,74,0.3)',
        'tower':      '0 20px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(245,240,232,0.04)',
      },
      animation: {
        'av-fade-up':    'av-fade-up 0.55s cubic-bezier(0.16,1,0.3,1) forwards',
        'av-scale-in':   'av-scale-in 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards',
        'tower-scan':    'tower-scan 5s linear infinite',
        'hero-pulse':    'hero-pulse 2.5s ease-in-out infinite',
        'assemble':      'assemble 0.6s cubic-bezier(0.16,1,0.3,1) forwards',
        'data-in':       'data-in 0.3s ease-out forwards',
        'spinner':       'spin 1s linear infinite',
      },
      keyframes: {
        'av-fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'av-scale-in': {
          '0%':   { opacity: '0', transform: 'scale(0.88)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'tower-scan': {
          '0%':   { transform: 'translateY(-8px)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        'hero-pulse': {
          '0%,100%': { opacity: '0.6' },
          '50%':     { opacity: '1' },
        },
        'assemble': {
          '0%':   { opacity: '0', transform: 'translateY(12px) scale(0.96)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'data-in': {
          '0%':   { opacity: '0', transform: 'translateX(-6px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'spin': {
          '0%':   { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
    },
  },
  plugins: [],
}
