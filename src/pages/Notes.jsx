import React, { useMemo } from 'react';
import TopicPerformance from '../components/TopicPerformance';
import ParetoAnalysis from '../components/ParetoAnalysis';
import { useAppStore } from '../store/useAppStore';
import { normalize, aliases } from '../utils/normalization';
import { getDateKey } from '../utils/dateHelper';

export default function Notes() {
    const activeContest = useAppStore(state => state.appState.contests[state.appState.activeId]);
    const categories = activeContest?.categories || [];
    const simuladoRows = activeContest?.simuladoRows || [];

    // DATA-FIX: Reconstruct categories history to include topics from simuladoRows
    // This makes the existing charts display the missing data immediately.
    const enhancedCategories = useMemo(() => {
        if (!categories.length) return [];

        // Clone to avoid mutating store references
        const newCats = JSON.parse(JSON.stringify(categories));

        newCats.forEach(cat => {
            const catNorm = normalize(cat.name);
            const catAliases = aliases[catNorm] || [];
            
            // Find all rows belonging to this category (including aliases)
            const myRows = simuladoRows.filter(r => {
                const subNorm = normalize(r.subject);
                return subNorm === catNorm || catAliases.some(a => normalize(a) === subNorm);
            });

            if (myRows.length > 0) {
                // Group myRows by date
                const rowsByDate = {};
                myRows.forEach(r => {
                    const dateKey = getDateKey(new Date(r.createdAt));
                    if (!rowsByDate[dateKey]) rowsByDate[dateKey] = [];
                    rowsByDate[dateKey].push({
                        name: r.topic || 'Geral',
                        correct: parseInt(r.correct, 10) || 0,
                        total: parseInt(r.total, 10) || 0
                    });
                });

                // Ensure cat.simuladoStats.history reflects these topics
                if (!cat.simuladoStats) {
                    cat.simuladoStats = { history: [], average: 0, lastAttempt: 0, trend: 'stable', level: 'BAIXO' };
                }

                // If history only has aggregated totals (common case), we "flesh it out" with the topics
                // or we rebuild it from rows if history is empty.
                const history = cat.simuladoStats.history || [];
                
                // Rebuild history based on rows if it's simpler or if history is missing topic detail
                const rebuiltHistory = Object.entries(rowsByDate).map(([date, topics]) => {
                    const totalC = topics.reduce((s, t) => s + t.correct, 0);
                    const totalQ = topics.reduce((s, t) => s + t.total, 0);
                    return {
                        date,
                        correct: totalC,
                        total: totalQ,
                        score: totalQ > 0 ? (totalC / totalQ) * 100 : 0,
                        topics
                    };
                }).sort((a, b) => new Date(a.date) - new Date(b.date));

                cat.simuladoStats.history = rebuiltHistory.slice(-50);
            }
        });

        return newCats;
    }, [categories, simuladoRows]);

    return (
        <div className="h-full min-h-[500px] grid grid-cols-1 lg:grid-cols-2 gap-8">
            <TopicPerformance categories={enhancedCategories} />
            <ParetoAnalysis categories={enhancedCategories} />
        </div>
    );
}
