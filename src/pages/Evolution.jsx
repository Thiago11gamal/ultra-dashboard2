import React from 'react';
import EvolutionChart from '../components/EvolutionChart';
import ErrorBoundary from '../components/ErrorBoundary';
import { useAppStore } from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';

const EMPTY_ARRAY = [];

export default function Evolution() {
    // 🎯 PERFORMANCE FIX: Granular selectors with useShallow.
    // Previne re-renders pesados quando o Pomodoro ou outros dados do contest mudam mas não afetam o gráfico.
    const { categories, studyLogs, monteCarloHistory, user, unit, minScore, maxScore } = useAppStore(
        useShallow(state => {
            const contests = state?.appState?.contests || {};
            const activeId = state?.appState?.activeId;
            const contest = contests[activeId] || {};
            return {
                categories: contest.categories ?? EMPTY_ARRAY,
                studyLogs: contest.studyLogs ?? EMPTY_ARRAY,
                monteCarloHistory: contest.monteCarloHistory ?? EMPTY_ARRAY,
                user: contest.user,
                unit: contest.unit || '%',
                minScore: contest.minScore ?? 0,
                maxScore: contest.maxScore ?? 100
            };
        })
    );


    return (
        <ErrorBoundary>
            <div className="animate-fade-in">
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
            </div>
        </ErrorBoundary>
    );
}
