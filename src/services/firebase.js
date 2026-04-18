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


// Initialize Firebase only if config is valid
let app = null;
let db = null;
let auth = null;

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.warn(`%c[Firebase] Chaves ausentes. O Ultra Dashboard funcionará apenas em modo LOCAL (Offline).`, "color: #fbbf24; font-weight: bold;");
} else {
    try {
        app = initializeApp(firebaseConfig);
        db = initializeFirestore(app, {
            localCache: persistentLocalCache({
                tabManager: persistentMultipleTabManager()
            })
        });
        auth = getAuth(app);
        console.log(`%c[Firebase] Inicializado: ${firebaseConfig.projectId}`, "color: #10b981;");
    } catch (err) {
        console.error("[Firebase] erro na inicialização:", err);
    }
}

const getAppAnalytics = async () => {
    if (typeof window === "undefined" || !app) return null;
    const supported = await isAnalyticsSupported();
    if (supported) {
        return getAnalytics(app);
    }
    return null;
};

export { db, auth, getAppAnalytics };
