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

// B-11 FIX: Nomes descritivos e distintos
// Recebe XP atual → retorna XP RESTANTE para próximo nível
export const getXpRemainingToNextLevel = (currentXP) => {
    const xp = Math.max(0, Number(currentXP) || 0);
    const level = calculateLevel(xp);
    const nextLevelThreshold = Math.pow(level, 2) * 100;
    return Math.max(0, nextLevelThreshold - xp);
};

// Recebe NÍVEL atual → retorna XP TOTAL do próximo nível (threshold)
export const getXpThresholdForLevel = (level) => {
    return Math.pow(level, 2) * 100;
};

export const getXPProgress = (xpInput) => {
    const xp = Math.max(0, Number(xpInput) || 0);
    const level = calculateLevel(xp);
    const currentLevelXP = Math.pow(level - 1, 2) * 100;
    const nextLevelXP = Math.pow(level, 2) * 100;
    const range = nextLevelXP - currentLevelXP;

    // FIX: Se o progresso for 0 logo após subir de nível, 
    // retornamos 0.5% para melhor feedback visual na UI.
    const safeXP = Math.max(currentLevelXP, xp);
    const rawPercentage = range > 0 ? ((safeXP - currentLevelXP) / range) * 100 : 0;
    const percentage = Math.round(Math.max(0, Math.min(100, rawPercentage)));

    return {
        level,
        current: Math.max(0, xp - currentLevelXP),
        needed: Math.max(0, range),
        percentage: (percentage === 0 && xp > 0) ? 0.5 : percentage, // FIX visual
        total: xp,
    };
};

export const calculateProgress = (xp) => {
    return getXPProgress(xp).percentage;
};

export const getTaskXP = (task, completed) => {
    const baseXP = XP_CONFIG.task[task.priority] || XP_CONFIG.task.medium;
    if (completed) {
        return baseXP;
    }
    // BUG-12 FIX: Ao desmarcar, usar o XP que foi realmente concedido (se disponível),
    // não o baseXP da prioridade atual. Previne exploit de mudar prioridade após completar.
    const deduction = task.awardedXP !== undefined ? task.awardedXP : baseXP;
    return -deduction;
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
