// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics, isSupported as isAnalyticsSupported } from "firebase/analytics";

import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, getFirestore } from "firebase/firestore";

// Validate environment variables strictly (Static access for Vite transformation)
const firebaseConfig = {
    apiKey: import.meta.env.VITE_API_KEY,
    authDomain: import.meta.env.VITE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_APP_ID,
    measurementId: import.meta.env.VITE_MEASUREMENT_ID
};

const missingVars = [];
if (!firebaseConfig.apiKey) missingVars.push('VITE_API_KEY');
if (!firebaseConfig.authDomain) missingVars.push('VITE_AUTH_DOMAIN');
if (!firebaseConfig.projectId) missingVars.push('VITE_PROJECT_ID');
if (!firebaseConfig.appId) missingVars.push('VITE_APP_ID');

console.debug("[Firebase] Chaves de ambiente disponíveis:", Object.keys(import.meta.env).filter(key => key.startsWith('VITE_')));

if (missingVars.length > 0) {
    const errorMsg = `Erro de Configuração: Variáveis ausentes (${missingVars.join(', ')}). Verifique o painel da Vercel/Netlify e faça um novo deploy.`;
    console.error(`[Firebase] ${errorMsg}`);
    throw new Error(errorMsg);
}

if (firebaseConfig.apiKey === 'undefined' || firebaseConfig.apiKey.includes('YOUR_')) {
    const errorMsg = "VITE_API_KEY inválida. Configure os valores reais no painel do Cloud.";
    console.error(`[Firebase] ${errorMsg}`);
    throw new Error(errorMsg);
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
console.debug("[Firebase] App inicializado.");

// Initialize Firestore with persistent cache, falling back to default if unsupported
let db;
try {
    db = initializeFirestore(app, {
        localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager()
        })
    });
} catch (e) {
    console.warn('[Firebase] Persistent Firestore cache unavailable, falling back to default:', e.message);
    db = getFirestore(app);
}

const auth = getAuth(app);
console.debug("[Firebase] Auth instanciado.");

// Analytics support check
let analytics = null;
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

export { db, auth, analytics };
