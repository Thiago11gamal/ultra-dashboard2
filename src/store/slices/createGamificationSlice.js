import { calculateLevel } from '../../utils/gamification';
import { calculateStudyStreak } from '../../utils/analytics';
import { ACHIEVEMENTS } from '../../config/gamification';

export const createGamificationSlice = (set, get) => ({
    processGamification: (xpGained) => {
        let levelUpDetail = null;
        set((state) => {
            const activeData = state.appState.contests[state.appState.activeId];
            if (!activeData || !activeData.user) return;

            const currentXP = activeData.user.xp || 0;
            const currentMaxLevel = activeData.user.level || 1;
            
            let newXP = Math.max(0, currentXP + xpGained);

            const currentAchievements = activeData.user.achievements || [];
            
            // Stats for achievement check
            const stats = {
                completedTasks: activeData.categories?.reduce((sum, cat) => sum + (cat.tasks?.filter(t => t.completed)?.length || 0), 0) || 0,
                currentStreak: calculateStudyStreak(activeData.studyLogs || []).current,
                totalQuestions: activeData.categories?.reduce((sum, cat) => sum + (cat.simuladoStats?.history?.reduce((h, e) => h + (Number(e.total) || 0), 0) || 0), 0) || 0,
                hasPerfectScore: activeData.categories?.some(cat => cat.simuladoStats?.history?.some(h => h.score === 100 || (h.correct === h.total && h.total > 0))) || false,
                pomodorosCompleted: activeData.studySessions?.length || 0,
                studiedEarly: activeData.user?.studiedEarly || false,
                studiedLate: activeData.user?.studiedLate || false
            };

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
        if (!activeData.user) activeData.user = {};
        activeData.user.name = name;
        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = new Date().toISOString();
        localStorage.setItem('ultra-sync-dirty', 'true');
    }),
});
