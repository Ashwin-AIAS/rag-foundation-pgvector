import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/ws': {
        target: 'http://localhost:8000',
        ws: true
      },
      '/ingest': 'http://localhost:8000',
      '/query': 'http://localhost:8000',
      '/health': 'http://localhost:8000',
      '/db-health': 'http://localhost:8000',
      '/config': 'http://localhost:8000',
      '/documents': 'http://localhost:8000',
      '/feedback': 'http://localhost:8000'
    }
  }
})
