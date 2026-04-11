// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics, isSupported as isAnalyticsSupported } from "firebase/analytics";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, getFirestore } from "firebase/firestore";

const clean = (val) => {
    if (typeof val !== 'string') return val;
    // Remove quotes, semicolons and leading/trailing whitespace
    const cleaned = val.trim().replace(/['";]/g, '');
    if (cleaned === 'undefined' || cleaned === 'null') return null;
    return cleaned;
};

// BUG 2 FIX: All env vars must use VITE_ prefix for Vite client-side exposure.
// Non-VITE_ prefixed vars (ID_DO_PROJETO_VITE_FIREBASE, etc.) are stripped at build time.
// Bracket access with spaces (import.meta.env['ID DO PROJETO...']) bypasses Vite's
// static string replacement and always evaluates to undefined.
const rawConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || import.meta.env.VITE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || import.meta.env.VITE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || import.meta.env.VITE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || import.meta.env.VITE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || import.meta.env.VITE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID || import.meta.env.VITE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || import.meta.env.VITE_MEASUREMENT_ID
};

// Auto-derive projectId if missing
let derivedProjectId = clean(rawConfig.projectId);

if (!derivedProjectId) {
    // Try from authDomain (e.g. project-id.firebaseapp.com)
    const authDom = clean(rawConfig.authDomain);
    if (authDom && authDom.includes('.firebaseapp.com')) {
        derivedProjectId = authDom.split('.firebaseapp.com')[0];
    } 
    // Try from storageBucket (e.g. project-id.firebasestorage.app or project-id.appspot.com)
    else if (rawConfig.storageBucket) {
        const bucket = clean(rawConfig.storageBucket);
        if (bucket) {
            if (bucket.includes('.firebasestorage.app')) {
                derivedProjectId = bucket.split('.firebasestorage.app')[0];
            } else if (bucket.includes('.appspot.com')) {
                derivedProjectId = bucket.split('.appspot.com')[0];
            }
        }
    }
    
    if (derivedProjectId) {
        console.warn(`[Firebase] VITE_FIREBASE_PROJECT_ID missing. Derived: ${derivedProjectId}`);
    }
}

const firebaseConfig = {
    apiKey: clean(rawConfig.apiKey),
    authDomain: clean(rawConfig.authDomain),
    projectId: derivedProjectId,
    storageBucket: clean(rawConfig.storageBucket),
    messagingSenderId: clean(rawConfig.messagingSenderId),
    appId: clean(rawConfig.appId),
    measurementId: clean(rawConfig.measurementId)
};

// Verifica imediatamente se as credenciais base existem
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    const errorMsg = "ERRO CRÍTICO: Chaves do Firebase ausentes no arquivo .env (Verifique VITE_FIREBASE_API_KEY ou VITE_FIREBASE_PROJECT_ID).";
    console.error(`%c${errorMsg}`, "color: #f87171; font-weight: bold; background: #222; padding: 4px;");
    throw new Error(errorMsg); // Para a execução antes de causar bugs na interface
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with persistence
const db = initializeFirestore(app, {
    localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
    })
});

const auth = getAuth(app);

console.log(`%c[Firebase] Inicializado: ${firebaseConfig.projectId}`, "color: #10b981;");

const getAppAnalytics = async () => {
    if (typeof window === "undefined") return null;
    const supported = await isAnalyticsSupported();
    if (supported) {
        return getAnalytics(app);
    }
    return null;
};

export { db, auth, getAppAnalytics };
