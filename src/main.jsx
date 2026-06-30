import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { AuthProvider } from './context/AuthContext.jsx'

window.HARD_RESET = async () => {
  try {
      const auth = await import('firebase/auth');
      const currentUser = auth.getAuth().currentUser;
      if (!currentUser?.uid) {
          console.error('Nenhum usuário logado. Faça login primeiro.');
          return;
      }
      if (!window.confirm('CUIDADO: Isso vai apagar todos os dados no Firebase E no LocalStorage. Deseja continuar?')) return;
      
      const { db } = await import('./services/firebase.js');
      const { doc, deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'backups', currentUser.uid));
      console.log('✅ Dados no Firebase apagados com sucesso!');
  } catch (e) {
      console.error('Erro ao apagar Firebase:', e);
  }
  
  localStorage.clear();
  const req = indexedDB.deleteDatabase('keyval-store');
  req.onsuccess = () => {
      console.log('✅ Banco local apagado! Reiniciando...');
      window.location.href = '/';
  };
  req.onerror = () => {
      console.error('Erro ao apagar banco local. Reiniciando de qualquer forma...');
      window.location.href = '/';
  };
};

const rootElement = document.getElementById('root');

createRoot(rootElement).render(
  <ErrorBoundary>
    <AuthProvider>
      <App />
    </AuthProvider>
  </ErrorBoundary>,
)
