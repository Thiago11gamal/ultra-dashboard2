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
    // Conquistas Iniciais
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
        id: 'unstoppable', 
        name: 'Imparável', 
        icon: '🚀', 
        xpReward: 2500, 
        condition: (stats) => stats.currentStreak >= 100 
    },

    // Conquistas de Desempenho e Resolução
    { 
        id: 'half_century', 
        name: 'Meio Século', 
        icon: '🥈', 
        xpReward: 250, 
        condition: (stats) => stats.completedTasks >= 50 
    },
    { 
        id: 'centurion', 
        name: 'Centurião', 
        icon: '💯', 
        xpReward: 500, 
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
        id: 'sniper', 
        name: 'Sniper Acadêmico', 
        icon: '🦅', 
        xpReward: 600, 
        condition: (stats) => stats.accuracy >= 90 && stats.totalQuestions > 50 
    },

    // Conquistas de Foco e Rotina
    { 
        id: 'pomodoro_10', 
        name: 'Mestre do Foco', 
        icon: '⏱️', 
        xpReward: 300, 
        condition: (stats) => stats.pomodorosCompleted >= 10 
    },
    { 
        id: 'deep_work', 
        name: 'Foco Profundo', 
        icon: '🧠', 
        xpReward: 400, 
        condition: (stats) => stats.pomodorosToday >= 4 // 4 pomodoros no mesmo dia
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

    // Conquistas Especiais
    { 
        id: 'weekend_warrior', 
        name: 'Guerreiro de Fim de Semana', 
        icon: '⚔️', 
        xpReward: 400, 
        condition: (stats) => stats.studiedWeekend 
    },
    { 
        id: 'polymath', 
        name: 'Polímata', 
        icon: '📚', 
        xpReward: 500, 
        condition: (stats) => stats.subjectsStudied >= 3 // Estudou 3 matérias/tópicos diferentes
    }
];
