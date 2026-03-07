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
            return { type: 'FULL_RESTORE', data: imported };
        }

        // Strategy 2: Single Contest Data (Old Format or Partial Export)
        if (imported.user || imported.categories) {
            if (!Array.isArray(imported.categories)) {
                throw new Error("Formato inválido: 'categories' deve ser um array.");
            }

            // Basic sanitization
            imported.categories.forEach((cat, i) => {
                if (!cat.id) cat.id = `cat-import-${i}`;
                if (!cat.name) cat.name = "Sem Nome";
                if (!Array.isArray(cat.tasks)) cat.tasks = [];
            });

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

        // Strategy 3: Legacy "Ultra Dashboard" Wrapper
        if (imported.contests) {
            const contestKeys = Object.keys(imported.contests);
            const fallbackId = contestKeys.find(k => k !== 'default') || contestKeys[0] || 'default';

            const newState = {
                ...currentAppState,
                activeId: fallbackId,
                contests: imported.contests
            };

            if (!validateFullBackup(newState)) {
                throw new Error("Backup legado corrompido ou incompatível.");
            }

            return { type: 'LEGACY_RESTORE', data: newState };
        }

        throw new Error("Formato de arquivo não reconhecido.");
    } catch (err) {
        throw new Error(`Erro ao importar: ${err.message}`);
    }
};
