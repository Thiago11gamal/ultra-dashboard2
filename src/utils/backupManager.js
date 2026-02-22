export const parseImportedData = (content, currentAppState) => {
    try {
        if (!content) throw new Error("Arquivo vazio");

        const imported = JSON.parse(content);

        // Strategy 1: Valid Full Backup (New Format)
        if (imported.contests && imported.activeId) {
            return { type: 'FULL_RESTORE', data: imported };
        }

        // Strategy 2: Single Contest Data (Old Format or Partial Export)
        if (imported.user || imported.categories) {
            if (!imported.user && !imported.categories) {
                throw new Error("Formato inválido: Faltam dados de usuário ou categorias.");
            }

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
            const newState = {
                ...currentAppState,
                activeId: Object.keys(imported.contests)[0] || 'default',
                contests: imported.contests
            };
            return { type: 'LEGACY_RESTORE', data: newState };
        }

        throw new Error("Formato de arquivo não reconhecido.");
    } catch (err) {
        throw new Error(`Erro ao importar: ${err.message}`);
    }
};
