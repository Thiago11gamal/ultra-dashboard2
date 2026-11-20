import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { registerSW } from 'virtual:pwa-register'
import { setAppTimezone } from './utils/dateHelper.js'

// Detecta automaticamente o fuso horário IANA real do navegador do usuário
setAppTimezone('auto');

// Inicializa o Service Worker para suporte PWA e modo Offline
registerSW({ immediate: true })


const rootElement = document.getElementById('root');

if (rootElement) {
  createRoot(rootElement).render(
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>,
  )
} else {
  console.error("Root element not found.");
}

