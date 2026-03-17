// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics, isSupported as isAnalyticsSupported } from "firebase/analytics";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, getFirestore } from "firebase/firestore";

const clean = (val) => (typeof val === 'string' ? val.trim().replace(/['";]/g, '') : val);

const firebaseConfig = {
    apiKey: clean(import.meta.env.VITE_FIREBASE_API_KEY || import.meta.env.VITE_API_KEY),
    authDomain: clean(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || import.meta.env.VITE_AUTH_DOMAIN),
    projectId: clean(import.meta.env.VITE_FIREBASE_PROJECT_ID || import.meta.env.ID_DO_PROJETO_VITE || import.meta.env.VITE_PROJECT_ID),
    storageBucket: clean(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || import.meta.env.BALDE_DE_ARMAZENAMENTO_VITE),
    messagingSenderId: clean(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || import.meta.env.ID_do_remetente_de_mensagens_VITE),
    appId: clean(import.meta.env.VITE_FIREBASE_APP_ID || import.meta.env.ID_do_aplicativo_VITE || import.meta.env.VITE_APP_ID),
    measurementId: clean(import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || import.meta.env.ID_DE_MEDIÇÃO_VITE)
};

// No debug logs in production


// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with persistence
const db = initializeFirestore(app, {
    localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
    })
});

const auth = getAuth(app);

const getAppAnalytics = async () => {
    if (typeof window === "undefined") return null;
    const supported = await isAnalyticsSupported();
    if (supported) {
        return getAnalytics(app);
    }
    return null;
};

export { db, auth, getAppAnalytics };
