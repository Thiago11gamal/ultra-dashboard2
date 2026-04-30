import { generateId } from '../../utils/idGenerator';
import { XP_CONFIG } from '../../config/gamification';
import { SYNC_LOG_CAP } from '../../config';

const LOG_CAP = SYNC_LOG_CAP;
const SESSION_CAP = SYNC_LOG_CAP;

export const createStudySlice = (set, get) => ({
    handleUpdateStudyTime: (categoryId, minutes, taskId) => {
        let pendingXp = 0;
        set((state) => {
            const now = new Date().toISOString();
            const activeData = state.appState.contests[state.appState.activeId];

            const logId = generateId('log');
            const sessionId = generateId('session');
            
            const newLog = { id: logId, date: now, categoryId, taskId, minutes };
            const newSession = { 
                id: sessionId, 
                startTime: now, 
                duration: minutes, 
                categoryId, 
                taskId, 
                logReferenceId: logId 
            };

            activeData.studyLogs = [...(activeData.studyLogs || []), newLog].slice(-LOG_CAP);
            activeData.studySessions = [...(activeData.studySessions || []), newSession].slice(-SESSION_CAP);

            const category = activeData.categories.find(c => c.id === categoryId);
            if (category) {
                category.totalMinutes = (category.totalMinutes || 0) + minutes;
                category.lastStudiedAt = now;
                if (taskId) {
                    const task = category.tasks.find(t => t.id === taskId);
                    if (task) task.lastStudiedAt = now;
                }
            }

            const xpPerMinute = (XP_CONFIG.pomodoro.base / 25) || 1; 
            const baseXP = Math.floor(minutes * xpPerMinute);
            const bonusXP = taskId ? (XP_CONFIG.pomodoro.bonusWithTask || 5) : 0;
            const startHour = new Date(now).getHours();
            if (activeData.user) {
                if (startHour >= 4 && startHour < 7) activeData.user.studiedEarly = true;
                if (startHour >= 23 || startHour < 4) activeData.user.studiedLate = true;
            }

            pendingXp = baseXP + bonusXP;

            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
            localStorage.setItem('ultra-sync-dirty', 'true');
        });

        if (pendingXp > 0 && get().awardExperience) {
            get().awardExperience(pendingXp);
        }
    },

    deleteSession: (sessionId) => {
        let xpToDeduct = 0;
        set((state) => {
            const activeData = state.appState.contests[state.appState.activeId];
            if (!activeData.studySessions || !activeData.categories) return;
            const sessionIndex = activeData.studySessions.findIndex(s => s.id === sessionId);
            if (sessionIndex === -1) return;

            const session = activeData.studySessions[sessionIndex];
            
            const xpPerMinute = (XP_CONFIG.pomodoro.base / 25) || 1;
            const baseXP = Math.floor((session.duration || 0) * xpPerMinute);
            const bonusXP = session.taskId ? (XP_CONFIG.pomodoro.bonusWithTask || 5) : 0;
            xpToDeduct = baseXP + bonusXP;

            const category = activeData.categories.find(c => c.id === session.categoryId);
            if (category) {
                category.totalMinutes = Math.max(0, (category.totalMinutes || 0) - (session.duration || 0));
            }

            activeData.studySessions.splice(sessionIndex, 1);
            if (activeData.studyLogs && session.logReferenceId) {
                activeData.studyLogs = activeData.studyLogs.filter(l => l.id !== session.logReferenceId);
            } else if (activeData.studyLogs) {
                activeData.studyLogs = activeData.studyLogs.filter(l => l.id !== session.id);
            }
            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
            localStorage.setItem('ultra-sync-dirty', 'true');
        });

        if (xpToDeduct > 0 && get().awardExperience) {
            get().awardExperience(-xpToDeduct);
        }
    },
});
