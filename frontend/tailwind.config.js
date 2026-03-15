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
