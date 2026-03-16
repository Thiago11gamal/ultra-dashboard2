import { useState, useEffect } from 'react';

/**
 * Hook customizado para gerenciar Toasts globais via eventos.
 * Escuta o evento 'show-toast' e mantém uma lista de toasts ativos.
 */
export function useGlobalToasts() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handleToastEvent = (e) => {
      const newToast = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
        ...e.detail
      };
      // Only keep the most recent toast. 
      // This prevents accumulation and makes it "reappear" for each new event.
      setToasts([newToast]);
    };

    window.addEventListener('show-toast', handleToastEvent);
    return () => window.removeEventListener('show-toast', handleToastEvent);
  }, []);

  const removeToast = (id) => {
    setToasts(current => current.filter(t => t.id !== id));
  };

  return { toasts, removeToast };
}
