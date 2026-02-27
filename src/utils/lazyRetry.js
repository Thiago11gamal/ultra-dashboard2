import { lazy } from 'react';

/**
 * A wrapper around React.lazy that attempts to reload the page when a chunk fails to load.
 * This common issue happens when a new version of the app is deployed and the 
 * user's browser still has the old asset manifest, trying to load non-existent hashes.
 */
export const lazyWithRetry = (componentImport) =>
    lazy(async () => {
        const pageHasAlreadyBeenForceRefreshed = JSON.parse(
            window.sessionStorage.getItem('page-has-been-force-refreshed') || 'false'
        );

        try {
            const component = await componentImport();
            window.sessionStorage.setItem('page-has-been-force-refreshed', 'false');
            return component;
        } catch (error) {
            if (!pageHasAlreadyBeenForceRefreshed) {
                // Log the error and force a refresh to get the latest manifest
                console.warn('Chunk load failed. Forcing page refresh for latest assets...', error);
                window.sessionStorage.setItem('page-has-been-force-refreshed', 'true');
                return window.location.reload();
            }

            // If we already refreshed and it still fails, bubble up the error
            throw error;
        }
    });
