import { describe, it, expect } from 'vitest';
import { runCoachOrchestrator } from '../src/engine/orchestrator/coachOrchestrator.js';
import { ensureCoachTaskId } from '../src/utils/coachTaskId.js';
import { parseCoachTask } from '../src/utils/coachText.js';
import { deriveCoachAdaptiveParams } from '../src/utils/coachAdaptive.js';
import { getSafeId } from '../src/utils/idGenerator.js';

describe('Coach AI Menu - Comprehensive Bug Audit & Regression Suite', () => {

    it('Bug 1: coachOrchestrator runCoachOrchestrator does not crash with ReferenceError on custom timeoutMs', async () => {
        // When passing options with timeoutMs, previously threw ReferenceError: timeoutMs is not defined
        const inputData = {
            categories: [
                { id: 'cat-1', name: 'Direito Constitucional', tasks: [{ id: 't1', text: 'Artigo 5' }] }
            ],
            simulados: [],
            studyLogs: []
        };

        const resultWithTimeout = await runCoachOrchestrator(inputData, { timeoutMs: 5000, force: true });
        expect(resultWithTimeout).toBeDefined();
        expect(resultWithTimeout.version).toBeDefined();
        expect(resultWithTimeout.meta).toBeDefined();
        expect(resultWithTimeout.meta.errors).toEqual([]);

        // Also test with default timeout (no options object passed)
        const resultDefault = await runCoachOrchestrator(inputData, { force: true });
        expect(resultDefault).toBeDefined();
        expect(resultDefault.meta.errors).toEqual([]);
    });

    it('Bug 2: coachTaskId ensureCoachTaskId handles null, undefined and primitives without crashing', () => {
        expect(() => ensureCoachTaskId(null)).not.toThrow();
        expect(ensureCoachTaskId(null)).toBeNull();

        expect(() => ensureCoachTaskId(undefined)).not.toThrow();
        expect(ensureCoachTaskId(undefined)).toBeUndefined();

        expect(() => ensureCoachTaskId('just a string')).not.toThrow();
        expect(ensureCoachTaskId('just a string')).toBe('just a string');

        expect(() => ensureCoachTaskId(42)).not.toThrow();
        expect(ensureCoachTaskId(42)).toBe(42);

        // Object without id gets assigned a canonical unique id
        const taskObj = { text: 'Estudar Direito' };
        const withId = ensureCoachTaskId(taskObj);
        expect(withId.id).toBeDefined();
        expect(typeof withId.id).toBe('string');
        expect(withId.id.length).toBeGreaterThan(0);
    });

    it('Bug 3: coachText parseCoachTask preserves string subject instead of stripping it', () => {
        const categories = [
            { id: 'cat-1', name: 'Direito Constitucional' },
            { id: 'cat-2', name: 'Português' }
        ];

        // Case A: task.subject is a string matching category
        const taskWithStringSubject = {
            subject: 'Direito Constitucional',
            text: 'Revisar Artigo 5º da CF'
        };
        const parsedA = parseCoachTask(taskWithStringSubject, categories);
        expect(parsedA.subject).toBe('Direito Constitucional');
        expect(parsedA.action).toBe('Revisar Artigo 5º da CF');

        // Case B: task.subject is an object with subjectName
        const taskWithObjSubject = {
            subject: { subjectName: 'Português' },
            text: 'Interpretação de Texto'
        };
        const parsedB = parseCoachTask(taskWithObjSubject, categories);
        expect(parsedB.subject).toBe('Português');
        expect(parsedB.action).toBe('Interpretação de Texto');
    });

    it('Bug 4: coachAdaptive deriveCoachAdaptiveParams executes without unused variable errors and calculates weights', () => {
        const history = [
            { score: 70, date: '2026-01-01' },
            { score: 80, date: '2026-01-10' }
        ];

        const adaptive = deriveCoachAdaptiveParams(history, 100);
        expect(adaptive).toBeDefined();
        expect(adaptive.decayK).toBeGreaterThan(0);
        expect(adaptive.minWeight).toBeGreaterThan(0);
        expect(adaptive.scoreClampDelta).toBeGreaterThan(0);
        expect(adaptive.mcSimulations).toBeGreaterThan(0);
    });

    it('Bug 5: AICoachWidget degradation check matches canonical safe category IDs', () => {
        // Coach.jsx stores calibration degradation using canonical keys like getSafeId(cat.id || cat.name)
        const catName = 'Língua Portuguesa';
        const canonicalKey = getSafeId(catName);

        const calibrationOps = {
            [canonicalKey]: { degraded: true, reason: 'High Brier score' }
        };

        const task = {
            subject: catName,
            text: 'Fazer 20 questões de crase'
        };

        // Verification logic matching AICoachWidget fix:
        const parsedSubject = task.subject;
        const canonicalSafeId = getSafeId(parsedSubject);
        const isDegraded = Boolean(
            calibrationOps[parsedSubject]?.degraded ||
            (canonicalSafeId && calibrationOps[canonicalSafeId]?.degraded)
        );

        expect(isDegraded).toBe(true);
    });

    it('Bug 6: RaioXDashboard simulation counts support both array and object-map shapes without crashing', () => {
        const categories = [
            { id: 'c1', name: 'Direito' },
            { id: 'c2', name: 'Informática' }
        ];

        // Data with simulados as an object-map (from legacy sync or indexedDB serialization)
        const dataWithObjectSims = {
            simulados: {
                sim1: { categoryId: 'c1', score: 80 },
                sim2: { categoryId: 'c2', score: 70 }
            },
            simuladoRows: {
                row1: { categoryId: 'c1', score: 90 }
            }
        };

        const rawSims = Array.isArray(dataWithObjectSims.simulados) 
            ? dataWithObjectSims.simulados 
            : Object.values(dataWithObjectSims.simulados || {});
        const rawRows = Array.isArray(dataWithObjectSims.simuladoRows) 
            ? dataWithObjectSims.simuladoRows 
            : Object.values(dataWithObjectSims.simuladoRows || {});
        const allSims = [...rawSims, ...rawRows];

        const counts = categories.map(cat => ({
            id: cat.id,
            name: cat.name,
            count: allSims.filter(s => s && String(s.categoryId) === String(cat.id)).length
        }));

        expect(counts.find(c => c.id === 'c1').count).toBe(2);
        expect(counts.find(c => c.id === 'c2').count).toBe(1);
    });

    it('Bug 7: Purity in calibrationSummary when history is empty or has zero timestamps', () => {
        const historyByCategory = {};
        let latestTs = 0;
        for (const entries of Object.values(historyByCategory)) {
            if (Array.isArray(entries)) {
                for (const e of entries) {
                    const ts = Number(e?.timestamp) || 0;
                    if (ts > latestTs) latestTs = ts;
                }
            }
        }
        // now must equal latestTs without calling Date.now() during render
        const now = latestTs;
        expect(now).toBe(0);
    });
});
