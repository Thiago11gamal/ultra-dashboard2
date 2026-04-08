export const XP_CONFIG = {
    task: {
        high: 200,      // Tarefas prioritárias valem mais
        medium: 150,    // Padrão
        low: 100        // Incentiva fazer as difíceis primeiro
    },
    pomodoro: {
        base: 150,
        bonusWithTask: 50
    },
    streak: {
        daily: 25,
        weekly: 200
    }
};

export const ACHIEVEMENTS = [
    { 
        id: 'first_step', 
        name: 'Primeiro Passo', 
        icon: '🌟', 
        xpReward: 100, 
        condition: (stats) => stats.completedTasks >= 1 
    },
    { 
        id: 'streak_3', 
        name: 'Iniciante Consistente', 
        icon: '🔥', 
        xpReward: 150, 
        condition: (stats) => stats.currentStreak >= 3 
    },
    { 
        id: 'streak_7', 
        name: 'Semana Invicta', 
        icon: '🏆', 
        xpReward: 350, 
        condition: (stats) => stats.currentStreak >= 7 
    },
    { 
        id: 'streak_30', 
        name: 'Maratonista', 
        icon: '👑', 
        xpReward: 1000, 
        condition: (stats) => stats.currentStreak >= 30 
    },
    { 
        id: 'centurion', 
        name: 'Centurião', 
        icon: '💯', 
        xpReward: 300, 
        condition: (stats) => stats.totalQuestions >= 100 
    },
    { 
        id: 'perfectionist', 
        name: 'Perfeccionista', 
        icon: '🎯', 
        xpReward: 500, 
        condition: (stats) => stats.hasPerfectScore 
    },
    { 
        id: 'pomodoro_10', 
        name: 'Focado', 
        icon: '⏱️', 
        xpReward: 300, 
        condition: (stats) => stats.pomodorosCompleted >= 10 
    },
    { 
        id: 'early_bird', 
        name: 'Madrugador', 
        icon: '🌅', 
        xpReward: 200, 
        condition: (stats) => stats.studiedEarly 
    },
    { 
        id: 'night_owl', 
        name: 'Coruja', 
        icon: '🦉', 
        xpReward: 200, 
        condition: (stats) => stats.studiedLate 
    },
];
