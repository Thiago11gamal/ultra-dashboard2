import { useState, useEffect } from 'react';

/**
 * Hook customizado para gerenciar o evento de Level Up.
 * Escuta o evento 'level-up' e gerencia o estado para exibição do Toast.
 */
export function useLevelUp() {
  const [queue, setQueue] = useState([]);

  useEffect(() => {
    const handleLevelUp = (e) => {
      setQueue(prev => [...prev, e.detail]);
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
