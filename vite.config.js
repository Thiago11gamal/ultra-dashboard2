import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
          charts: ['recharts', 'html-to-image', 'jspdf'],
          motion: ['framer-motion'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/analytics'],
          graphics: ['three', 'tsparticles', 'react-tsparticles'],
        },
      },
    },
  },

  // ─── VITEST ───────────────────────────────────────────────────────────────
  test: {
    environment: 'node',        // engine puro — sem DOM
    globals: true,              // describe/it/expect sem import
    include: ['src/**/*.test.js', 'src/**/*.test.jsx', 'src/**/*.spec.js', 'tests/**/*.test.js'],
    coverage: {
      provider: 'v8',
      include: ['src/engine/**', 'src/utils/coachLogic.js'],
    },
  },
  // ──────────────────────────────────────────────────────────────────────────
})
