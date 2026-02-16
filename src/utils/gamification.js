
// Constants
export const LEVEL_MAX = 10; // Start level
export const LEVEL_MIN = 1;  // Goal level

// XP Required PER LEVEL (non-linear, exponential difficulty)
// Total: 25,750 XP to reach Level 1
const XP_THRESHOLDS = {
    10: 0,      // Start here
    9: 800,     // +800 (Slightly harder start)
    8: 2000,    // +1200
    7: 3500,    // +1500
    6: 5500,    // +2000
    5: 8000,    // +2500
    4: 11000,   // +3000
    3: 14500,   // +3500
    2: 18500,   // +4000
    1: 23000,   // +4500 - Smoother finish (was +6250)
};

// Calculate Level based on Total XP
export const calculateLevel = (xpInput) => {
    const xp = Number(xpInput) || 0;
    // Start from the goal (level 1) and work backwards to find current level
    // Lower level = better (level 1 is the goal, level 10 is starting point)
    for (let level = LEVEL_MIN; level <= LEVEL_MAX; level++) {
        if (xp >= XP_THRESHOLDS[level]) {
            return level; // Found the level where XP meets the threshold
        }
    }
    return LEVEL_MAX; // Default to starting level (10) if XP is 0 or very low
};

// Calculate Title based on Level
export const getLevelTitle = (level) => {
    if (level >= 9) return { title: 'Aspirante', icon: '🌱', color: 'text-slate-400', barColor: 'from-slate-400' };
    if (level >= 7) return { title: 'Estudante', icon: '📚', color: 'text-yellow-400', barColor: 'from-yellow-400' };
    if (level >= 5) return { title: 'Concorrente', icon: '⚔️', color: 'text-orange-400', barColor: 'from-orange-400' };
    if (level >= 3) return { title: 'Competidor', icon: '🔥', color: 'text-red-500', barColor: 'from-red-500' };
    if (level === 2) return { title: 'Elite', icon: '💎', color: 'text-purple-400', barColor: 'from-purple-400' };
    return { title: 'Aprovado', icon: '👑', color: 'text-yellow-400', barColor: 'from-yellow-400' };
};

// Calculate Progress to NEXT Level (percentage)
export const calculateProgress = (xp) => {
    const level = calculateLevel(xp);
    if (level === LEVEL_MIN) return 100; // Max level reached

    const currentThreshold = XP_THRESHOLDS[level];
    const nextThreshold = XP_THRESHOLDS[level - 1];
    const xpInLevel = xp - currentThreshold;
    const xpNeededForLevel = nextThreshold - currentThreshold;

    const progress = Math.round((xpInLevel / xpNeededForLevel) * 100);
    return Math.min(100, Math.max(0, progress));
};

// Get XP needed for next level
export const getXpToNextLevel = (xp) => {
    const level = calculateLevel(xp);
    if (level === LEVEL_MIN) return 0; // Already max

    const nextThreshold = XP_THRESHOLDS[level - 1];
    return nextThreshold - xp;
};

// Get total XP needed for a specific level
export const getXpForLevel = (level) => {
    return XP_THRESHOLDS[level] || 0;
};
