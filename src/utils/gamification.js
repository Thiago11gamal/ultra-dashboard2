import { XP_CONFIG } from '../config/gamification';
// XP_CONFIG movido para src/config/gamification.js para centralização de verdade (Bug 1).

/**
 * Sistema de nivelamento PROGRESSIVO (não linear)
 * Nível 1: 0 XP
 * Nível 2: 100 XP (+100)
 * Nível 3: 400 XP (+300)
 * Nível 4: 900 XP (+500)
 * Nível 5: 1,600 XP (+700)
 */
export const calculateLevel = (xpInput) => {
    const safeXp = Number.isFinite(Number(xpInput)) ? Number(xpInput) : 0;
    if (safeXp < 0) return 1;
    // Formula: Level = floor(sqrt(XP / 100)) + 1
    const level = Math.floor(Math.sqrt(safeXp / 100)) + 1;
    return Number.isNaN(level) ? 1 : level;
};

// Alias for compatibility
export const getLevelFromXP = calculateLevel;

// B-11 FIX: Nomes descritivos e distintos
/**
 * Retorna quantos XP FALTAM para o próximo nível.
 * @param {number} currentXP - XP atual do usuário
 * @returns {number} XP restante (nunca negativo)
 */
export const getXpRemainingToNextLevel = (currentXP) => {
    const xp = Math.max(0, Number(currentXP) || 0);
    const level = calculateLevel(xp);
    const nextLevelThreshold = Math.pow(level, 2) * 100;
    return Math.max(0, nextLevelThreshold - xp);
};

/**
 * Retorna o XP TOTAL necessário para ATINGIR o nível informado.
 * @param {number} level - Nível desejado (ex: 5)
 * @returns {number} XP total acumulado para chegar nesse nível
 */
export const getXpThresholdForLevel = (level) => {
    return Math.pow(Math.max(0, level - 1), 2) * 100;
};

export const getXPProgress = (xpInput) => {
    const xp = Math.max(0, Number(xpInput) || 0);
    const level = calculateLevel(xp);
    const currentLevelXP = Math.pow(level - 1, 2) * 100;
    const nextLevelXP = Math.pow(level, 2) * 100;
    const range = nextLevelXP - currentLevelXP;

    // ✅ FIX: Proteção contra range zero e feedback visual mínimo
    const safeXP = Math.max(currentLevelXP, xp);
    const safeRange = Math.max(1, range);
    const rawPercentage = ((safeXP - currentLevelXP) / safeRange) * 100;
    const percentage = Math.round(Math.max(0, Math.min(100, rawPercentage)));
    return {
        level,
        current: Math.max(0, xp - currentLevelXP),
        needed: Math.max(1, range),
        percentage: (percentage === 0 && xp > 0) ? 0.5 : percentage,
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
    // ✅ FIX BUG-11: Ao desmarcar, usar o XP que foi realmente concedido (se disponível),
    // como um "recibo" imutável. Previne exploit de mudar prioridade após completar.
    // Math.abs() e Number() protegem contra corrupção do estado (ex: negative awardedXP).
    const rawAwarded = task.awardedXP !== undefined ? Number(task.awardedXP) : baseXP;
    const deduction = Number.isFinite(rawAwarded) ? rawAwarded : baseXP;
    
    // Limita a dedução a um teto razoável (ex: 2x o XP base) para evitar perdas ou ganhos bizarros em exploits
    const maxDeduction = baseXP * 2;
    const safeDeduction = Math.min(Math.abs(deduction), maxDeduction);
    
    return -safeDeduction;
};

// Calculate Title based on Level
export const getLevelTitle = (level) => {
    if (level >= 50) return { title: 'Lenda', icon: '👑', color: 'text-amber-500', barColor: 'from-amber-500' };
    if (level >= 30) return { title: 'Mestre', icon: '🔮', color: 'text-purple-400', barColor: 'from-purple-400' };
    if (level >= 20) return { title: 'Elite', icon: '💎', color: 'text-blue-400', barColor: 'from-blue-400' };
    if (level >= 10) return { title: 'Veterano', icon: '⚔️', color: 'text-red-500', barColor: 'from-red-500' };
    return { title: 'Estudante', icon: '🌱', color: 'text-green-400', barColor: 'from-green-400' };
};

export function calculateMissionReward(baseReward = 50, completionRate = 1.0, quality = 1.0) {
    const rawReward = baseReward * completionRate * quality;
    // Garante que retorne um número finito e maior ou igual a zero
    const finalReward = Number.isFinite(rawReward) ? Math.max(0, rawReward) : 0;
    return Math.round(finalReward);
}
