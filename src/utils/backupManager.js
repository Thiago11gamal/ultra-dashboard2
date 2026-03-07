export const parseImportedData = (content, currentAppState) => {
    try {
        if (!content) throw new Error("Arquivo vazio");

        const imported = JSON.parse(content);

        // Security: Size check (5MB)
        if (content.length > 5 * 1024 * 1024) {
            throw new Error("Arquivo muito grande (máximo 5MB).");
        }

        // Strategy 1: Valid Full Backup (New Format)
        if (imported.contests && imported.activeId) {
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
            return { type: 'LEGACY_RESTORE', data: newState };
        }

        throw new Error("Formato de arquivo não reconhecido.");
    } catch (err) {
        throw new Error(`Erro ao importar: ${err.message}`);
    }
};
