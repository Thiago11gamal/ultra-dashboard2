import { db } from './firebase';
import { doc, setDoc, getDoc } from "firebase/firestore";

// Constants
const BACKUP_COLLECTION = "backups";
const DOC_ID = "user_main"; // Simplify for single user MVPs

export const uploadDataToCloud = async (data) => {
    try {
        if (!data) throw new Error("No data to save");

        // Add timestamp
        const payload = {
            ...data,
            _lastBackup: new Date().toISOString()
        };

        const docRef = doc(db, BACKUP_COLLECTION, DOC_ID);
        await setDoc(docRef, payload);

        return true;
    } catch (e) {
        console.error("Error uploading data: ", e);
        throw e;
    }
};

export const downloadDataFromCloud = async () => {
    try {
        const docRef = doc(db, BACKUP_COLLECTION, DOC_ID);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {

            return docSnap.data();
        } else {
            console.warn("No backup found!");
            return null;
        }
    } catch (e) {
        console.error("Error downloading data: ", e);
        throw e;
    }
};
