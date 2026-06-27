import { describe, it, expect } from 'vitest';
import { buildAchievementStats, countPomodorosToday } from '../src/utils/analytics.js';

describe('buildAchievementStats & countPomodorosToday', () => {
    const today = new Date();
    const todayIso = today.toISOString();

    it('countPomodorosToday soma logs do dia + ciclos em andamento', () => {
        const logs = [
            { date: todayIso, minutes: 50 },
            { date: todayIso, minutes: 25 },
            { date: '2020-01-01T10:00:00.000Z', minutes: 100 }
        ];
        expect(countPomodorosToday(logs, 25, 2)).toBe(5);
    });

    it('não confunde índice de sessão atual com pomodoros concluídos', () => {
        const logs = [{ date: todayIso, minutes: 25 }];
        expect(countPomodorosToday(logs, 25, 0)).toBe(1);
        expect(countPomodorosToday(logs, 25, 2)).toBe(3);
    });

    it('desbloqueia deep_work com 4+ pomodoros no mesmo dia', () => {
        const contest = {
            settings: { pomodoroWork: 25 },
            studyLogs: Array.from({ length: 4 }, () => ({ date: todayIso, minutes: 25, categoryId: 'c1' })),
            studySessions: Array.from({ length: 4 }, (_, i) => ({ id: `s${i}` })),
            categories: [],
            simuladoRows: [],
            user: {}
        };
        const stats = buildAchievementStats(contest);
        expect(stats.pomodorosToday).toBeGreaterThanOrEqual(4);
    });

    it('usa calculateStudyStreak em vez de user.streak legado', () => {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const contest = {
            studyLogs: [
                { date: todayIso, minutes: 30 },
                { date: yesterday.toISOString(), minutes: 30 }
            ],
            studySessions: [],
            categories: [],
            simuladoRows: [],
            user: { streak: 0 }
        };

        const stats = buildAchievementStats(contest);
        expect(stats.currentStreak).toBeGreaterThanOrEqual(2);
    });

    it('conta subjectsStudied e studiedWeekend', () => {
        const saturday = new Date(today);
        while (saturday.getDay() !== 6) saturday.setDate(saturday.getDate() - 1);

        const contest = {
            studyLogs: [
                { date: saturday.toISOString(), minutes: 25, categoryId: 'c1' },
                { date: saturday.toISOString(), minutes: 25, categoryId: 'c2' }
            ],
            studySessions: [{ id: 's1', duration: 25 }],
            categories: [],
            simuladoRows: [],
            user: {}
        };

        const stats = buildAchievementStats(contest);
        expect(stats.subjectsStudied).toBe(2);
        expect(stats.studiedWeekend).toBe(true);
        expect(stats.pomodorosCompleted).toBe(1);
    });
});