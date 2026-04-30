import { useEffect } from 'react';

/**
 * Hook customizado para sincronizar o tema (Dark/Light) com o DOM.
 * Aplica ou remove a classe 'light-mode' no documentElement.
 */
export function useThemeSync(darkModeSetting) {
  useEffect(() => {
    // Forced Dark Mode: Ensure light-mode class is never present
    document.documentElement.classList.remove('light-mode');
  }, []);
}
