import React from 'react';
import EvolutionChart from '../components/EvolutionChart';
import ErrorBoundary from '../components/ErrorBoundary';
import { useAppStore } from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';

const EMPTY_ARRAY = [];

export default function Evolution() {
    // 🎯 PERFORMANCE FIX: Granular selectors with useShallow.
    // Previne re-renders pesados quando o Pomodoro ou outros dados do contest mudam mas não afetam o gráfico.
    const { categories, rawStudyLogs, monteCarloHistory, user, unit, minScore, maxScore } = useAppStore(
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
                maxScore: contest.maxScore ?? 100
            };
        })
    );

    const studyLogs = React.useMemo(() => {
        return Array.isArray(rawStudyLogs) ? rawStudyLogs : Object.values(rawStudyLogs || {});
    }, [rawStudyLogs]);

    const hasEvolutionData = Array.isArray(categories) && categories.some(category => Array.isArray(category?.simuladoStats?.history) && category.simuladoStats.history.length > 0);

    return (
        <ErrorBoundary>
            <div className="animate-fade-in">
                {!hasEvolutionData ? (
                    <div className="flex items-center justify-center min-h-[30vh]">
                        <div className="text-center text-slate-400">
                            <p className="font-bold uppercase tracking-wider text-xs">Sem histórico de simulados</p>
                            <p className="text-[11px] text-slate-500 mt-1">Registre simulados nas disciplinas para visualizar a evolução.</p>
                        </div>
                    </div>
                ) : (
                    <EvolutionChart
                        categories={categories}
                        studyLogs={studyLogs}
                        targetScore={user?.targetProbability ?? 70}
                        goalDate={user?.goalDate}
                        monteCarloHistory={monteCarloHistory}
                        unit={unit}
                        minScore={minScore}
                        maxScore={maxScore}
                    />
                )}
            </div>
        </ErrorBoundary>
    );
}
