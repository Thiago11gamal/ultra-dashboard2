// XP Configuration (Fair System)
export const XP_CONFIG = {
    task: {
        high: 200,      // Tarefas prioritárias valem mais
        medium: 150,    // Padrão
        low: 100        // Incentiva fazer as difíceis primeiro
    },
    pomodoro: {
        base: 100,              // XP por pomodoro completo
        bonusWithTask: 100      // Bônus se estava focado em uma tarefa
    },
    penalty: 50,      // Penalidade menor ao desmarcar (era -150)
    streak: {
        daily: 25,      // XP por dia de estudo consecutivo
        weekly: 200     // Bônus ao completar 7 dias seguidos
    }
};

/**
 * Sistema de nivelamento PROGRESSIVO (não linear)
 * Nível 1: 0 XP
 * Nível 2: 100 XP (+100)
 * Nível 3: 400 XP (+300)
 * Nível 4: 900 XP (+500)
 * Nível 5: 1,600 XP (+700)
 */
export const calculateLevel = (xpInput) => {
    const xp = Number(xpInput) || 0;
    // Formula: Level = floor(sqrt(XP / 100)) + 1
    return Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1;
};

// Alias for compatibility
export const getLevelFromXP = calculateLevel;

export const getXpToNextLevel = (currentXP) => {
    const level = calculateLevel(currentXP);
    return Math.pow(level, 2) * 100;
};

// Alias for compatibility if needed, or keep distinct
export const getXPForNextLevel = (level) => {
    return Math.pow(level, 2) * 100;
};

export const getXPProgress = (xpInput) => {
    const xp = Math.max(0, Number(xpInput) || 0);
    const level = calculateLevel(xp);
    const currentLevelXP = Math.pow(level - 1, 2) * 100;
    const nextLevelXP = Math.pow(level, 2) * 100;

    return {
        level,
        current: xp - currentLevelXP,
        needed: nextLevelXP - currentLevelXP,
        percentage: Math.min(100, Math.max(0, Math.round(((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100))),
        // Backwards compatibility if needed by StatsCards
        total: xp,
    };
};

export const calculateProgress = (xp) => {
    return getXPProgress(xp).percentage;
};

export const getTaskXP = (task, completed) => {
    const baseXP = XP_CONFIG.task[task.priority] || XP_CONFIG.task.medium;
    return completed ? baseXP : -XP_CONFIG.penalty;
};

// Calculate Title based on Level
export const getLevelTitle = (level) => {
    if (level >= 50) return { title: 'Lenda', icon: '👑', color: 'text-amber-500', barColor: 'from-amber-500' };
    if (level >= 30) return { title: 'Mestre', icon: '🔮', color: 'text-purple-400', barColor: 'from-purple-400' };
    if (level >= 20) return { title: 'Elite', icon: '💎', color: 'text-blue-400', barColor: 'from-blue-400' };
    if (level >= 10) return { title: 'Veterano', icon: '⚔️', color: 'text-red-500', barColor: 'from-red-500' };
    if (level >= 5) return { title: 'Competidor', icon: '🔥', color: 'text-orange-400', barColor: 'from-orange-400' };
    return { title: 'Estudante', icon: '🌱', color: 'text-green-400', barColor: 'from-green-400' };
};
