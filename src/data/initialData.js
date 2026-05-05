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

let exportRevokeTimeoutId = null;

// Export data as JSON file
export const exportData = (state) => {
    // Export the currently active contest data mostly, or all?
    // Let's export ALL data structure for full backup
    let serialized = '{}';
    try {
        serialized = JSON.stringify(state ?? {}, null, 2);
    } catch {
        // fallback para dados com referências circulares
        serialized = JSON.stringify({ error: 'Falha ao serializar backup', timestamp: Date.now() }, null, 2);
    }
    const blob = new Blob([serialized], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.rel = 'noopener';

    // Use Local Date for filename
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    a.download = `ultra-dashboard-backup-${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Fix: Delay URL revocation so the browser has time to start the download
    // BUGFIX (memory/data): evitar acúmulo de timeouts de revogação em exports sequenciais.
    if (exportRevokeTimeoutId) clearTimeout(exportRevokeTimeoutId);
    exportRevokeTimeoutId = setTimeout(() => {
        URL.revokeObjectURL(url);
        exportRevokeTimeoutId = null;
    }, 100);
};
