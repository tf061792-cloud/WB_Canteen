import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/picker/' : '/',
  plugins: [react()],
  server: {
    port: 3007,
    proxy: {
      '/api': {
        target: 'http://localhost:3006',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})

