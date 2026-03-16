import { useState, useEffect } from 'react';

/**
 * Hook customizado para gerenciar Toasts globais via eventos.
 * Escuta o evento 'show-toast' e mantém uma lista de toasts ativos.
 */
export function useGlobalToasts() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handleToastEvent = (e) => {
      const { message, type } = e.detail;
      
      setToasts(prev => {
        // Prevent duplicate messages from stacking
        if (prev.some(t => t.message === message)) return prev;

        const newToast = { 
          id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9), 
          message,
          type
        };

        // Limit to 3 toasts at a time
        const nextToasts = [...prev, newToast];
        return nextToasts.slice(-3);
      });
    };

    window.addEventListener('show-toast', handleToastEvent);
    return () => window.removeEventListener('show-toast', handleToastEvent);
  }, []);

  const removeToast = (id) => {
    setToasts(current => current.filter(t => t.id !== id));
  };

  return { toasts, removeToast };
}
