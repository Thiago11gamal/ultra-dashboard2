import React from 'react';
import EvolutionChart from '../components/EvolutionChart';
import ErrorBoundary from '../components/ErrorBoundary';
import { useAppStore } from '../store/useAppStore';

export default function Evolution() {
    // BUG-03 FIX: Optional chaining para evitar TypeError quando activeId é null/undefined
    const categories = useAppStore(state => state.appState.contests[state.appState.activeId]?.categories ?? []);
    const monteCarloHistory = useAppStore(state => state.appState.contests[state.appState.activeId]?.monteCarloHistory ?? []);
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
