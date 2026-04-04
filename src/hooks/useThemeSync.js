import { useEffect } from 'react';

/**
 * Hook customizado para sincronizar o tema (Dark/Light) com o DOM.
 * Aplica ou remove a classe 'light-mode' no documentElement.
 */
export function useThemeSync(darkModeSetting) {
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const applyTheme = (isDark) => {
      if (!isDark) {
        document.documentElement.classList.add('light-mode');
      } else {
        document.documentElement.classList.remove('light-mode');
      }
    };

    if (darkModeSetting === 'auto') {
      // Apply initial
      applyTheme(mediaQuery.matches);

      // Listen for changes
      const handler = (e) => applyTheme(e.matches);
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } else {
      // Explicit true/false
      applyTheme(darkModeSetting === true);
    }
  }, [darkModeSetting]);
}
