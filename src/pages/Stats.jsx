import { PageErrorBoundary } from '../components/ErrorBoundary';
import React, { useMemo } from 'react';
import VerifiedStats from '../components/VerifiedStats';
import WeeklyAnalysis from '../components/WeeklyAnalysis';
import { EvolucaoFocoChart } from '../components/charts/Analytics/EvolucaoFocoChart';
import { HorasDisciplinaChart } from '../components/charts/Analytics/HorasDisciplinaChart';
import { mapFocusEvolutionData, mapSubjectHoursData } from '../utils/chartDataMappers';
import { useAppStore } from '../store/useAppStore';

export default function Stats() {
    const data = useAppStore(state => state.appState.contests[state.appState.activeId]);

    const focusData = useMemo(() => mapFocusEvolutionData(data?.studyLogs || []), [data?.studyLogs]);
    const subjectData = useMemo(() => mapSubjectHoursData(data?.studyLogs || [], data?.categories || []), [data?.studyLogs, data?.categories]);

    if (!data || !data.categories) {
        return (
            <div className="flex items-center justify-center min-h-[80vh]">
                <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (<PageErrorBoundary pageName="Estatísticas">
        <div className="space-y-8 animate-fade-in pb-12">
            <VerifiedStats
                categories={data.categories || []}
                user={data.user}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass p-6 rounded-3xl border border-white/10 shadow-2xl bg-slate-900/40">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                            <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-white uppercase tracking-widest leading-none mb-1">Evolução do Foco</h2>
                            <p className="text-[11px] text-slate-500 uppercase">Histórico de Horas Líquidas de Estudo</p>
                        </div>
                    </div>
                    <EvolucaoFocoChart data={focusData} />
                </div>

                <div className="glass p-6 rounded-3xl border border-white/10 shadow-2xl bg-slate-900/40">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-white uppercase tracking-widest leading-none mb-1">Concentração por Matéria</h2>
                            <p className="text-[11px] text-slate-500 uppercase">Ranking de disciplinas por tempo investido</p>
                        </div>
                    </div>
                    <HorasDisciplinaChart data={subjectData} />
                </div>
            </div>

            <WeeklyAnalysis
                studyLogs={data.studyLogs || []}
                categories={data.categories || []}
            />
        </div>
    </PageErrorBoundary>);
}

