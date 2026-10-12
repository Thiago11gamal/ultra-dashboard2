import { lazy } from 'react';

export const lazyWithRetry = (componentImport) =>
  lazy(async () => {
    let pageHasAlreadyBeenForceRefreshed = false;
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        pageHasAlreadyBeenForceRefreshed = JSON.parse(
          window.sessionStorage.getItem('page-has-been-force-refreshed') || 'false'
        );
      }
    } catch {
      // ignore storage errors
    }

    try {
      const component = await componentImport();
      if (!component) {
        throw new Error('Module import returned undefined');
      }
      if (!component.default) {
        throw new Error('Module has no default export');
      }
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          window.sessionStorage.setItem('page-has-been-force-refreshed', 'false');
        }
      } catch {
        // ignore storage errors
      }
      return component;
    } catch (error) {
      if (!pageHasAlreadyBeenForceRefreshed && typeof window !== 'undefined' && window.location) {
        console.warn('Chunk load failed. Forcing page refresh...', error);
        try {
          window.sessionStorage?.setItem('page-has-been-force-refreshed', 'true');
        } catch {
          // ignore storage errors
        }
        window.location.reload();
        return new Promise(() => {});
      }
      throw error;
    }
  });
