import { useState, useEffect } from 'react';

/**
 * Hook customizado para gerenciar o evento de Level Up.
 * Escuta o evento 'level-up' e gerencia o estado para exibição do Toast.
 */
export function useLevelUp() {
  const [queue, setQueue] = useState([]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleLevelUp = (e) => {
      if (!e?.detail) return;
      setQueue(prev => {
        if (prev.some(item => item?.level === e.detail.level)) return prev;
        return [...prev, e.detail];
      });
    };

    window.addEventListener('level-up', handleLevelUp);
    return () => window.removeEventListener('level-up', handleLevelUp);
  }, []);

  const clearCurrent = () => setQueue(prev => prev.slice(1));

  return { 
    levelUpData: queue[0] || null, 
    clearLevelUp: clearCurrent 
  };
}

