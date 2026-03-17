import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { AuthProvider } from './context/AuthContext.jsx'

const rootElement = document.getElementById('root');

if (typeof window !== 'undefined' && window.logToUI) window.logToUI("React: Renderizando raiz...");

createRoot(rootElement).render(
  <ErrorBoundary>
    <AuthProvider>
      <App />
    </AuthProvider>
  </ErrorBoundary>,
)

if (typeof window !== 'undefined' && window.logToUI) window.logToUI("React: Ciclo inicial disparado.");
