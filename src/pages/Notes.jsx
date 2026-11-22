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
    const contestMaxScore = activeContest?.maxScore ?? activeContest?.settings?.maxScore;
    const contestMinScore = activeContest?.minScore ?? activeContest?.settings?.minScore;
    const contestPenaltyPerWrong = activeContest?.penaltyPerWrong ?? activeContest?.settings?.penaltyPerWrong;

    // DATA-INTEGRITY-FIX: Reconstruct categories history by merging 'simuladoRows' (topics) 
    // with existing 'history' (aggregates) via shared pure reconciler.
    const enhancedCategories = useMemo(
        () => reconcileContestCategoriesHistory(
            categoriesRaw,
            simuladoRowsRaw,
            contestMaxScore,
            contestMinScore,
            { penaltyPerWrong: contestPenaltyPerWrong }
        ),
        [categoriesRaw, simuladoRowsRaw, contestMaxScore, contestMinScore, contestPenaltyPerWrong]
    );

    const maxScore = useMemo(() => {
        const parsedContestMax = Number(contestMaxScore);
        if (contestMaxScore !== null && contestMaxScore !== undefined && String(contestMaxScore).trim() !== '' && Number.isFinite(parsedContestMax) && parsedContestMax > 0) {
            return parsedContestMax;
        }
        const scores = enhancedCategories
            .map(c => Number(c?.maxScore))
            .filter(s => Number.isFinite(s) && s > 0);
        return scores.length > 0 ? Math.max(...scores) : 100;
    }, [enhancedCategories, contestMaxScore]);

    const minScore = useMemo(() => {
        const hasContestMin =
            contestMinScore !== null &&
            contestMinScore !== undefined &&
            typeof contestMinScore !== 'boolean' &&
            String(contestMinScore).trim() !== '' &&
            Number.isFinite(Number(contestMinScore));
        if (hasContestMin) return Number(contestMinScore);
        const catMins = enhancedCategories
            .map(c => c?.minScore)
            .filter(v => v !== null && v !== undefined && typeof v !== 'boolean' && String(v).trim() !== '' && Number.isFinite(Number(v)))
            .map(Number);
        return catMins.length > 0 ? Math.min(...catMins) : 0;
    }, [enhancedCategories, contestMinScore]);

    return (<PageErrorBoundary pageName="Notas">
        <div className="h-full min-h-[500px] grid grid-cols-1 lg:grid-cols-2 gap-8">
            <TopicPerformance categories={enhancedCategories} maxScore={maxScore} minScore={minScore} />
            <ParetoAnalysis categories={enhancedCategories} maxScore={maxScore} minScore={minScore} />
        </div>
    </PageErrorBoundary>);
}

