import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: false },
      manifest: {
        name: 'Ultra Dashboard 2',
        short_name: 'Ultra',
        description: 'Plataforma inteligente de estudos e simulados',
        theme_color: '#0f172a',
        background_color: '#020617',
        display: 'standalone',
        icons: [
          {
            src: 'https://cdn-icons-png.flaticon.com/512/1157/1157077.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'https://cdn-icons-png.flaticon.com/512/1157/1157077.png',
            sizes: '512x512',
            type: 'image/png',
          }
        ]
      }
    })
  ],
  envPrefix: ['VITE_', 'ID_', 'BALDE_', 'CHAVE_', 'TOKEN_'],
  server: {
    port: 5173,
    strictPort: false,
  },
  build: {
    target: 'es2022',
    minify: 'esbuild',
    chunkSizeWarningLimit: 1000,
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom', 'zustand'],
          charts: ['recharts'],
          pdf: ['html-to-image', 'jspdf'],
          motion: ['framer-motion'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/analytics'],
          particles: ['tsparticles', 'react-tsparticles'],
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
