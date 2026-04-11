import React from 'react';
import EvolutionChart from '../components/EvolutionChart';
import ErrorBoundary from '../components/ErrorBoundary';
import { useAppStore } from '../store/useAppStore';

const EMPTY_ARRAY = [];

export default function Evolution() {
    // BUG-03 FIX: Stable references for fallbacks to prevent infinite loops in children
    const contest = useAppStore(state => state.appState.contests[state.appState.activeId]);
    const categories = contest?.categories ?? EMPTY_ARRAY;
    const monteCarloHistory = contest?.monteCarloHistory ?? EMPTY_ARRAY;
    const user = contest?.user;

    // SCALE-BOUNDS: use dynamic bounds from contest config
    const unit = contest?.unit || '%';
    const minScore = contest?.minScore ?? 0;
    const maxScore = contest?.maxScore ?? 100;

    return (
        <ErrorBoundary>
            <div className="animate-fade-in">
                <EvolutionChart
                    categories={categories}
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
