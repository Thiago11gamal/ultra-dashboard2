import { PageErrorBoundary } from '../components/ErrorBoundary';
import React from 'react';
import { History as HistoryIcon, Sparkles } from 'lucide-react';
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

    return (
        <PageErrorBoundary pageName="Histórico">
            <div className="w-full space-y-6 animate-fade-in">
                {/* Header da Página */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-blue-500/20 flex items-center justify-center border border-indigo-500/30 shadow-lg shadow-indigo-500/10">
                            <HistoryIcon size={24} className="text-indigo-400" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-black text-white tracking-tight">Histórico de Desempenho</h1>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                    <Sparkles size={10} />
                                    Analytics
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Evolução detalhada de simulados, tópicos críticos e recomendações de estudo
                            </p>
                        </div>
                    </div>
                </div>

                <StudyHistory
                    studySessions={Array.isArray(data.studySessions) ? data.studySessions : Object.values(data.studySessions || {})}
                    categories={Array.isArray(data.categories) ? data.categories : Object.values(data.categories || {})}
                    simuladoRows={Array.isArray(data.simuladoRows) ? data.simuladoRows : Object.values(data.simuladoRows || {})}
                    onDeleteSession={deleteSession}
                    onDeleteSimulado={deleteSimulado}
                    mode="performance"
                />
            </div>
        </PageErrorBoundary>
    );
}


