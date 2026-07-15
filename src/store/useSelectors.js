import { useAppStore } from './useAppStore';
import { useShallow } from 'zustand/react/shallow';

// Hook para pegar os contests (evita que atualizações de UI/Pomodoro causem re-renders)
export const useContests = () => {
    return useAppStore(useShallow(state => state.appState?.contests || {}));
};

// Hook para pegar o concurso ativo atual (altamente utilizado)
export const useActiveContest = () => {
    return useAppStore(useShallow(state => {
        const activeId = state.appState?.activeId || 'default';
        return state.appState?.contests?.[activeId] || null;
    }));
};

// Hook específico para categorias
export const useActiveCategories = () => {
    return useAppStore(useShallow(state => {
        const activeId = state.appState?.activeId || 'default';
        const cats = state.appState?.contests?.[activeId]?.categories || [];
        return Array.isArray(cats) ? cats : Object.values(cats || {});
    }));
};

// Hook específico para logs de estudo
export const useActiveStudyLogs = () => {
    return useAppStore(useShallow(state => {
        const activeId = state.appState?.activeId || 'default';
        const logs = state.appState?.contests?.[activeId]?.studyLogs || [];
        return Array.isArray(logs) ? logs : Object.values(logs || {});
    }));
};

// Hook específico para configurações do concurso
export const useActiveSettings = () => {
    return useAppStore(useShallow(state => {
        const activeId = state.appState?.activeId || 'default';
        return state.appState?.contests?.[activeId]?.settings || {};
    }));
};

// Hook para o estado do Pomodoro (Isolado)
export const usePomodoroState = () => {
    return useAppStore(useShallow(state => state.appState?.pomodoro || {}));
};

// Hook para pegar apenas as variáveis de interface e filtros
export const useUIState = () => {
    return useAppStore(useShallow(state => ({
        dashboardFilter: state.appState?.dashboardFilter || 'all',
        hasSeenTour: state.appState?.hasSeenTour || false,
        isHydrated: state.appState?.isHydrated || false,
        activeId: state.appState?.activeId || 'default'
    })));
};
