// 🔒 [SECURITY] Sem fallback hardcoded para projeto real.
// Se faltar config, entra em modo local estrito.

import { initializeApp } from 'firebase/app';
import {
    initializeFirestore,
    persistentLocalCache,
    persistentMultipleTabManager,
    clearIndexedDbPersistence,
} from 'firebase/firestore';
import { getAuth, signOut } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

export const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// 🛡️ [SECURITY] Sem fallback hardcoded. Se faltar config, modo local estrito.
export const hasValidFirebaseConfig = Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.appId
);

export const isLocalMode =
    import.meta.env.VITE_LOCAL_MODE === 'true' ||
    !hasValidFirebaseConfig;

// Só inicializa se config for válida
let app = null;
let db = null;
let auth = null;
let analytics = null;

export function getAppAnalytics(appInstance = app) {
    if (!appInstance) return null;
    return getAnalytics(appInstance);
}

if (!isLocalMode) {
    try {
        app = initializeApp(firebaseConfig);

        db = initializeFirestore(app, {
            localCache: persistentLocalCache({
                tabManager: persistentMultipleTabManager(),
            }),
        });

        auth = getAuth(app);

        try {
            analytics = getAppAnalytics(app);
        } catch (err) {
            // ✅ FIX #7: Log analytics failure para observabilidade
            console.warn('[Firebase] Analytics inicialização falhou (opcional):', err.message);
        }
    } catch (err) {
        console.error('[Firebase] Falha ao inicializar. Entrando em modo local.', err);
    }
}

/**
 * Limpeza segura de persistência local do Firestore.
 * Deve ser chamada no logout para evitar vazamento entre usuários.
 */
export async function clearFirestoreCache() {
    if (!db) return;

    try {
        await clearIndexedDbPersistence(db);
    } catch (err) {
        console.warn('[Firebase] Não foi possível limpar IDB persistence:', err);
    }
}

/**
 * Logout seguro: signOut + limpeza de persistência + limpeza de storages.
 */
export async function secureLogout() {
    let signOutFailed = false;
    try {
        if (auth) await signOut(auth);
        await clearFirestoreCache();
    } catch (err) {
        console.error('[Firebase] Erro durante logout:', err);
        signOutFailed = true;
    } finally {
        const keysToRemove = [
            // Storage principal (IndexedDB via idb-keyval)
            'ultra-dashboard-storage',
            // Flags de sync e estado local
            'ultra-sync-dirty',
            'pomodoroState',
            'focusPanelLocked',
            'pomodoroLayoutLocked',
            // Sessão local
            'ultra_local_session',
            // Telemetria do Coach
            'coach_calibration_events_v1',
            'coach_flag_optimizer_state_v1',
            'coach_causal_model_v1',
            'coach_auto_tuner_history_v1',
            'coach_evaluation_results_v1',
            'coach_model_health_v1',
            'coach_control_center_state_v1',
            // UI
            'hasSeenWelcomeScreen',
            'page-has-been-force-refreshed',
        ];
        keysToRemove.forEach(key => {
            try {
                localStorage.removeItem(key);
                sessionStorage.removeItem(key);
            } catch { /* ignore */ }
        });
        
        // ✅ FIX: Limpar IndexedDB do app
        try {
            const { del } = await import('idb-keyval');
            await del('ultra-dashboard-storage');
        } catch (e) {
            console.warn('[Firebase] Falha ao limpar IndexedDB no logout:', e);
        }

        // ✅ FIX: Limpar sessionStorage de flags de sessão
        try {
            sessionStorage.removeItem('hasSeenWelcomeScreen');
            sessionStorage.removeItem('page-has-been-force-refreshed');
        } catch { /* ignore */ }

        if (signOutFailed) {
            console.warn('[Firebase] Logout local executado, mas signOut remoto falhou.');
        }
    }
}

export { app, db, auth, analytics };

