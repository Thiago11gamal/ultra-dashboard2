import { useEffect } from 'react';

/**
 * Hook customizado para sincronizar o tema (Dark/Light) com o DOM.
 * Aplica ou remove a classe 'light-mode' no documentElement.
 */
export function useThemeSync(darkModeSetting) {
  useEffect(() => {
    const isDark = darkModeSetting !== false; // Default to dark if undefined
    
    if (!isDark) {
      document.documentElement.classList.add('light-mode');
    } else {
      document.documentElement.classList.remove('light-mode');
    }
  }, [darkModeSetting]);
}
