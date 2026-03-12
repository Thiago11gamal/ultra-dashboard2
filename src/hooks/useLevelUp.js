import { useState, useEffect } from 'react';

/**
 * Hook customizado para gerenciar o evento de Level Up.
 * Escuta o evento 'level-up' e gerencia o estado para exibição do Toast.
 */
export function useLevelUp() {
  const [levelUpData, setLevelUpData] = useState(null);

  useEffect(() => {
    const handleLevelUp = (e) => {
      setLevelUpData(e.detail);
    };

    window.addEventListener('level-up', handleLevelUp);
    return () => window.removeEventListener('level-up', handleLevelUp);
  }, []);

  const clearLevelUp = () => setLevelUpData(null);

  return { levelUpData, clearLevelUp };
}
