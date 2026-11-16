import { PageErrorBoundary } from '../components/ErrorBoundary';
import React, { useMemo } from 'react';
import TopicPerformance from '../components/TopicPerformance';
import ParetoAnalysis from '../components/ParetoAnalysis';
import { useAppStore } from '../store/useAppStore';
import { reconcileContestCategoriesHistory } from '../utils/simuladoReconciler';

export default function Notes() {
    const activeContest = useAppStore(state => state.appState?.contests?.[state.appState?.activeId] || null);
    
    // FIX: Evitamos recriar o array `|| []` em cada renderização para não quebrar a memoização do useMemo
    const categoriesRaw = activeContest?.categories;
    const simuladoRowsRaw = activeContest?.simuladoRows;
    const contestMaxScore = activeContest?.maxScore;
    const contestMinScore = activeContest?.minScore;

    // DATA-INTEGRITY-FIX: Reconstruct categories history by merging 'simuladoRows' (topics) 
    // with existing 'history' (aggregates) via shared pure reconciler.
    const enhancedCategories = useMemo(
        () => reconcileContestCategoriesHistory(categoriesRaw, simuladoRowsRaw, contestMaxScore, contestMinScore),
        [categoriesRaw, simuladoRowsRaw, contestMaxScore, contestMinScore]
    );

    const maxScore = useMemo(() => {
        const scores = enhancedCategories
            .map(c => Number(c?.maxScore))
            .filter(s => Number.isFinite(s) && s > 0);
        if (scores.length === 0) return 100;
        return Math.max(...scores);
    }, [enhancedCategories]);

    return (<PageErrorBoundary pageName="Notas">
        <div className="h-full min-h-[500px] grid grid-cols-1 lg:grid-cols-2 gap-8">
            <TopicPerformance categories={enhancedCategories} maxScore={maxScore} />
            <ParetoAnalysis categories={enhancedCategories} maxScore={maxScore} />
        </div>
    </PageErrorBoundary>);
}

