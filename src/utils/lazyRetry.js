import { lazy } from 'react';

/**
 * A wrapper around React.lazy that attempts to reload the page when a chunk fails to load.
 * This common issue happens when a new version of the app is deployed and the 
 * user's browser still has the old asset manifest, trying to load non-existent hashes.
 */
export const lazyWithRetry = (componentImport) =>
    lazy(async () => {
        let pageHasAlreadyBeenForceRefreshed = false;
        try {
            pageHasAlreadyBeenForceRefreshed = JSON.parse(
                window.sessionStorage.getItem('page-has-been-force-refreshed') || 'false'
            );
        } catch { /* ignore private mode error */ }

        try {
            const component = await componentImport();
            try { window.sessionStorage.setItem('page-has-been-force-refreshed', 'false'); } catch {}
            return component;
        } catch (error) {
            if (!pageHasAlreadyBeenForceRefreshed) {
                // Log the error and force a refresh to get the latest manifest
                console.warn('Chunk load failed. Forcing page refresh for latest assets...', error);
                try { window.sessionStorage.setItem('page-has-been-force-refreshed', 'true'); } catch {}
                window.location.reload();
                return new Promise(() => { }); // Manter a promessa "pendente" enquanto o reload acontece
            }

            // If we already refreshed and it still fails, bubble up the error
            throw error;
        }
    });

