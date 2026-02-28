import React from 'react';
import SimuladoAnalysis from '../components/SimuladoAnalysis';
import { useAppStore } from '../store/useAppStore';
import { useToast } from '../hooks/useToast';
import { normalize, aliases } from '../utils/normalization';
import { useGamification } from '../hooks/useGamification';

export default function Simulados() {
    const data = useAppStore(state => state.appState.contests[state.appState.activeId]);
    const setData = useAppStore(state => state.setData);
    const showToast = useToast();
    const { applyGamification } = useGamification(showToast);

    const rawTodayRows = (data.simuladoRows || []).filter(
        r => r.createdAt && new Date(r.createdAt).toDateString() === new Date().toDateString()
    );

    // 1. Build the auto-synced rows combined with saved data
    const displayRows = [];
    const savedAutoRows = {};

    rawTodayRows.forEach(r => {
        if (r.isAuto) {
            const key = `${normalize(r.subject)}-${normalize(r.topic)}`;
            savedAutoRows[key] = r;
        }
    });

    let autoIdCounter = 0;

    // Auto-populate from categories (PERFECT MIRROR)
    (data.categories || []).forEach(cat => {
        const tasks = cat.tasks || [];

        if (tasks.length === 0) {
            // Handle subjects without tasks (like ETI) by adding a "Geral" row
            const subjNorm = normalize(cat.name);
            const topicNorm = normalize('nenhum');
            const key = `${subjNorm}-${topicNorm}`;

            if (savedAutoRows[key]) {
                displayRows.push(savedAutoRows[key]);
            } else {
                displayRows.push({
                    id: `auto-${cat.id}-fallback-${autoIdCounter++}`,
                    subject: cat.name,
                    topic: 'nenhum',
                    correct: 0,
                    total: 0,
                    isAuto: true
                });
            }
        } else {
            tasks.forEach(task => {
                const subjNorm = normalize(cat.name);
                const title = String(task.title || task.text || '').trim();
                const topicNorm = normalize(title);

                if (!title) return;

                const key = `${subjNorm}-${topicNorm}`;

                if (savedAutoRows[key]) {
                    displayRows.push(savedAutoRows[key]);
                } else {
                    displayRows.push({
                        id: `auto-${cat.id}-${task.id}-${autoIdCounter++}`,
                        subject: cat.name,
                        topic: title,
                        correct: 0,
                        total: 0,
                        isAuto: true
                    });
                }
            });
        }
    });

    // manual rows are no longer supported

    const handleUpdateSimuladoRows = (updatedTodayRows) => {
        const today = new Date().toDateString();
        setData(prev => {
            const existingRows = prev.simuladoRows || [];
            const nonTodayRows = existingRows.filter(row => !row.createdAt || new Date(row.createdAt).toDateString() !== today);

            // 2. Filter out untouched auto-generated rows to save space
            const validRowsToSave = updatedTodayRows.filter(r => {
                const hasScore = parseInt(r.total) > 0 || parseInt(r.correct) > 0;
                return r.isAuto && hasScore;
            }).map(row => ({
                ...row,
                createdAt: row.createdAt || Date.now()
            }));

            return { ...prev, simuladoRows: [...nonTodayRows, ...validRowsToSave] };
        });
    };

    const handleSimuladoAnalysis = (payload) => {
        setData(prev => {
            const analysisResult = payload.analysis || payload;
            const rawRows = payload.rawRows || [];
            const newCategories = [...prev.categories];

            analysisResult.disciplines.forEach(disc => {
                const discName = normalize(disc.name);
                let catIndex = newCategories.findIndex(c => normalize(c.name) === discName);
                if (catIndex === -1) {
                    catIndex = newCategories.findIndex(c => aliases[normalize(c.name)]?.some(a => normalize(a) === discName));
                }

                if (catIndex !== -1) {
                    const category = newCategories[catIndex];
                    const currentStats = category.simuladoStats || { history: [], average: 0 };

                    // Match topics logic
                    const validTopics = (disc.topics || disc.worstTopics || []).filter(t => category.tasks?.some(task => normalize(task.title || task.text) === normalize(t.name)));

                    let totalQ = 0, totalC = 0;
                    if (validTopics.length > 0) {
                        totalQ = validTopics.reduce((acc, t) => acc + (parseInt(t.total) || 0), 0);
                        totalC = validTopics.reduce((acc, t) => acc + (parseInt(t.correct) || 0), 0);
                    } else {
                        const subjectRows = rawRows.filter(r => normalize(r.subject || r.discipline) === discName);
                        totalQ = subjectRows.reduce((acc, r) => acc + (parseInt(r.total) || 0), 0);
                        totalC = subjectRows.reduce((acc, r) => acc + (parseInt(r.correct) || 0), 0);
                    }

                    // Don't log entirely empty subjects to history
                    if (totalQ > 0) {
                        const score = (totalC / totalQ) * 100;
                        const newHistory = [...(currentStats.history || []), { date: new Date().toISOString(), score, total: totalQ, correct: totalC, topics: validTopics }];

                        const grandTotalQ = newHistory.reduce((acc, h) => acc + Number(h.total || 0), 0);
                        const grandTotalC = newHistory.reduce((acc, h) => acc + Number(h.correct || 0), 0);
                        const newAverage = grandTotalQ > 0 ? (grandTotalC / grandTotalQ) * 100 : 0;

                        // FIX Bug 4: Robust Trend Detection using OLS Regression (Last 10 points)
                        const calculateTrend = (history) => {
                            if (!history || history.length < 3) return 'stable';
                            const data = history.slice(-10).map((h, i) => ({ x: i, y: h.score }));
                            const n = data.length;
                            const sumX = data.reduce((a, b) => a + b.x, 0);
                            const sumY = data.reduce((a, b) => a + b.y, 0);
                            const sumXX = data.reduce((a, b) => a + (b.x * b.x), 0);
                            const sumXY = data.reduce((a, b) => a + (b.x * b.y), 0);

                            const denom = (n * sumXX - (sumX * sumX));
                            if (denom === 0) return 'stable';
                            const slope = (n * sumXY - (sumX * sumY)) / denom;

                            // Simplified Significance Test (T-stat > 1.5 for basic relevance in study patterns)
                            const intercept = (sumY - slope * sumX) / n;
                            const ssRes = data.reduce((a, b) => a + Math.pow(b.y - (slope * b.x + intercept), 2), 0);
                            const s2 = ssRes / (n - 2 || 1);
                            const seSlope = Math.sqrt(s2 / denom);
                            const tStat = Math.abs(slope / (seSlope || 0.001));

                            if (tStat > 1.5 && Math.abs(slope) > 0.5) {
                                return slope > 0 ? 'up' : 'down';
                            }
                            return 'stable';
                        };

                        const trend = calculateTrend(newHistory);

                        newCategories[catIndex] = {
                            ...category,
                            simuladoStats: { history: newHistory, average: newAverage, lastAttempt: score, trend, level: newAverage > 70 ? 'ALTO' : newAverage > 40 ? 'MÉDIO' : 'BAIXO' }
                        };
                    }
                }
            });

            // Persist the validated rows (only the ones filled out)
            const today = new Date().toDateString();
            const nonTodayRows = (prev.simuladoRows || []).filter(
                r => !r.createdAt || new Date(r.createdAt).toDateString() !== today
            );
            const now = Date.now();
            const validatedRows = [
                ...nonTodayRows,
                ...rawRows
                    .filter(r => r.subject && r.topic && parseInt(r.total) > 0)
                    .map(r => ({
                        ...r,
                        createdAt: r.createdAt || now,
                        validated: true
                    }))
            ];

            return {
                ...prev,
                categories: newCategories,
                simuladoRows: validatedRows
            };
        });

        showToast('Simulado Processado! +500 XP 📈', 'success');
        // Then award XP via store action (which handles events cleanly)
        useAppStore.getState().awardExperience(500);
    };

    return (
        <SimuladoAnalysis
            rows={displayRows}
            onRowsChange={handleUpdateSimuladoRows}
            onAnalysisComplete={handleSimuladoAnalysis}
            categories={data.categories || []}
        />
    );
}
