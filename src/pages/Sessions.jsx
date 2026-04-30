import { PageErrorBoundary } from '../components/ErrorBoundary';
import React from 'react';
import StudyHistory from '../components/StudyHistory';
import { useAppStore } from '../store/useAppStore';

export default function Sessions() {
    const data = useAppStore(state => state.appState.contests[state.appState.activeId]);
    const { deleteSession, deleteSimulado } = useAppStore();

    if (!data) return null;

    return (<PageErrorBoundary pageName="Sessões">
        <StudyHistory
            studySessions={data.studySessions || []}
            categories={data.categories || []}
            simuladoRows={data.simuladoRows || []}
            onDeleteSession={deleteSession}
            onDeleteSimulado={deleteSimulado}
            mode="sessions"
        />
    </PageErrorBoundary>);
}
