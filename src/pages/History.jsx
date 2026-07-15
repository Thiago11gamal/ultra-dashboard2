import { PageErrorBoundary } from '../components/ErrorBoundary';
import React from 'react';
import StudyHistory from '../components/StudyHistory';
import { useAppStore } from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';

export default function History() {
    const data = useAppStore(useShallow(state => {
        const contest = state.appState?.contests?.[state.appState?.activeId] || {};
        return {
            categories: contest.categories,
            simuladoRows: contest.simuladoRows,
            studySessions: contest.studySessions
        };
    }));
    const deleteSession = useAppStore(state => state.deleteSession);
    const deleteSimulado = useAppStore(state => state.deleteSimulado);

    return (<PageErrorBoundary pageName="Histórico">
        <StudyHistory
            studySessions={Array.isArray(data.studySessions) ? data.studySessions : Object.values(data.studySessions || {})}
            categories={Array.isArray(data.categories) ? data.categories : Object.values(data.categories || {})}
            simuladoRows={Array.isArray(data.simuladoRows) ? data.simuladoRows : Object.values(data.simuladoRows || {})}
            onDeleteSession={deleteSession}
            onDeleteSimulado={deleteSimulado}
            mode="performance"
        />
    </PageErrorBoundary>);
}
