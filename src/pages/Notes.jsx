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

    // DATA-INTEGRITY-FIX: Reconstruct categories history by merging 'simuladoRows' (topics) 
    // with existing 'history' (aggregates) to ensure no data is hidden.
    const enhancedCategories = useMemo(() => {
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
                const dateKey = getDateKey(new Date(r.createdAt));
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
            
            // 3. MERGE LOGIC: Rebuild history using existing entries as anchor, 
            // but enriching them with topics from rowsByDate.
            // If an entry exists in history but not in rowsByDate, keep it as "Geral".
            // If an entry exists in rowsByDate but not in history, add it.
            
            const mergedHistoryMap = {};

            // Add from existing history first
            existingHistory.forEach(h => {
                const dateKey = getDateKey(new Date(h.date));
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
                    // Enrich existing entry with topics if missing or update them
                    // We prioritize the rowsByDate topics as they are the source of truth for breakdowns
                    mergedHistoryMap[dateKey].topics = topics;
                } else {
                    // New entry found in rows but missing in history
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
                .sort((a, b) => new Date(a.date) - new Date(b.date));

            cat.simuladoStats.history = rebuiltHistory.slice(-50);
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
