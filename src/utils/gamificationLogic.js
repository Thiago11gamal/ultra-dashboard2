import { format, subDays, differenceInDays } from 'date-fns';

// Achievement Definitions
const ACHIEVEMENTS = [
    {
        id: 'first_step',
        name: 'Primeiro Passo',
        description: 'Complete sua primeira tarefa',
        icon: '🌟',
        xpReward: 100,
        condition: (data) => data.completedTasks >= 1
    },
    {
        id: 'streak_3',
        name: 'Iniciante Consistente',
        description: 'Mantenha um streak de 3 dias',
        icon: '🔥',
        xpReward: 150,
        condition: (data) => data.currentStreak >= 3
    },
    {
        id: 'streak_7',
        name: 'Semana Invicta',
        description: 'Mantenha um streak de 7 dias',
        icon: '🏆',
        xpReward: 350,
        condition: (data) => data.currentStreak >= 7
    },
    {
        id: 'streak_30',
        name: 'Maratonista',
        description: 'Mantenha um streak de 30 dias',
        icon: '👑',
        xpReward: 1000,
        condition: (data) => data.currentStreak >= 30
    },
    {
        id: 'centurion',
        name: 'Centurião',
        description: 'Responda 100 questões',
        icon: '💯',
        xpReward: 300,
        condition: (data) => data.totalQuestions >= 100
    },
    {
        id: 'perfectionist',
        name: 'Perfeccionista',
        description: 'Acerte 100% em um simulado',
        icon: '🎯',
        xpReward: 500,
        condition: (data) => data.hasPerfectScore
    },
    {
        id: 'robot',
        name: 'Robô',
        description: 'SD < 5 em qualquer matéria',
        icon: '🤖',
        xpReward: 400,
        condition: (data) => data.hasRobotConsistency
    },
    {
        id: 'pomodoro_10',
        name: 'Focado',
        description: 'Complete 10 Pomodoros',
        icon: '⏱️',
        xpReward: 300,
        condition: (data) => data.pomodorosCompleted >= 10
    },
    {
        id: 'early_bird',
        name: 'Madrugador',
        description: 'Estude antes das 7h da manhã',
        icon: '🌅',
        xpReward: 200,
        condition: (data) => data.studiedEarly
    },
    {
        id: 'night_owl',
        name: 'Coruja',
        description: 'Estude após meia-noite',
        icon: '🦉',
        xpReward: 200,
        condition: (data) => data.studiedLate
    },
];

const calculateBestStreak = (dates) => {
    let best = 1;
    let current = 1;

    for (let i = 1; i < dates.length; i++) {
        const diff = differenceInDays(new Date(dates[i - 1]), new Date(dates[i]));
        if (diff === 1) {
            current++;
            best = Math.max(best, current);
        } else {
            current = 1;
        }
    }

    return best;
};

// Calculate Streak from study logs
export const calculateStreak = (studyLogs = []) => {
    if (!studyLogs.length) return { current: 0, best: 0 };

    const dates = [...new Set(
        studyLogs.map(l => format(new Date(l.date), 'yyyy-MM-dd'))
    )].sort().reverse();

    if (dates.length === 0) return { current: 0, best: 0 };

    const today = format(new Date(), 'yyyy-MM-dd');
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

    // Check if streak is active
    if (dates[0] !== today && dates[0] !== yesterday) {
        return { current: 0, best: calculateBestStreak(dates) };
    }

    let current = 1;
    for (let i = 1; i < dates.length; i++) {
        const diff = differenceInDays(new Date(dates[i - 1]), new Date(dates[i]));
        if (diff === 1) {
            current++;
        } else {
            break;
        }
    }

    return { current, best: Math.max(current, calculateBestStreak(dates)) };
};

// Function to check and return newly unlocked achievements
export const checkAndUnlockAchievements = (data, currentUnlocked = []) => {
    // Helper to calculate SD from history
    const calculateSD = (history) => {
        if (!history || history.length < 3) return 999;
        // Filter out entries with total of 0 to avoid division by zero
        const validEntries = history.filter(h => h.total > 0);
        if (validEntries.length < 3) return 999;
        const scores = validEntries.map(h => (h.correct / h.total) * 100);
        const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
        const variance = scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (scores.length - 1);
        return Math.sqrt(variance);
    };

    // Build stats object from data
    const stats = {
        completedTasks: data.categories?.reduce((sum, cat) =>
            sum + (cat.tasks?.filter(t => t.completed)?.length || 0), 0) || 0,
        currentStreak: calculateStreak(data.studyLogs || []).current,
        totalQuestions: data.categories?.reduce((sum, cat) =>
            sum + (cat.simuladoStats?.history?.reduce((h, entry) => h + (entry.total || 0), 0) || 0), 0) || 0,
        hasPerfectScore: data.categories?.some(cat =>
            cat.simuladoStats?.history?.some(h => h.score === 100 || (h.correct === h.total && h.total > 0))) || false,
        hasRobotConsistency: data.categories?.some(cat => {
            const sd = calculateSD(cat.simuladoStats?.history);
            return sd < 5;
        }) || false,
        pomodorosCompleted: data.pomodorosCompleted || 0,
        studiedEarly: data.studiedEarly || false,
        studiedLate: data.studiedLate || false
    };

    const newlyUnlocked = [];

    ACHIEVEMENTS.forEach(achievement => {
        // Safe check handling both string IDs and object items (legacy data)
        const isUnlocked = currentUnlocked.some(u => {
            const uId = typeof u === 'string' ? u : u.id;
            return uId === achievement.id;
        });

        if (!isUnlocked && achievement.condition(stats)) {
            newlyUnlocked.push(achievement.id);
        }
    });

    return {
        newlyUnlocked,
        allUnlocked: [...currentUnlocked, ...newlyUnlocked],
        xpGained: newlyUnlocked.reduce((sum, id) => {
            const ach = ACHIEVEMENTS.find(a => a.id === id);
            return sum + (ach?.xpReward || 0);
        }, 0)
    };
};


// Calculate Streak Bonus XP
export const getStreakBonus = (streak) => {
    // Base: 50 XP, +50 per day, capped at 500
    return Math.min(500, streak * 50);
};

// Random Bonus Check (10% chance)
export const checkRandomBonus = () => {
    return Math.random() < 0.10;
};

// Export achievements for checking
export { ACHIEVEMENTS };
