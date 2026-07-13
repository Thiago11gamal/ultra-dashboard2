import { PageErrorBoundary } from '../components/ErrorBoundary';
import React from 'react';
import StudyHistory from '../components/StudyHistory';
import { useAppStore } from '../store/useAppStore';

import { useShallow } from 'zustand/react/shallow';

export default function Sessions() {
    const data = useAppStore(useShallow(state => {
        const contest = state.appState?.contests?.[state.appState?.activeId] || {};
        return {
            studySessions: contest.studySessions,
            categories: contest.categories,
            simuladoRows: contest.simuladoRows
        };
    }));
    const deleteSession = useAppStore(state => state.deleteSession);
    const deleteSimulado = useAppStore(state => state.deleteSimulado);
 
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
