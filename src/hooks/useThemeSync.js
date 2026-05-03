import { useEffect } from 'react';

/**
 * Hook customizado para sincronizar o tema (Dark/Light/Auto) com o DOM.
 * - darkModeSetting = true  => força tema escuro (remove 'light-mode')
 * - darkModeSetting = false => força tema claro (adiciona 'light-mode')
 * - darkModeSetting = 'auto'|undefined => segue preferência do sistema
 */
export function useThemeSync(darkModeSetting) {
  useEffect(() => {
    const root = document.documentElement;

    if (darkModeSetting === true) {
      root.classList.remove('light-mode');
      return;
    }

    if (darkModeSetting === false) {
      root.classList.add('light-mode');
      return;
    }

    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    if (prefersDark) root.classList.remove('light-mode');
    else root.classList.add('light-mode');
  }, [darkModeSetting]);
}
