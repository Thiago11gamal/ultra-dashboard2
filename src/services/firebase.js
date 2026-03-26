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
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
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

// Critical validation to prevent Firestore Internal Assertion Failure (projects//databases)
if (firebaseConfig.projectId === 'config-missing') {
    console.error("[Firebase] CRITICAL: projectId is missing! Firestore will crash. Check your .env or Vercel environment variables.");
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

const getAppAnalytics = async () => {
    if (typeof window === "undefined") return null;
    const supported = await isAnalyticsSupported();
    if (supported) {
        return getAnalytics(app);
    }
    return null;
};

export { db, auth, getAppAnalytics };
