import { calculateLevel } from '../../utils/gamification';
import { buildAchievementStats } from '../../utils/analytics';
import { ACHIEVEMENTS } from '../../config/gamification';

export const createGamificationSlice = (set, get) => ({
    processGamification: (xpGained) => {
        let levelUpDetail = null;
        set((state) => {
            const activeData = state.appState.contests[state.appState.activeId];
            if (!activeData || !activeData.user) return;

            const currentXP = activeData.user.xp || 0;
            const currentMaxLevel = activeData.user.level || 1;

            // ✅ FIX: Permitir que XP desça abaixo do mínimo do nível atual,
            // mas nunca abaixo de 0. O nível é recalculado dinamicamente.
            let newXP = Math.max(0, currentXP + xpGained);

            const currentAchievements = activeData.user.achievements || [];
            const stats = buildAchievementStats(activeData) || {};

            const newlyUnlocked = [];
            ACHIEVEMENTS.forEach(ach => {
                const isUnlocked = currentAchievements.some(u => (typeof u === 'string' ? u : u.id) === ach.id);
                if (!isUnlocked && ach.condition(stats)) newlyUnlocked.push(ach.id);
            });

            if (newlyUnlocked.length > 0) {
                const achievementXp = newlyUnlocked.reduce((sum, id) => sum + (ACHIEVEMENTS.find(a => a.id === id)?.xpReward || 0), 0);
                newXP += achievementXp;
                activeData.user.achievements = [...currentAchievements, ...newlyUnlocked];
            }

            const calculatedLevel = calculateLevel(newXP);
            const finalLevel = Math.max(currentMaxLevel, calculatedLevel);
            
            activeData.user.level = finalLevel;
            activeData.user.xp = newXP;
            
            const newlyLeveledUp = calculatedLevel > currentMaxLevel;

            if (newlyLeveledUp) {
                let title = calculatedLevel - currentMaxLevel > 1 
                    ? `Níveis ${currentMaxLevel + 1} a ${calculatedLevel} Desbloqueados!`
                    : `Nível ${calculatedLevel} Desbloqueado!`;
                
                levelUpDetail = { level: calculatedLevel, title, xpGained: newXP - currentXP };
            }
        });
        return levelUpDetail;
    },

    dispatchLevelUp: (detail) => {
        if (!detail || typeof window === 'undefined') return;
        queueMicrotask(() => {
            window.dispatchEvent(new CustomEvent('level-up', { detail }));
        });
    },

    awardExperience: (xpAmount) => {
        const detail = get().processGamification(xpAmount);
        set((state) => {
            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
            localStorage.setItem('ultra-sync-dirty', 'true');
        });
        if (detail) get().dispatchLevelUp(detail);
    },

    updateUserName: (name) => set((state) => {
        const activeData = state.appState.contests[state.appState.activeId];
        if (!activeData) return;
        if (!activeData.user) activeData.user = {};
        activeData.user.name = name;
        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = new Date().toISOString();
        localStorage.setItem('ultra-sync-dirty', 'true');
    }),
});
