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
          vendor: ['react', 'react-dom'],
          charts: ['recharts', 'html2canvas', 'jspdf'], // Separa as bibliotecas de gráficos e PDF
          motion: ['framer-motion'] // Separa a biblioteca de animação
        }
      }
    }
  }
})
