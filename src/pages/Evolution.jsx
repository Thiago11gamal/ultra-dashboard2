import React from 'react';
import EvolutionChart from '../components/EvolutionChart';
import ErrorBoundary from '../components/ErrorBoundary';
import { useAppStore } from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';

const EMPTY_ARRAY = [];

export default function Evolution() {
    // 🎯 PERFORMANCE FIX: Granular selectors with useShallow.
    // Previne re-renders pesados quando o Pomodoro ou outros dados do contest mudam mas não afetam o gráfico.
    const { categories, rawStudyLogs, monteCarloHistory, user, unit, minScore, maxScore, simuladoRows } = useAppStore(
        useShallow(state => {
            const contests = state?.appState?.contests || {};
            const activeId = state?.appState?.activeId;
            const contest = contests[activeId] || {};
            return {
                categories: contest.categories ?? EMPTY_ARRAY,
                rawStudyLogs: contest.studyLogs,
                monteCarloHistory: contest.monteCarloHistory ?? EMPTY_ARRAY,
                user: contest.user,
                unit: contest.unit || '%',
                minScore: contest.minScore ?? 0,
                maxScore: contest.maxScore ?? 100,
                simuladoRows: contest.simuladoRows ?? EMPTY_ARRAY
            };
        })
    );

    const studyLogs = React.useMemo(() => {
        return Array.isArray(rawStudyLogs) ? rawStudyLogs : Object.values(rawStudyLogs || {});
    }, [rawStudyLogs]);

    const hasEvolutionData = Array.isArray(categories) && categories.some(category => {
        const h = category?.simuladoStats?.history;
        return h && (Array.isArray(h) ? h.length > 0 : Object.keys(h).length > 0);
    });

    return (
        <ErrorBoundary>
            <div className="animate-fade-in">
                {!hasEvolutionData ? (
                    <div className="flex items-center justify-center min-h-[45vh] p-4">
                        <div className="glass p-8 sm:p-12 text-center rounded-2xl border border-slate-800/80 bg-slate-900/50 shadow-2xl max-w-md w-full">
                            <div className="text-5xl mb-4 opacity-80">📊</div>
                            <p className="font-black uppercase tracking-wider text-sm text-slate-200 mb-2">
                                Sem histórico de simulados
                            </p>
                            <p className="text-xs text-slate-400 mb-0 leading-relaxed">
                                Registe simulados nas disciplinas para visualizar a sua evolução e previsões do motor Monte Carlo.
                            </p>
                        </div>
                    </div>
                ) : (
                    <EvolutionChart
                        categories={categories}
                        studyLogs={studyLogs}
                        targetScore={user?.targetProbability ?? 70}
                        goalDate={user?.goalDate}
                        monteCarloHistory={monteCarloHistory}
                        simuladoRows={simuladoRows}
                        unit={unit}
                        minScore={minScore}
                        maxScore={maxScore}
                    />
                )}
            </div>
        </ErrorBoundary>
    );
}
