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

// Helper para merge de tópicos
const mergeTopics = (oldTopics = [], incomingTopics = []) => {
  const safeOld = Array.isArray(oldTopics)
    ? oldTopics
    : Object.values(oldTopics || {});

  const safeIncoming = Array.isArray(incomingTopics)
    ? incomingTopics
    : Object.values(incomingTopics || {});

  const map = new Map();

  [...safeOld, ...safeIncoming].forEach(topic => {
    const name = String(topic?.name ?? topic?.topic ?? topic ?? '').trim();
    if (!name) return;

    const key = normalize(name);

    const prev = map.get(key) || {
      name,
      correct: 0,
      total: 0,
      score: topic?.score,
      isPercentage: !!topic?.isPercentage
    };

    prev.correct += Math.max(0, Number(topic?.correct) || 0);
    prev.total += Math.max(0, Number(topic?.total) || 0);

    map.set(key, prev);
  });

  return [...map.values()];
};

export default function Notes() {
    const activeContest = useAppStore(state => state.appState.contests[state.appState.activeId]);
    
    // FIX: Evitamos recriar o array `|| []` em cada renderização para não quebrar a memoização do useMemo
    const categoriesRaw = activeContest?.categories;
    const simuladoRowsRaw = activeContest?.simuladoRows;
    const contestMaxScore = activeContest?.maxScore;
    const contestMinScore = activeContest?.minScore;

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
                    isPercentage: !!h.isPercentage,
                    topics: Array.isArray(h.topics) ? h.topics : Object.values(h.topics || {})
                };
            });

            // Overlay or add from rowsByDate
            const catMax = Number(cat.maxScore) || Number(contestMaxScore) || 100;
            const catMin = Number.isFinite(Number(cat.minScore))
                ? Number(cat.minScore)
                : (Number.isFinite(Number(contestMinScore)) ? Number(contestMinScore) : 0);
            const catRange = Math.max(1e-9, catMax - catMin);

            Object.entries(rowsByDate).forEach(([dateKey, topics]) => {
                const totalC = topics.reduce((s, t) => s + t.correct, 0);
                const totalQ = topics.reduce((s, t) => s + t.total, 0);
                const calcScore = totalQ > 0 ? catMin + (totalC / totalQ) * catRange : catMin;

                if (!mergedHistoryMap[dateKey]) {
                    mergedHistoryMap[dateKey] = {
                        date: dateKey,
                        correct: 0,
                        total: 0,
                        score: catMin,
                        isPercentage: false,
                        topics: []
                    };
                }

                const entry = mergedHistoryMap[dateKey];
                entry.topics = mergeTopics(entry.topics, topics);
                const combinedC = entry.topics.reduce((s, t) => s + (Number(t.correct) || 0), 0);
                const combinedQ = entry.topics.reduce((s, t) => s + (Number(t.total) || 0), 0);

                entry.correct = combinedQ > 0 ? combinedC : (entry.correct + Math.max(0, Number(totalC) || 0));
                entry.total = combinedQ > 0 ? combinedQ : (entry.total + Math.max(0, Number(totalQ) || 0));
                entry.score = entry.total > 0
                    ? catMin + (entry.correct / entry.total) * catRange
                    : calcScore;
                entry.isPercentage = false;
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
    }, [categoriesRaw, simuladoRowsRaw, contestMaxScore, contestMinScore]);

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

