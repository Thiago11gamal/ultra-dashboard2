import { generateId } from './idGenerator';
import { sanitizePlainText } from './sanitizeText';

const toCategoriesArray = (rawCategories) => {
    if (rawCategories === undefined || rawCategories === null) return [];
    if (Array.isArray(rawCategories)) return rawCategories;
    if (typeof rawCategories === 'object') return Object.values(rawCategories);
    return null;
};

const contestHasUserData = (contest) => {
    if (!contest || typeof contest !== 'object') return false;
    const cats = toCategoriesArray(contest.categories);
    if (Array.isArray(cats) && cats.length > 0) return true;
    if (Array.isArray(contest.studyLogs) && contest.studyLogs.length > 0) return true;
    if (Array.isArray(contest.studySessions) && contest.studySessions.length > 0) return true;
    if (Array.isArray(contest.simuladoRows) && contest.simuladoRows.length > 0) return true;
    if (Array.isArray(contest.simulados) && contest.simulados.length > 0) return true;
    if (typeof contest.notes === 'string' && contest.notes.trim().length > 0) return true;
    const customContestName = typeof contest.contestName === 'string' ? contest.contestName.trim() : '';
    if (customContestName && customContestName !== 'Novo Concurso' && customContestName !== 'Estudante') return true;
    const customName = typeof contest.name === 'string' ? contest.name.trim() : '';
    if (customName && customName !== 'Novo Concurso' && customName !== 'Estudante') return true;
    const userName = typeof contest.user?.name === 'string' ? contest.user.name.trim() : '';
    if (userName && userName !== 'Estudante' && userName !== 'Novo Concurso') return true;
    return false;
};

const validateFullBackup = (data) => {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
    // Essential root keys
    if (!data.contests || typeof data.contests !== 'object' || Array.isArray(data.contests)) return false;

    const validEntries = Object.entries(data.contests).filter(
        ([key, val]) => key !== 'length' && val && typeof val === 'object' && !Array.isArray(val)
    );
    if (validEntries.length === 0) return false;

    // Validate contest structure (tolerating omitted or object-map categories from Firebase/exports)
    for (const [, contest] of validEntries) {
        if (toCategoriesArray(contest.categories) === null) return false;
        // User object is optional but should be an object if present
        if (contest.user && (typeof contest.user !== 'object' || Array.isArray(contest.user))) return false;
    }

    return true;
};

// RIGOR-SEC: Camada de limpeza para remover campos potencialmente perigosos ou inválidos mantendo propriedades essenciais
const sanitizeCategory = (cat) => {
    if (!cat || typeof cat !== 'object') return null;

    const rawName = String(cat.name || "Sem Nome");
    const sanitizedName = sanitizePlainText(rawName) || "Sem Nome";

    // ✅ Validar maxScore e weight antes do spread
    const rawMaxScore = Number(cat.maxScore);
    const maxScore = Number.isFinite(rawMaxScore) && rawMaxScore > 0 ? rawMaxScore : 100;
    const rawWeight = Number(cat.weight);
    const weight = Number.isFinite(rawWeight) && rawWeight > 0 ? rawWeight : 10;
    const hasExplicitMinCutoff =
        cat.minCutoff !== undefined &&
        cat.minCutoff !== null &&
        typeof cat.minCutoff !== 'boolean' &&
        String(cat.minCutoff).trim() !== '' &&
        Number.isFinite(Number(cat.minCutoff));

    const sanitizeAwardedXP = (val) => {
        if (typeof val === 'number' && Number.isFinite(val)) return val;
        if (typeof val === 'string' && val.trim() !== '' && Number.isFinite(Number(val))) return Number(val);
        if (typeof val === 'boolean') return val;
        return undefined;
    };
    const catAwardedXP = sanitizeAwardedXP(cat.awardedXP);

    return {
        ...cat,
        id: String(cat.id || generateId('cat')),
        name: sanitizedName.substring(0, 100), // ✅ 100 chars, não 50
        maxScore,
        weight,
        minCutoff: hasExplicitMinCutoff ? Number(cat.minCutoff) : null,
        // PRESERVE: Mantemos propriedades inerentes através do spread acima
        priority: cat.priority || 'medium',
        completedAt: cat.completedAt || null,
        lastStudiedAt: cat.lastStudiedAt || null,
        ...(catAwardedXP !== undefined ? { awardedXP: catAwardedXP } : { awardedXP: undefined }),
        status: cat.status || 'active',
        totalMinutes: Math.max(0, Number(cat.totalMinutes) || 0),
        simuladoStats: cat.simuladoStats && typeof cat.simuladoStats === 'object'
            ? cat.simuladoStats
            : { history: [], average: 0, lastAttempt: 0, trend: 'stable', level: 'BAIXO' },
        tasks: Array.isArray(cat.tasks) ? cat.tasks.map(t => {
            if (!t || typeof t !== 'object') return null;
            const taskText = sanitizePlainText(t.text || "");
            const taskTitle = sanitizePlainText(t.title || t.text || "");
            const taskAwardedXP = sanitizeAwardedXP(t.awardedXP);
            return {
                ...t,
                id: String(t.id || generateId('task')),
                text: taskText || "Nova Tarefa",
                title: taskTitle || taskText || "Nova Tarefa",
                completed: !!t.completed,
                // PRESERVE: Metadados da tarefa
                priority: t.priority || 'medium',
                completedAt: t.completedAt || null,
                lastStudiedAt: t.lastStudiedAt || null,
                ...(taskAwardedXP !== undefined ? { awardedXP: taskAwardedXP } : { awardedXP: undefined })
            };
        }).filter(Boolean) : []
    };
};

const sanitizeContest = (contest) => {
    const rawCats = toCategoriesArray(contest?.categories) || [];
    const cleanContestName = typeof contest?.contestName === 'string'
        ? sanitizePlainText(contest.contestName)
        : '';
    const cleanName = typeof contest?.name === 'string'
        ? sanitizePlainText(contest.name)
        : '';
    return {
        ...contest,
        ...(cleanContestName ? { contestName: cleanContestName } : {}),
        ...(cleanName ? { name: cleanName } : {}),
        user: contest?.user && typeof contest.user === 'object' && !Array.isArray(contest.user) ? contest.user : {},
        categories: rawCats.map(sanitizeCategory).filter(Boolean),
    };
};

const unwrapBackupPayload = (raw) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return raw;
    if (raw.contests || raw.categories || raw.user) return raw;
    if (raw.state?.appState && typeof raw.state.appState === 'object') return raw.state.appState;
    if (raw.appState && typeof raw.appState === 'object') return raw.appState;
    if (raw.state && typeof raw.state === 'object' && (raw.state.contests || raw.state.categories || raw.state.user)) {
        return raw.state;
    }
    return raw;
};

export const parseImportedData = (content, currentAppState, options = {}) => {
    try {
        if (!content) throw new Error("Arquivo vazio");

        const maxSizeBytes =
            Number.isFinite(Number(options?.maxSizeBytes)) && Number(options.maxSizeBytes) > 0
                ? Number(options.maxSizeBytes)
                : 5 * 1024 * 1024;
        const maxSizeMb = Math.max(1, Math.round(maxSizeBytes / (1024 * 1024)));

        // Security: Size check BEFORE parse
        if (content.length > maxSizeBytes) {
            throw new Error(`Arquivo muito grande (máximo ${maxSizeMb}MB).`);
        }

        const parsedJson = JSON.parse(content);
        const imported = unwrapBackupPayload(parsedJson);
        if (!imported || typeof imported !== 'object' || Array.isArray(imported)) {
            throw new Error("Conteúdo JSON inválido.");
        }

        const nowIso = new Date().toISOString();
        const existingContests = (currentAppState?.contests && typeof currentAppState.contests === 'object')
            ? currentAppState.contests
            : {};

        const mergePreservingLocalContests = (importedContests) => {
            const merged = {};
            Object.entries(existingContests).forEach(([id, localContest]) => {
                if (!importedContests[id] && contestHasUserData(localContest)) {
                    merged[id] = localContest;
                }
            });
            Object.entries(importedContests).forEach(([id, impContest]) => {
                merged[id] = impContest;
            });
            return merged;
        };

        const buildRestoredRootState = (importedRoot, resolvedActiveId, mergedContests) => {
            const safeTrash = Array.isArray(importedRoot.trash)
                ? importedRoot.trash.filter(Boolean).slice(-50)
                : (Array.isArray(currentAppState?.trash) ? currentAppState.trash : []);
            const safeDeletedContestIds = Array.isArray(importedRoot.deletedContestIds)
                ? importedRoot.deletedContestIds.filter(Boolean).slice(-50)
                : (Array.isArray(currentAppState?.deletedContestIds) ? currentAppState.deletedContestIds : []);
            const safePomodoro = {
                ...(currentAppState?.pomodoro && typeof currentAppState.pomodoro === 'object' ? currentAppState.pomodoro : {}),
                isRunning: false,
                activeSubject: null,
                sessions: 1,
                completedCycles: 0,
                accumulatedMinutes: 0,
                mode: 'work',
                neuralQueue: [],
                neuralMode: false,
            };
            return {
                ...(currentAppState && typeof currentAppState === 'object' ? currentAppState : {}),
                dashboardFilter: typeof importedRoot.dashboardFilter === 'string'
                    ? importedRoot.dashboardFilter
                    : (currentAppState?.dashboardFilter || 'all'),
                hasSeenTour: typeof importedRoot.hasSeenTour === 'boolean'
                    ? importedRoot.hasSeenTour
                    : Boolean(currentAppState?.hasSeenTour),
                mcEqualWeights: typeof importedRoot.mcEqualWeights === 'boolean'
                    ? importedRoot.mcEqualWeights
                    : (currentAppState?.mcEqualWeights ?? true),
                activeWorkspace: typeof importedRoot.activeWorkspace === 'string'
                    ? importedRoot.activeWorkspace
                    : (currentAppState?.activeWorkspace || 'default'),
                trash: safeTrash,
                deletedContestIds: safeDeletedContestIds,
                pomodoro: safePomodoro,
                isHydrated: currentAppState?.isHydrated ?? true,
                activeId: resolvedActiveId,
                contests: mergedContests,
                version: Math.max(Number(currentAppState?.version || 0), Number(importedRoot.version || 0)) + 1,
                lastUpdated: nowIso
            };
        };

        // Strategy 1: Valid Full Backup (New Format)
        if (imported.contests && imported.activeId) {
            if (!validateFullBackup(imported)) {
                throw new Error("Backup completo corrompido ou inválido.");
            }
            const sanitizedImportedContests = Object.fromEntries(
                Object.entries(imported.contests)
                    .filter(([id, contest]) => id !== 'length' && id !== '__proto__' && id !== 'constructor' && id !== 'prototype' && contest && typeof contest === 'object' && !Array.isArray(contest))
                    .map(([id, contest]) => [id, sanitizeContest(contest)])
            );
            const mergedContests = mergePreservingLocalContests(sanitizedImportedContests);
            const importedKeys = Object.keys(sanitizedImportedContests);
            const resolvedActiveId = sanitizedImportedContests[imported.activeId]
                ? imported.activeId
                : (importedKeys.find(k => k !== 'default') || importedKeys[0] || 'default');

            return {
                type: 'FULL_RESTORE',
                data: buildRestoredRootState(imported, resolvedActiveId, mergedContests)
            };
        }

        // Strategy 2: Single Contest Data (Old Format or Partial Export)
        if (imported.user || imported.categories !== undefined) {
            const normalizedCats = toCategoriesArray(imported.categories);
            if (normalizedCats === null) {
                throw new Error("Formato inválido: 'categories' deve ser um array.");
            }

            // RIGOR-RESTORE: Saneamento profundo
            const sanitizedSingle = {
                ...sanitizeContest({ ...imported, categories: normalizedCats }),
                lastUpdated: nowIso
            };

            const defaultAlreadyOccupied = contestHasUserData(existingContests['default']);
            const targetContestId = defaultAlreadyOccupied ? generateId('contest') : 'default';
            if (defaultAlreadyOccupied && !sanitizedSingle.contestName && !sanitizedSingle.name) {
                sanitizedSingle.contestName = sanitizedSingle.user?.name && sanitizedSingle.user.name !== 'Estudante'
                    ? sanitizedSingle.user.name
                    : 'Concurso Importado';
            }

            // Build a new appState wrapping this contest without overwriting an occupied 'default' contest
            const newState = {
                ...(currentAppState && typeof currentAppState === 'object' ? currentAppState : {}),
                isHydrated: currentAppState?.isHydrated ?? true,
                activeId: targetContestId,
                contests: {
                    ...existingContests,
                    [targetContestId]: sanitizedSingle
                },
                version: Number(currentAppState?.version || 0) + 1,
                lastUpdated: nowIso
            };

            return { type: 'PARTIAL_RESTORE', data: newState };
        }

        // Strategy 3: Legacy "Ultra Dashboard" Wrapper or missing activeId
        if (imported.contests && typeof imported.contests === 'object' && !Array.isArray(imported.contests)) {
            const validEntries = Object.entries(imported.contests)
                .filter(([id, contest]) => id !== 'length' && id !== '__proto__' && id !== 'constructor' && id !== 'prototype' && contest && typeof contest === 'object' && !Array.isArray(contest));
            if (validEntries.length === 0) throw new Error("Backup não contém concursos.");

            if (!validateFullBackup(imported)) {
                throw new Error("Backup corrompido ou com estrutura inválida.");
            }

            const sanitizedImportedContests = Object.fromEntries(
                validEntries.map(([id, contest]) => [id, sanitizeContest(contest)])
            );
            const contestKeys = Object.keys(sanitizedImportedContests);
            const fallbackId = (imported.activeId && sanitizedImportedContests[imported.activeId])
                ? imported.activeId
                : (contestKeys.find(k => k !== 'default') || contestKeys[0] || 'default');

            const newState = buildRestoredRootState(imported, fallbackId, mergePreservingLocalContests(sanitizedImportedContests));

            return { type: 'LEGACY_RESTORE', data: newState };
        }

        throw new Error("Formato de arquivo não reconhecido.");
    } catch (err) {
        throw new Error(`Erro ao importar: ${err.message}`);
    }
};

