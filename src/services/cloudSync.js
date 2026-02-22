import { db } from './firebase';
import { doc, setDoc, getDoc } from "firebase/firestore";

// Constants
const BACKUP_COLLECTION = "backups";

export const uploadDataToCloud = async (data, userId) => {
    try {
        if (!data) throw new Error("No data to save");
        const docId = userId || 'anonymous';

        // Add timestamp
        const payload = {
            ...data,
            _lastBackup: new Date().toISOString()
        };

        const docRef = doc(db, BACKUP_COLLECTION, docId);
        await setDoc(docRef, payload);

        return true;
    } catch (e) {
        console.error("Error uploading data: ", e);
        throw e; // Let caller handle UI feedback (Header.jsx shows alert)
    }
};

export const downloadDataFromCloud = async (userId) => {
    try {
        const docId = userId || 'anonymous';
        const docRef = doc(db, BACKUP_COLLECTION, docId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {

            return docSnap.data();
        } else {
            console.warn("No backup found!");
            return null; // Let caller handle UI feedback
        }
    } catch (e) {
        console.error("Error downloading data: ", e);
        throw e; // Let caller handle UI feedback (Header.jsx shows alert)
    }
};
