// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBMQM3PsbCGN7EqJuaBSaRQ1E2NYMzVGf8",
    authDomain: "dashboard-organization.firebaseapp.com",
    projectId: "dashboard-organization",
    storageBucket: "dashboard-organization.firebasestorage.app",
    messagingSenderId: "962938959228",
    appId: "1:962938959228:web:b2bc82d6c8657d0379a0f9",
    measurementId: "G-0QGW3REHN1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app); // Initialized just in case we add auth later

export { db, auth };
