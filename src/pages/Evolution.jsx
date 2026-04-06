import React from 'react';
import EvolutionChart from '../components/EvolutionChart';
import ErrorBoundary from '../components/ErrorBoundary';
import { useAppStore } from '../store/useAppStore';

const EMPTY_ARRAY = [];

export default function Evolution() {
    // BUG-03 FIX: Stable references for fallbacks to prevent infinite loops in children
    const categories = useAppStore(state => state.appState.contests[state.appState.activeId]?.categories ?? EMPTY_ARRAY);
    const monteCarloHistory = useAppStore(state => state.appState.contests[state.appState.activeId]?.monteCarloHistory ?? EMPTY_ARRAY);
    const user = useAppStore(state => state.appState.contests[state.appState.activeId]?.user);

    return (
        <ErrorBoundary>
            <div className="animate-fade-in">
                <EvolutionChart
                    categories={categories}
                    targetScore={user?.targetProbability ?? 70}
                    goalDate={user?.goalDate}
                    monteCarloHistory={monteCarloHistory}
                />
            </div>
        </ErrorBoundary>
    );
}
