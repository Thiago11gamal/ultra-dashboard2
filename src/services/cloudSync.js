import { doc, setDoc, getDocFromServer } from "firebase/firestore";
import { SYNC_LOG_CAP } from '../config';

// Constants
const BACKUP_COLLECTION = "backups";

export const uploadDataToCloud = async (data, userId) => {
    try {
        if (!data) throw new Error("No data to save");
        if (!userId) throw new Error("Usuário não autenticado. Backup abortado.");
        const docId = userId;

        // Bug fix: studyLogs, studySessions, simuladoRows grow unbounded and can exceed
        // Firestore's 1MB document limit, causing silent backup failures.
        // We keep the 200 most recent entries of each append-only array per contest —
        // all structural/config data (categories, user, weights, settings) is fully preserved.
        const safeguardContest = (contest) => {
            if (!contest) return contest;
            return {
                ...contest,
                studyLogs: (contest.studyLogs || []).slice(-SYNC_LOG_CAP),
                studySessions: (contest.studySessions || []).slice(-SYNC_LOG_CAP),
                simuladoRows: (contest.simuladoRows || []).slice(-SYNC_LOG_CAP),
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
        if (!userId) throw new Error("Autenticação necessária para baixar backup.");
        const docId = userId;
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
