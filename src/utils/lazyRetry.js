import { lazy } from 'react';

const REFRESH_KEY = 'page-has-been-force-refreshed';
const REFRESH_AT_KEY = 'page-has-been-force-refreshed-at';
const REFRESH_COOLDOWN_MS = 15_000;

export const lazyWithRetry = (componentImport) =>
  lazy(async () => {
    let pageHasAlreadyBeenForceRefreshed = false;
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        pageHasAlreadyBeenForceRefreshed = JSON.parse(
          window.sessionStorage.getItem(REFRESH_KEY) || 'false'
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
          const refreshedAt = Number(window.sessionStorage.getItem(REFRESH_AT_KEY) || 0);
          if (!Number.isFinite(refreshedAt) || (Date.now() - refreshedAt) > REFRESH_COOLDOWN_MS) {
            window.sessionStorage.setItem(REFRESH_KEY, 'false');
          }
        }
      } catch {
        // ignore storage errors
      }
      return component;
    } catch (error) {
      if (!pageHasAlreadyBeenForceRefreshed && typeof window !== 'undefined' && window.location) {
        console.warn('Chunk load failed. Forcing page refresh...', error);
        try {
          window.sessionStorage?.setItem(REFRESH_KEY, 'true');
          window.sessionStorage?.setItem(REFRESH_AT_KEY, String(Date.now()));
        } catch {
          // ignore storage errors
        }
        window.location.reload();
        return new Promise(() => {});
      }
      throw error;
    }
  });
