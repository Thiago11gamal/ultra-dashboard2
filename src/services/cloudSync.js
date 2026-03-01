import { db } from './firebase';
import { doc, setDoc, getDocFromServer } from "firebase/firestore";

// Constants
const BACKUP_COLLECTION = "backups";

export const uploadDataToCloud = async (data, userId) => {
    try {
        if (!data) throw new Error("No data to save");
        const docId = userId || 'anonymous';

        // Bug fix: studyLogs, studySessions, simuladoRows grow unbounded and can exceed
        // Firestore's 1MB document limit, causing silent backup failures.
        // We keep the 200 most recent entries of each append-only array per contest —
        // all structural/config data (categories, user, weights, settings) is fully preserved.
        const safeguardContest = (contest) => {
            if (!contest) return contest;
            return {
                ...contest,
                studyLogs: (contest.studyLogs || []).slice(-200),
                studySessions: (contest.studySessions || []).slice(-200),
                simuladoRows: (contest.simuladoRows || []).slice(-200),
            };
        };

        const safeData = {
            ...data,
            contests: data.contests
                ? Object.fromEntries(
                    Object.entries(data.contests).map(([id, c]) => [id, safeguardContest(c)])
                )
                : data.contests,
            _lastBackup: new Date().toISOString()
        };

        const docRef = doc(db, BACKUP_COLLECTION, docId);
        await setDoc(docRef, safeData);

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
        const docSnap = await getDocFromServer(docRef);

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
