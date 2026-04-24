import { generateId } from './idGenerator';

const validateFullBackup = (data) => {
    if (!data || typeof data !== 'object') return false;
    // Essential root keys
    if (!data.contests || typeof data.contests !== 'object') return false;
    if (!data.activeId || typeof data.activeId !== 'string') return false;

    // Check if activeId exists in contests
    if (!data.contests[data.activeId]) return false;

    // Validate contest structure (basic)
    for (const contest of Object.values(data.contests)) {
        if (!Array.isArray(contest.categories)) return false;
        // User object is optional but should be an object if present
        if (contest.user && typeof contest.user !== 'object') return false;
    }

    return true;
};

// RIGOR-SEC: Camada de limpeza para remover campos potencialmente perigosos ou inválidos
const sanitizeCategory = (cat) => ({
    id: String(cat.id || generateId('cat')),
    name: String(cat.name || "Sem Nome").substring(0, 50),
    tasks: Array.isArray(cat.tasks) ? cat.tasks.map(t => ({
        id: String(t.id || generateId('task')),
        text: String(t.text || "").replace(/<[^>]*>?/gm, ''), // Remove HTML para evitar XSS
        completed: !!t.completed
    })) : []
});

const sanitizeContest = (contest) => ({
    ...contest,
    user: contest?.user && typeof contest.user === 'object' ? contest.user : {},
    categories: Array.isArray(contest?.categories) ? contest.categories.map(sanitizeCategory) : [],
});

export const parseImportedData = (content, currentAppState) => {
    try {
        if (!content) throw new Error("Arquivo vazio");

        // Security: Size check (5MB) BEFORE parse
        if (content.length > 5 * 1024 * 1024) {
            throw new Error("Arquivo muito grande (máximo 5MB).");
        }

        const imported = JSON.parse(content);

        // Strategy 1: Valid Full Backup (New Format)
        if (imported.contests && imported.activeId) {
            if (!validateFullBackup(imported)) {
                throw new Error("Backup completo corrompido ou inválido.");
            }
            const sanitizedContests = Object.fromEntries(
                Object.entries(imported.contests).map(([id, contest]) => [id, sanitizeContest(contest)])
            );
            return {
                type: 'FULL_RESTORE',
                data: {
                    ...imported,
                    contests: sanitizedContests
                }
            };
        }

        // Strategy 2: Single Contest Data (Old Format or Partial Export)
        if (imported.user || imported.categories) {
            if (!Array.isArray(imported.categories)) {
                throw new Error("Formato inválido: 'categories' deve ser um array.");
            }

            // RIGOR-RESTORE: Saneamento profundo
            imported.categories = imported.categories.map(sanitizeCategory);

            // Build a new appState wrapping this contest
            const newState = {
                ...currentAppState,
                activeId: 'default',
                contests: {
                    ...currentAppState.contests,
                    'default': imported
                }
            };

            return { type: 'PARTIAL_RESTORE', data: newState };
        }

        // Strategy 3: Legacy "Ultra Dashboard" Wrapper or missing activeId
        if (imported.contests && typeof imported.contests === 'object') {
            const contestKeys = Object.keys(imported.contests);
            if (contestKeys.length === 0) throw new Error("Backup não contém concursos.");

            const fallbackId = imported.activeId || contestKeys.find(k => k !== 'default') || contestKeys[0] || 'default';

            const newState = {
                ...currentAppState,
                ...imported,
                activeId: fallbackId,
                contests: imported.contests
            };

            if (!validateFullBackup(newState)) {
                throw new Error("Backup corrompido ou com estrutura inválida.");
            }

            return { type: 'LEGACY_RESTORE', data: newState };
        }

        throw new Error("Formato de arquivo não reconhecido.");
    } catch (err) {
        throw new Error(`Erro ao importar: ${err.message}`);
    }
};
