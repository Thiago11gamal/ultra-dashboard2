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
        goalDate: getLocalYMD(),  // Local Date (0 days default)
        xp: 0,
        level: 10, // Starts at Level 10, goes down to 1
        achievements: [] // Unlocked achievement IDs
    },

    categories: [],

    simuladoRows: [], // Stores the raw input rows for Simulado Analysis per contest

    simulados: [],

    pomodoroSessions: [],

    notes: "",



    settings: {
        darkMode: true,
        soundEnabled: true,
        pomodoroWork: 25,
        pomodoroBreak: 5,
    }
};

// Helper to get data from localStorage or use initial
// returns { contests: { [id]: data }, activeId: string }
export const loadData = () => {
    try {
        const saved = localStorage.getItem('ultra-dashboard-data');
        if (saved) {
            const parsed = JSON.parse(saved);
            // Migration check: if it has 'activeId', it's already the new format
            if (parsed.activeId && parsed.contests) {
                return parsed;
            }
            // Otherwise, it's the old single-object format. Migrate it.
            return {
                contests: { 'default': parsed },
                activeId: 'default'
            };
        }
    } catch (e) {
        console.error('Error loading data:', e);
    }
    // Default initial state
    return {
        contests: { 'default': INITIAL_DATA },
        activeId: 'default'
    };
};

// Helper to save data
export const saveData = (state) => {
    try {
        // Critical Safeguard: Never save null, undefined, or empty state
        if (!state) {
            console.error('Attempted to save invalid state (null/undefined). Aborted.');
            return false;
        }
        if (!state.contests && !state.user) {
            console.error('Attempted to save malformed state (missing contests/user). Aborted.');
            return false;
        }

        localStorage.setItem('ultra-dashboard-data', JSON.stringify(state));
        return true;
    } catch (e) {
        console.error('Error saving data:', e);
        if (e.name === 'QuotaExceededError' || e.code === 22) {
            alert("⚠️ Espaço local cheio! Não foi possível salvar seus dados automaticamente. Tente limpar dados antigos ou usar o backup na nuvem.");
        } else {
            // Optional: alert generic error or just log to avoid spamming
            console.warn("Falha ao salvar dados localmente.");
        }
        return false;
    }
};

// EXTREME SAFETY: Backup on load
export const backupData = (state) => {
    try {
        if (!state) return;
        localStorage.setItem('ultra-dashboard-data-backup-safety', JSON.stringify(state));

    } catch (e) {
        console.error('Backup failed:', e);
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
    URL.revokeObjectURL(url);
};
