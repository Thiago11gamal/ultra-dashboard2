// 🔒 [SECURITY] Sem fallback hardcoded para projeto real.
// Se faltar config, entra em modo local estrito.

import { initializeApp } from 'firebase/app';
import {
    initializeFirestore,
    persistentLocalCache,
    persistentMultipleTabManager,
    clearIndexedDbPersistence,
    terminate,
} from 'firebase/firestore';
import { getAuth, signOut } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';
import { del } from 'idb-keyval';
import { clearAllCoachFlags } from '../utils/coachFeatureStore.js';

export const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
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
    if (typeof window === 'undefined' || typeof indexedDB === 'undefined') return null;
    return getAnalytics(appInstance);
}

if (!isLocalMode) {
    try {
        app = initializeApp(firebaseConfig);

        db = initializeFirestore(app, {
            ignoreUndefinedProperties: true,
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
    if (!db) return false;

    let terminated = false;
    try {
        if (typeof terminate === 'function') {
            await terminate(db);
            terminated = true;
        }
        await clearIndexedDbPersistence(db);
    } catch (err) {
        console.warn('[Firebase] Não foi possível limpar IDB persistence:', err);
    }
    return terminated;
}

/**
 * Logout seguro: signOut + limpeza de persistência + limpeza de storages.
 */
export async function secureLogout() {
    let signOutFailed = false;
    let signOutError = null;
    let firestoreTerminated = false;
    try {
        if (auth) await signOut(auth);
        firestoreTerminated = await clearFirestoreCache();
    } catch (err) {
        console.error('[Firebase] Erro durante logout:', err);
        signOutFailed = true;
        signOutError = err;
    }

    // Só limpar persistência e dados locais quando o signOut remoto não falhou
    if (!signOutFailed) {
        // ✅ FIX N-01: Limpar TODAS as chaves relevantes, incluindo IndexedDB
        const keysToRemove = [
            'ultra-dashboard-storage',
            'ultra-dashboard-storage:meta',
            'ultra-sync-dirty',
            'pomodoroState',
            'pomodoro-endsAt',
            'pomodoro_muted',
            'tasks_active_panel',
            'dismissed_feature_banner_v1',
            'focusPanelLocked',
            'pomodoroLayoutLocked',
            'ultra_local_session',
            'coach_calibration_events_v1',
            'coach_flag_optimizer_state_v1',
            'coach_causal_model_v1',
            'coach_auto_tuner_history_v1',
            'coach_evaluation_results_v1',
            'coach_model_health_v1',
            'coach_strategy_backtest_v1',
            'coach_decision_bandit_v1',
            'coach_control_center_state_v1',
            'hasSeenWelcomeScreen',
            'page-has-been-force-refreshed',
            'ultra-last-activity',
            'ultra_category_tombstones',
            'pomodoroSideTab',
            'focusPanelPosition',
            'coach_active_flags_v1',
            'coach_features_v1',
            'coach_manual_flag_overrides_v1',
        ];
        keysToRemove.forEach(key => {
            try {
                localStorage.removeItem(key);
                sessionStorage.removeItem(key);
            } catch { /* ignore */ }
        });

        // Limpar registro em memória de flags do Coach (evita vazamento de flags Admin entre contas)
        try {
            clearAllCoachFlags();
        } catch { /* ignore */ }

        // Limpar chaves de rascunho, geração de simulado IA e escopos de flags/dados do Coach AI
        try {
            Object.keys(localStorage).forEach(k => {
                if (
                    k.startsWith('ai_simulado_draft:') ||
                    k.startsWith('ai_simulado_generating:') ||
                    k.startsWith('coach_features_v1::') ||
                    k.startsWith('coach_active_flags_v1:') ||
                    k.startsWith('coach_manual_flag_overrides_v1:') ||
                    k.startsWith('coach_control_center_state_v1:') ||
                    k.startsWith('coach_calibration_events_v1::') ||
                    k.startsWith('coach_flag_optimizer_state_v1:') ||
                    k.startsWith('coach_causal_model_v1:') ||
                    k.startsWith('coach_auto_tuner_history_v1:') ||
                    k.startsWith('coach_evaluation_results_v1:') ||
                    k.startsWith('coach_model_health_v1:') ||
                    k.startsWith('coach_strategy_backtest_v1:') ||
                    k.startsWith('coach_decision_bandit_v1:') ||
                    k.startsWith('pomodoro_transition_lock_') ||
                    k.startsWith('lastRoute_') ||
                    k.startsWith('quarantine:')
                ) {
                    localStorage.removeItem(k);
                }
            });
            Object.keys(sessionStorage).forEach(k => {
                if (k.startsWith('ai_simulado_')) {
                    sessionStorage.removeItem(k);
                }
            });
        } catch { /* ignore */ }

        // ✅ FIX N-01: Limpar IndexedDB do app (idb-keyval)
        try {
            await del('ultra-dashboard-storage');
        } catch (e) {
            console.warn('[Firebase] Falha ao limpar IndexedDB no logout:', e);
        }

        // ✅ FIX N-01: Limpar chaves de quarantine
        try {
            const quarantineKeys = [];
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && k.startsWith('quarantine:')) quarantineKeys.push(k);
            }
            quarantineKeys.forEach(k => localStorage.removeItem(k));
        } catch { /* ignore */ }
    } else {
        console.warn('[Firebase] Logout cancelado/falhou remotamente — dados locais preservados.');
    }
    return { ok: !signOutFailed, error: signOutError, firestoreTerminated };
}

export { app, db, auth, analytics };

