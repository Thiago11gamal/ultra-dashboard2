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

const rawConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || import.meta.env.VITE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || import.meta.env.VITE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || import.meta.env.ID_DO_PROJETO_VITE_FIREBASE || import.meta.env.ID_DO_PROJETO_VITE,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || import.meta.env.BALDE_DE_ARMAZENAMENTO_VITE_FIREBASE_DE_ARMAZENAMENTO || import.meta.env.BALDE_DE_ARMAZENAMENTO_VITE,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || import.meta.env.ID_DO_REMETENTE_DE_MENSAGENS_VITE || import.meta.env.ID_DO_REMETENTE_VITE,
    appId: import.meta.env.VITE_FIREBASE_APP_ID || import.meta.env.ID_DO_APLICATIVO_VITE_FIREBASE || import.meta.env.ID_DO_APLICATIVO_VITE,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || import.meta.env.ID_DE_MEDIÇÃO_VITE_FIREBASE || import.meta.env.ID_DE_MEDIÇÃO_VITE
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
    apiKey: clean(rawConfig.apiKey) || "dummy-api-key",
    authDomain: clean(rawConfig.authDomain) || "dummy-auth-domain",
    projectId: derivedProjectId || "config-missing",
    storageBucket: clean(rawConfig.storageBucket) || "dummy-bucket",
    messagingSenderId: clean(rawConfig.messagingSenderId) || "000000000",
    appId: clean(rawConfig.appId) || "1:000:web:000",
    measurementId: clean(rawConfig.measurementId) || "G-0000"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with persistence
const db = initializeFirestore(app, {
    localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
    })
});

const auth = getAuth(app);

// Critical validation to prevent Firestore Internal Assertion Failure (projects//databases)
if (firebaseConfig.projectId === 'config-missing' || !firebaseConfig.projectId) {
    console.error("%c[Firebase] ERRO CRÍTICO: projectId ausente!", "color: #f87171; font-weight: bold;");
    console.error("DICA: Se estiver no Vercel, adicione VITE_FIREBASE_PROJECT_ID nas 'Environment Variables' do projeto e faça um novo Deploy.");
    console.error("DICA: Se for local, verifique o arquivo .env raiz.");
} else {
    console.log(`%c[Firebase] Inicializado: ${firebaseConfig.projectId}`, "color: #10b981;");
}

const getAppAnalytics = async () => {
    if (typeof window === "undefined") return null;
    const supported = await isAnalyticsSupported();
    if (supported) {
        return getAnalytics(app);
    }
    return null;
};

export { db, auth, getAppAnalytics };
