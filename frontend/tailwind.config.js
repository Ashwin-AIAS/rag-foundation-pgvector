/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                cyber: {
                    dark: '#05070d',
                    darker: '#0a0f1c',
                    primary: '#00d4ff',
                    secondary: '#ff003c',
                    text: '#e0e0e0', // Light gray for readability
                },
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'], // You might want to add a Google Font import in index.css
            },
            boxShadow: {
                'neon-blue': '0 0 10px rgba(0, 212, 255, 0.5), 0 0 20px rgba(0, 212, 255, 0.3)',
                'neon-red': '0 0 10px rgba(255, 0, 60, 0.5), 0 0 20px rgba(255, 0, 60, 0.3)',
            },
            animation: {
                'spin-slow': 'spin 3s linear infinite',
                'pulse-fast': 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            },
        },
    },
    plugins: [],
}
