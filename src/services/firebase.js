// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics, isSupported as isAnalyticsSupported } from "firebase/analytics";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, getFirestore } from "firebase/firestore";

const clean = (val) => {
    if (typeof val !== 'string') return val;
    // Remove quotes, semicolons and leading/trailing whitespace
    return val.trim().replace(/['";]/g, '');
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

// Auto-derive projectId if missing but authDomain is present
// Format: "project-id.firebaseapp.com"
let derivedProjectId = clean(rawConfig.projectId);
if (!derivedProjectId && rawConfig.authDomain) {
    const domain = clean(rawConfig.authDomain);
    if (domain && domain.includes('.firebaseapp.com')) {
        derivedProjectId = domain.split('.firebaseapp.com')[0];
        console.warn(`[Firebase] VITE_FIREBASE_PROJECT_ID missing. Derived from authDomain: ${derivedProjectId}`);
    }
}

const firebaseConfig = {
    apiKey: clean(rawConfig.apiKey) || "dummy-api-key",
    authDomain: clean(rawConfig.authDomain) || "dummy-auth-domain",
    projectId: derivedProjectId || null,
    storageBucket: clean(rawConfig.storageBucket) || "dummy-bucket",
    messagingSenderId: clean(rawConfig.messagingSenderId) || "000000000",
    appId: clean(rawConfig.appId) || "1:000:web:000",
    measurementId: clean(rawConfig.measurementId) || "G-0000"
};

// Critical validation to prevent Firestore Internal Assertion Failure (projects//databases)
if (!firebaseConfig.projectId || firebaseConfig.projectId === 'undefined') {
    console.error("[Firebase] CRITICAL: projectId is missing! Firestore will crash. Check your .env or Vercel environment variables.");
    // SILENT FAIL: db will be null, useCloudSync will handle this.
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
