// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, getFirestore } from "firebase/firestore";

// Validate environment variables
const requiredEnvVars = [
    'VITE_API_KEY',
    'VITE_AUTH_DOMAIN',
    'VITE_PROJECT_ID',
    'VITE_APP_ID'
];

const missingVars = requiredEnvVars.filter(key => !import.meta.env[key]);
if (missingVars.length > 0) {
    console.warn(`Firebase configuration incomplete. Missing: ${missingVars.join(', ')}`);
}

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: import.meta.env.VITE_API_KEY || 'MISSING',
    authDomain: import.meta.env.VITE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_APP_ID,
    measurementId: import.meta.env.VITE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with persistent cache, falling back to default if unsupported
// (e.g. Safari private mode, test environments, or missing env config)
let db;
try {
    db = initializeFirestore(app, {
        localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager()
        })
    });
} catch (e) {
    console.warn('Persistent Firestore cache unavailable, falling back to default:', e.message);
    db = getFirestore(app);
}

const auth = getAuth(app);

export { db, auth };
