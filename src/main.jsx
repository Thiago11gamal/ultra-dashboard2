import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { registerSW } from 'virtual:pwa-register'

// Inicializa o Service Worker para suporte PWA e modo Offline
registerSW({ immediate: true })


const rootElement = document.getElementById('root');

createRoot(rootElement).render(
  <ErrorBoundary>
    <AuthProvider>
      <App />
    </AuthProvider>
  </ErrorBoundary>,
)
