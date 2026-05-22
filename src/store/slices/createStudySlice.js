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

            const category = activeData?.categories?.find(c => c.id === categoryId);
            let taskTitle = '';
            if (category && taskId) {
                const task = category.tasks?.find(t => t.id === taskId || t.text === taskId || t.title === taskId);
                taskTitle = task?.title || task?.text || (String(taskId).startsWith('task') ? '' : taskId);
            }

            const newLog = { id: logId, date: now, categoryId, taskId, minutes, taskTitle };
            const newSession = { 
                id: sessionId, 
                startTime: now, 
                duration: minutes, 
                categoryId, 
                taskId, 
                taskTitle,
                logReferenceId: logId 
            };

            const safeLogs = Array.isArray(activeData.studyLogs) ? activeData.studyLogs : Object.values(activeData.studyLogs || {});
            const safeSessions = Array.isArray(activeData.studySessions) ? activeData.studySessions : Object.values(activeData.studySessions || {});
            activeData.studyLogs = [...safeLogs, newLog].slice(-LOG_CAP);
            activeData.studySessions = [...safeSessions, newSession].slice(-SESSION_CAP);

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
            const safeSessions = Array.isArray(activeData.studySessions) ? activeData.studySessions : Object.values(activeData.studySessions || {});
            const sessionIndex = safeSessions.findIndex(s => s.id === sessionId);
            if (sessionIndex === -1) return;

            const session = safeSessions[sessionIndex];
            
            const xpPerMinute = (XP_CONFIG.pomodoro.base / 25) || 1;
            const baseXP = Math.floor((session.duration || 0) * xpPerMinute);
            const bonusXP = session.taskId ? (XP_CONFIG.pomodoro.bonusWithTask || 5) : 0;
            xpToDeduct = baseXP + bonusXP;

            const category = activeData.categories.find(c => c.id === session.categoryId);
            if (category) {
                category.totalMinutes = Math.max(0, (category.totalMinutes || 0) - (session.duration || 0));
            }

            safeSessions.splice(sessionIndex, 1);
            activeData.studySessions = safeSessions;

            if (activeData.studyLogs) {
                const safeLogs = Array.isArray(activeData.studyLogs) ? activeData.studyLogs : Object.values(activeData.studyLogs || {});
                if (session.logReferenceId) {
                    activeData.studyLogs = safeLogs.filter(l => l.id !== session.logReferenceId);
                } else {
                    activeData.studyLogs = safeLogs.filter(l => l.id !== session.id);
                }
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
