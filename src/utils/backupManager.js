import { generateId } from './idGenerator';
import DOMPurify from 'dompurify';

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
    const sanitizedName = DOMPurify.sanitize(rawName).trim() || "Sem Nome";

    // ✅ Validar maxScore e weight antes do spread
    const rawMaxScore = Number(cat.maxScore);
    const maxScore = Number.isFinite(rawMaxScore) && rawMaxScore > 0 ? rawMaxScore : 100;
    const rawWeight = Number(cat.weight);
    const weight = Number.isFinite(rawWeight) && rawWeight > 0 ? rawWeight : 10;

    return {
        ...cat,
        id: String(cat.id || generateId('cat')),
        name: sanitizedName.substring(0, 100), // ✅ 100 chars, não 50
        maxScore,
        weight,
        minCutoff: Number.isFinite(Number(cat.minCutoff)) ? Number(cat.minCutoff) : 0,
        // PRESERVE: Mantemos propriedades inerentes através do spread acima
        priority: cat.priority || 'medium',
        completedAt: cat.completedAt || null,
        lastStudiedAt: cat.lastStudiedAt || null,
        awardedXP: !!cat.awardedXP,
        status: cat.status || 'active',
        totalMinutes: Math.max(0, Number(cat.totalMinutes) || 0),
        simuladoStats: cat.simuladoStats && typeof cat.simuladoStats === 'object'
            ? cat.simuladoStats
            : { history: [], average: 0, lastAttempt: 0, trend: 'stable', level: 'BAIXO' },
        tasks: Array.isArray(cat.tasks) ? cat.tasks.map(t => {
            if (!t || typeof t !== 'object') return null;
            const taskText = DOMPurify.sanitize(String(t.text || "")).trim();
            const taskTitle = DOMPurify.sanitize(String(t.title || t.text || "")).trim();
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
                awardedXP: !!t.awardedXP
            };
        }).filter(Boolean) : []
    };
};

const sanitizeContest = (contest) => {
    const rawCats = toCategoriesArray(contest?.categories) || [];
    const cleanContestName = typeof contest?.contestName === 'string'
        ? DOMPurify.sanitize(contest.contestName).trim()
        : '';
    const cleanName = typeof contest?.name === 'string'
        ? DOMPurify.sanitize(contest.name).trim()
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

export const parseImportedData = (content, currentAppState) => {
    try {
        if (!content) throw new Error("Arquivo vazio");

        // Security: Size check (5MB) BEFORE parse
        if (content.length > 5 * 1024 * 1024) {
            throw new Error("Arquivo muito grande (máximo 5MB).");
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

        // Strategy 1: Valid Full Backup (New Format)
        if (imported.contests && imported.activeId) {
            if (!validateFullBackup(imported)) {
                throw new Error("Backup completo corrompido ou inválido.");
            }
            const sanitizedImportedContests = Object.fromEntries(
                Object.entries(imported.contests)
                    .filter(([id, contest]) => id !== 'length' && contest && typeof contest === 'object' && !Array.isArray(contest))
                    .map(([id, contest]) => [id, sanitizeContest(contest)])
            );
            const mergedContests = mergePreservingLocalContests(sanitizedImportedContests);
            const importedKeys = Object.keys(sanitizedImportedContests);
            const resolvedActiveId = sanitizedImportedContests[imported.activeId]
                ? imported.activeId
                : (importedKeys.find(k => k !== 'default') || importedKeys[0] || 'default');

            return {
                type: 'FULL_RESTORE',
                data: {
                    ...currentAppState,
                    ...imported,
                    activeId: resolvedActiveId,
                    contests: mergedContests,
                    version: Math.max(Number(currentAppState?.version || 0), Number(imported.version || 0)) + 1,
                    lastUpdated: nowIso
                }
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
                ...currentAppState,
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
                .filter(([id, contest]) => id !== 'length' && contest && typeof contest === 'object' && !Array.isArray(contest));
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

            const newState = {
                ...currentAppState,
                ...imported,
                activeId: fallbackId,
                contests: mergePreservingLocalContests(sanitizedImportedContests),
                version: Math.max(Number(currentAppState?.version || 0), Number(imported.version || 0)) + 1,
                lastUpdated: nowIso
            };

            return { type: 'LEGACY_RESTORE', data: newState };
        }

        throw new Error("Formato de arquivo não reconhecido.");
    } catch (err) {
        throw new Error(`Erro ao importar: ${err.message}`);
    }
};

