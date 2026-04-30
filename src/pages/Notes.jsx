import { PageErrorBoundary } from '../components/ErrorBoundary';
import React, { useMemo } from 'react';
import TopicPerformance from '../components/TopicPerformance';
import ParetoAnalysis from '../components/ParetoAnalysis';
import { useAppStore } from '../store/useAppStore';
import { normalize, aliases } from '../utils/normalization';
import { getDateKey } from '../utils/dateHelper';

export default function Notes() {
    const activeContest = useAppStore(state => state.appState.contests[state.appState.activeId]);
    
    // FIX: Evitamos recriar o array `|| []` em cada renderização para não quebrar a memoização do useMemo
    const categoriesRaw = activeContest?.categories;
    const simuladoRowsRaw = activeContest?.simuladoRows;

    // DATA-INTEGRITY-FIX: Reconstruct categories history by merging 'simuladoRows' (topics) 
    // with existing 'history' (aggregates) to ensure no data is hidden.
    const enhancedCategories = useMemo(() => {
        const categories = categoriesRaw || [];
        const simuladoRows = simuladoRowsRaw || [];
        
        if (!categories.length) return [];

        // Clone to avoid mutating store references
        const newCats = JSON.parse(JSON.stringify(categories));

        newCats.forEach(cat => {
            const catNorm = normalize(cat.name);
            const catAliases = aliases[catNorm] || [];
            
            // 1. Group ALL simuladoRows for this category by date
            const myRows = simuladoRows.filter(r => {
                const subNorm = normalize(r.subject);
                return subNorm === catNorm || catAliases.some(a => normalize(a) === subNorm);
            });

            const rowsByDate = {};
            myRows.forEach(r => {
                const dateKey = getDateKey(r.date || r.createdAt);
                if (!rowsByDate[dateKey]) rowsByDate[dateKey] = [];
                rowsByDate[dateKey].push({
                    name: r.topic || 'Geral',
                    correct: parseInt(r.correct, 10) || 0,
                    total: parseInt(r.total, 10) || 0
                });
            });

            // 2. Ensure cat.simuladoStats.history exists
            if (!cat.simuladoStats) {
                cat.simuladoStats = { history: [], average: 0, lastAttempt: 0, trend: 'stable', level: 'BAIXO' };
            }

            const existingHistory = cat.simuladoStats.history || [];
            
            const mergedHistoryMap = {};

            // Add from existing history first
            existingHistory.forEach(h => {
                // FIX: Passar h.date diretamente (já é YYYY-MM-DD do store)
                const dateKey = getDateKey(h.date);
                mergedHistoryMap[dateKey] = {
                    date: dateKey,
                    correct: h.correct,
                    total: h.total,
                    score: h.score,
                    topics: h.topics || [] 
                };
            });

            // Overlay or add from rowsByDate
            Object.entries(rowsByDate).forEach(([dateKey, topics]) => {
                const totalC = topics.reduce((s, t) => s + t.correct, 0);
                const totalQ = topics.reduce((s, t) => s + t.total, 0);

                if (mergedHistoryMap[dateKey]) {
                    mergedHistoryMap[dateKey].topics = topics;
                } else {
                    mergedHistoryMap[dateKey] = {
                        date: dateKey,
                        correct: totalC,
                        total: totalQ,
                        score: totalQ > 0 ? (totalC / totalQ) * 100 : 0,
                        topics: topics
                    };
                }
            });

            // 4. Cleanup: If an entry still has no topics, add a "Geral" topic
            Object.values(mergedHistoryMap).forEach(h => {
                if (!h.topics || h.topics.length === 0) {
                    h.topics = [{
                        name: 'Geral',
                        correct: h.correct,
                        total: h.total
                    }];
                }
            });

            const rebuiltHistory = Object.values(mergedHistoryMap)
                .sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0); // FIX: String compare safe for YYYY-MM-DD

            cat.simuladoStats.history = rebuiltHistory.slice(-50);
        });

        return newCats;
    }, [categoriesRaw, simuladoRowsRaw]);

    const maxScore = useMemo(() => {
        const scores = enhancedCategories.map(c => c.maxScore).filter(s => typeof s === 'number' && s > 0);
        return scores.length > 0 ? Math.max(...scores) : 100;
    }, [enhancedCategories]);

    return (<PageErrorBoundary pageName="Notas">
        <div className="h-full min-h-[500px] grid grid-cols-1 lg:grid-cols-2 gap-8">
            <TopicPerformance categories={enhancedCategories} maxScore={maxScore} />
            <ParetoAnalysis categories={enhancedCategories} maxScore={maxScore} />
        </div>
    </PageErrorBoundary>);
}
