// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics, isSupported as isAnalyticsSupported } from "firebase/analytics";

import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, getFirestore } from "firebase/firestore";

// Validate environment variables strictly (Static access for Vite transformation)
const getEnv = (key) => {
    const value = import.meta.env[key];
    if (value) return value;
    // Fallback to localStorage for manual emergency config
    if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(`__manual_${key}`);
        if (saved) return saved;
    }
    return undefined;
};

const firebaseConfig = {
    apiKey: getEnv('VITE_FIREBASE_API_KEY'),
    authDomain: "liquita-67764.firebaseapp.com",
    projectId: "liquita-67764",
    storageBucket: "liquita-67764.firebasestorage.app",
    messagingSenderId: "709882079835",
    appId: getEnv('VITE_FIREBASE_APP_ID'),
    measurementId: "G-D8NS2BNKD5"
};

const missingVars = [];
if (!firebaseConfig.apiKey) missingVars.push('VITE_FIREBASE_API_KEY');
if (!firebaseConfig.appId) missingVars.push('VITE_FIREBASE_APP_ID');

const allEnvKeys = Object.keys(import.meta.env);
const availableKeys = allEnvKeys.filter(key => key.startsWith('VITE_'));
const unprefixedSamples = allEnvKeys.filter(key => !key.startsWith('VITE_') && !key.startsWith('BASE_') && !key.startsWith('MODE') && !key.startsWith('DEV') && !key.startsWith('PROD') && !key.startsWith('SSR'));

console.debug("[Firebase] Chaves detectadas:", {
    total: allEnvKeys.length,
    com_vite: availableKeys,
    outras_vazias: unprefixedSamples
});

const isConfigValid = missingVars.length === 0;

if (!isConfigValid) {
    console.warn(`[Firebase] Configuração incompleta. Variáveis ausentes: ${missingVars.join(', ')}`);
}

// Initialize Firebase only if config is valid
let app = null;
if (isConfigValid) {
    try {
        app = initializeApp(firebaseConfig);
        console.debug("[Firebase] App inicializado com sucesso.");
    } catch (err) {
        console.error("[Firebase] Erro ao inicializar o app:", err);
    }
}
console.debug("[Firebase] App inicializado.");

// Initialize Firestore and Auth only if app is valid
let db = null;
let auth = null;
let analytics = null;

if (app) {
    try {
        db = initializeFirestore(app, {
            localCache: persistentLocalCache({
                tabManager: persistentMultipleTabManager()
            })
        });
        console.debug("[Firebase] Firestore inicializado com sucesso.");
    } catch (e) {
        console.warn('[Firebase] Persistent Firestore cache unavailable, falling back to default:', e.message);
        db = getFirestore(app);
        console.debug("[Firebase] Firestore inicializado com fallback.");
    }

    auth = getAuth(app);
    console.debug("[Firebase] Auth instanciado.");

    if (typeof window !== "undefined") {
        isAnalyticsSupported()
            .then((supported) => {
                if (supported && firebaseConfig.measurementId) {
                    analytics = getAnalytics(app);
                    console.debug("[Firebase] Analytics inicializado.");
                }
            })
            .catch((error) => {
                console.warn("[Firebase] Analytics indisponível:", error?.message || error);
            });
    }
} else {
    console.warn("[Firebase] App não inicializado devido a configuração inválida. Firestore, Auth e Analytics não serão instanciados.");
}

export { db, auth, analytics, isConfigValid, missingVars, availableKeys };
