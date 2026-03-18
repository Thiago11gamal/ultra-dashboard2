// Initial data structure for the dashboard
// Theme: Study/Exam Preparation (Ultra-Premium Version)

// Helper for Local YYYY-MM-DD
const getLocalYMD = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const INITIAL_DATA = {
    user: {
        name: "Estudante",
        avatar: "👤",
        startDate: getLocalYMD(), // Local Date
        goalDate: null,  // Null default (no exam date set)
        xp: 0,
        level: 1, // Fix: start at level 1 (calculateLevel(0) = 1)
        achievements: [], // Unlocked achievement IDs
        targetProbability: 70
    },

    categories: [],

    simuladoRows: [], // Stores the raw input rows for Simulado Analysis per contest

    simulados: [],

    studyLogs: [], // Log of detailed study sessions for AI Coach

    studySessions: [], // History of sessions for StudyHistory

    notes: "",



    settings: {
        darkMode: 'auto',
        soundEnabled: true,
        pomodoroWork: 25,
        pomodoroBreak: 5,
    }
};

// Export data as JSON file
export const exportData = (state) => {
    // Export the currently active contest data mostly, or all?
    // Let's export ALL data structure for full backup
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    // Use Local Date for filename
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    a.download = `ultra-dashboard-backup-${dateStr}.json`;
    a.click();

    // Fix: Delay URL revocation so the browser has time to start the download
    setTimeout(() => {
        URL.revokeObjectURL(url);
    }, 100);
};
