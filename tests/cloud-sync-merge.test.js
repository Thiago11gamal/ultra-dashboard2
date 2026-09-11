import { describe, it, expect } from 'vitest';

/**
 * Replica a lógica de merge extraída de useCloudSync para validação unitária.
 */
const mergeArrays = (arr1, arr2) => {
    const map = new Map();
    const getStableKey = (item) => {
        if (item.id) return item.id;
        return `${item.date || ''}-${item.categoryId || ''}-${item.taskId || JSON.stringify(item)}`;
    };
    (arr1 || []).forEach(item => map.set(getStableKey(item), item));
    (arr2 || []).forEach(item => map.set(getStableKey(item), item));
    return Array.from(map.values());
};

const mergeCategoryTasks = (localTasks = [], cloudTasks = []) => {
    const taskMap = new Map();
    const taskKey = (t) => t?.id || t?.text || `${t?.title || ''}-${t?.priority || ''}`;
    const pickWinner = (a, b) => {
        if (!a) return b;
        if (!b) return a;
        if (a.completed && !b.completed) return a;
        if (b.completed && !a.completed) return b;
        const aTime = new Date(a.lastStudiedAt || 0).getTime();
        const bTime = new Date(b.lastStudiedAt || 0).getTime();
        return (Number.isFinite(aTime) ? aTime : 0) >= (Number.isFinite(bTime) ? bTime : 0) ? a : b;
    };

    [...localTasks, ...cloudTasks].forEach(task => {
        if (!task) return;
        const key = taskKey(task);
        taskMap.set(key, pickWinner(taskMap.get(key), task));
    });
    return Array.from(taskMap.values());
};

import { toArray } from '../src/utils/normalize.js';

describe('Cloud sync merge helpers', () => {
    it('mergeCategoryTasks preserva tarefa concluída local quando nuvem está desatualizada', () => {
        const local = [{ id: 't1', text: 'Task', completed: true, lastStudiedAt: '2026-06-25T12:00:00Z' }];
        const cloud = [{ id: 't1', text: 'Task', completed: false, lastStudiedAt: '2026-06-24T12:00:00Z' }];
        const merged = mergeCategoryTasks(local, cloud);
        expect(merged).toHaveLength(1);
        expect(merged[0].completed).toBe(true);
    });

    it('mergeArrays une studyLogs de ambos os lados sem duplicar por id', () => {
        const local = [{ id: 'l1', date: '2026-06-25', minutes: 25 }];
        const cloud = [
            { id: 'l1', date: '2026-06-25', minutes: 30 },
            { id: 'c1', date: '2026-06-24', minutes: 25 }
        ];
        const merged = mergeArrays(local, cloud);
        expect(merged).toHaveLength(2);
        expect(merged.find(l => l.id === 'l1').minutes).toBe(30);
    });

    it('toArray com array congelado (Object.freeze) retorna cópia mutável e não quebra com sort()', () => {
        const frozenArr = Object.freeze([
            Object.freeze({ date: '2026-06-25', score: 80 }),
            Object.freeze({ date: '2026-06-20', score: 90 }),
            Object.freeze({ date: '2026-06-22', score: 85 })
        ]);

        const result = toArray(frozenArr);
        expect(() => {
            result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        }).not.toThrow();

        expect(result[0].date).toBe('2026-06-20');
        expect(result[2].date).toBe('2026-06-25');
    });

    it('toArray com null/undefined/objeto retorna arrays válidos', () => {
        expect(toArray(null)).toEqual([]);
        expect(toArray(undefined)).toEqual([]);
        expect(toArray({ 0: 'a', 1: 'b' })).toEqual(['a', 'b']);
        expect(toArray('single')).toEqual(['single']);
    });
});
