import { PageErrorBoundary } from '../components/ErrorBoundary';
import React from 'react';
import StudyHistory from '../components/StudyHistory';
import { useAppStore } from '../store/useAppStore';

export default function History() {
    const data = useAppStore(state => state.appState.contests[state.appState.activeId]);
    const { deleteSession, deleteSimulado } = useAppStore();

    return (<PageErrorBoundary pageName="Histórico">
        <StudyHistory
            studySessions={data.studySessions || []}
            categories={data.categories || []}
            simuladoRows={data.simuladoRows || []}
            onDeleteSession={deleteSession}
            onDeleteSimulado={deleteSimulado}
            mode="performance"
        />
    </PageErrorBoundary>);
}
