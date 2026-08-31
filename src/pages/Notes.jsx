import { PageErrorBoundary } from '../components/ErrorBoundary';
import { safeClone } from '../utils/safeClone.js';
import React, { useMemo } from 'react';
import TopicPerformance from '../components/TopicPerformance';
import ParetoAnalysis from '../components/ParetoAnalysis';
import { useAppStore } from '../store/useAppStore';
import { normalize, aliases } from '../utils/normalization';
import { getDateKey, toDateMs } from '../utils/dateHelper';

// FIX N-01: getDateKey pode retornar null/undefined para datas inválidas.
// Wrapper seguro que descarta chaves vazias antes de usar como chave de mapa.
const safeDateKey = (raw) => {
  const key = getDateKey(raw);
  return key && typeof key === 'string' && key.trim() !== '' ? key : null;
};

export default function Notes() {
    const activeContest = useAppStore(state => state.appState.contests[state.appState.activeId]);
    
    // FIX: Evitamos recriar o array `|| []` em cada renderização para não quebrar a memoização do useMemo
    const categoriesRaw = activeContest?.categories;
    const simuladoRowsRaw = activeContest?.simuladoRows;

    // DATA-INTEGRITY-FIX: Reconstruct categories history by merging 'simuladoRows' (topics) 
    // with existing 'history' (aggregates) to ensure no data is hidden.
    const enhancedCategories = useMemo(() => {
        const categories = Array.isArray(categoriesRaw) ? categoriesRaw : Object.values(categoriesRaw || {});
        const simuladoRows = Array.isArray(simuladoRowsRaw) ? simuladoRowsRaw : Object.values(simuladoRowsRaw || {});
        
        if (!categories.length) return [];

        // FIX N-02: safeClone pode retornar null para valores com funções/DOM.
        // Fallback para map raso se o clone profundo falhar.
        let newCats;
        try {
            newCats = safeClone(categories, null);
            if (!Array.isArray(newCats)) newCats = categories.map(c => ({ ...c }));
        } catch {
            newCats = categories.map(c => ({ ...c }));
        }

        newCats.forEach(cat => {
            const catNorm = normalize(cat.name);
            const catAliases = aliases[catNorm] || [];
            
            // BUG-FIX: Correspondência usava apenas normalização de nome (frágil).
            // Adicionado categoryId como defesa primária, espelhando schemas.js repairContestHistory.
            const myRows = simuladoRows.filter(r => {
                if (r?.categoryId && r.categoryId === cat.id) return true;
                const subNorm = normalize(r?.subject);
                if (!subNorm) return false;
                return subNorm === catNorm || catAliases.some(a => normalize(a) === subNorm);
            });

            const rowsByDate = {};
            myRows.forEach(r => {
                const dateKey = safeDateKey(r.date || r.createdAt);
                if (!dateKey) return;
                if (!rowsByDate[dateKey]) rowsByDate[dateKey] = [];
                
                const rowTotal = Math.max(0, Number(r.total) || 0);
                const rowCorrect = Math.min(rowTotal, Math.max(0, Number(r.correct) || 0));

                rowsByDate[dateKey].push({
                    name: r.topic || 'Geral',
                    correct: rowCorrect,
                    total: rowTotal,
                    score: r.score,
                    isPercentage: r.isPercentage
                });
            });

            const existingStats = cat.simuladoStats || {};
            const existingHistoryRaw = existingStats.history;

            const existingHistory = Array.isArray(existingHistoryRaw)
                ? existingHistoryRaw
                : Object.values(existingHistoryRaw || {});
            
            const mergedHistoryMap = {};

            // Add from existing history first
            existingHistory.forEach(h => {
                const dateKey = safeDateKey(h?.date);
                if (!dateKey) return;
                mergedHistoryMap[dateKey] = {
                    date: dateKey,
                    correct: h.correct,
                    total: h.total,
                    score: h.score,
                    topics: Array.isArray(h.topics) ? h.topics : Object.values(h.topics || {})
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
                        score: totalQ > 0 ? (totalC / totalQ) * (Number(cat.maxScore) || 100) : 0,
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
                        total: h.total,
                        score: h.score,
                        isPercentage: h.isPercentage
                    }];
                }
            });

            const rebuiltHistory = Object.values(mergedHistoryMap)
                .sort((a, b) => toDateMs(a?.date) - toDateMs(b?.date))
                .slice(-50);

            cat.simuladoStats = {
                ...existingStats,
                history: rebuiltHistory
            };
        });

        return newCats;
    }, [categoriesRaw, simuladoRowsRaw]);

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

