import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // REVISION: Added support for Portuguese environment variable names from Vercel screen
  envPrefix: ['VITE_', 'ID_', 'BALDE_', 'CHAVE_', 'TOKEN_'],
  server: {
    port: 5173,
    strictPort: false,
  },
  build: {
    target: 'es2022',
    minify: 'esbuild',
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom', 'zustand'],
          charts: ['recharts', 'html2canvas', 'jspdf'], 
          motion: ['framer-motion'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/analytics'],
          ai: ['@google/generative-ai'],
          graphics: ['three', 'tsparticles', 'react-tsparticles']
        }
      }
    }
  }
})
