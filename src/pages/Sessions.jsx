import { PageErrorBoundary } from '../components/ErrorBoundary';
import React from 'react';
import StudyHistory from '../components/StudyHistory';
import { useAppStore } from '../store/useAppStore';

export default function Sessions() {
    const data = useAppStore(state => state.appState.contests[state.appState.activeId]);
    const { deleteSession, deleteSimulado } = useAppStore();
 
    if (!data) {
        return (
            <PageErrorBoundary pageName="Sessões">
                <div className="min-h-[50vh] flex items-center justify-center text-center px-4">
                    <div>
                        <p className="text-slate-300 font-bold uppercase tracking-wider text-xs">Sem dados de sessões</p>
                        <p className="text-slate-500 text-[11px] mt-1">Inicie ciclos no cronômetro para preencher este histórico.</p>
                    </div>
                </div>
            </PageErrorBoundary>
        );
    }

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
