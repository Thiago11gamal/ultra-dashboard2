import { useEffect } from 'react';

/**
 * Hook customizado para sincronizar o tema (Dark/Light/Auto) com o DOM.
 * - darkModeSetting = true  => força tema escuro (remove 'light-mode')
 * - darkModeSetting = false => força tema claro (adiciona 'light-mode')
 * - darkModeSetting = 'auto'|undefined => segue preferência do sistema
 */
export function useThemeSync(darkModeSetting) {
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const root = document.documentElement;
    const media = typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-color-scheme: dark)')
      : null;

    const applyTheme = () => {
      if (darkModeSetting === true) {
        root.classList.remove('light-mode');
        return;
      }

      if (darkModeSetting === false) {
        root.classList.add('light-mode');
        return;
      }

      if (media?.matches) root.classList.remove('light-mode');
      else root.classList.add('light-mode');
    };

    applyTheme();

    if (darkModeSetting === undefined || darkModeSetting === 'auto') {
      if (media?.addEventListener) {
        media.addEventListener('change', applyTheme);
        return () => media.removeEventListener('change', applyTheme);
      }

      if (media?.addListener) {
        media.addListener(applyTheme);
        return () => media.removeListener(applyTheme);
      }
    }

    return undefined;
  }, [darkModeSetting]);
}
