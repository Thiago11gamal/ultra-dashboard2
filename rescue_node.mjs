import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
    measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const backupId = "291jO0zyhCeHAM4RylplwFiSOOC3";

async function rescueData() {
    try {
        console.log("Connecting to Firebase...");
        const docRef = doc(db, 'backups', backupId);
        const snap = await getDoc(docRef);

        if (snap.exists()) {
            console.log("Found backup in 'backups' collection!");
            fs.writeFileSync("rescued_backup.json", JSON.stringify(snap.data(), null, 2));
            console.log("Saved to rescued_backup.json");
        } else {
            console.log("Backup not found in 'backups' collection. Checking 'users' collection...");
            const userRef = doc(db, 'users', backupId);
            const userSnap = await getDoc(userRef);
            
            if (userSnap.exists()) {
                console.log("Found backup in 'users' collection!");
                fs.writeFileSync("rescued_user.json", JSON.stringify(userSnap.data(), null, 2));
                console.log("Saved to rescued_user.json");
            } else {
                console.log("Backup not found in 'users' collection either.");
                
                // Let's try to get ANY doc to see if we have permissions and if anything exists
                const snap2 = await getDocs(query(collection(db, 'users'), limit(5)));
                if (!snap2.empty) {
                    console.log("We have access to 'users'. Printing recent docs...");
                    snap2.forEach(doc => console.log("User doc:", doc.id));
                } else {
                    console.log("No docs in 'users' collection or no permission.");
                }
            }
        }
    } catch (err) {
        console.error("Error:", err);
    }
    process.exit(0);
}

rescueData();
