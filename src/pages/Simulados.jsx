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
    const manualRows = [];

    rawTodayRows.forEach(r => {
        if (r.isAuto) {
            const key = `${normalize(r.subject)}-${normalize(r.topic)}`;
            savedAutoRows[key] = r;
        } else {
            manualRows.push(r);
        }
    });

    let autoIdCounter = 0;

    // Auto-populate from categories
    (data.categories || []).forEach(cat => {
        (cat.tasks || []).forEach(task => {
            const subjNorm = normalize(cat.name);
            const title = String(task.title || task.text || '').trim();
            const topicNorm = normalize(title);

            if (!title) return; // Skip empty tasks

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
    });

    // Add manual rows
    displayRows.push(...manualRows);

    if (displayRows.length === 0) {
        displayRows.push({ id: `row-init-0`, subject: '', topic: '', correct: 0, total: 0 });
    }

    const handleUpdateSimuladoRows = (updatedTodayRows) => {
        const today = new Date().toDateString();
        setData(prev => {
            const existingRows = prev.simuladoRows || [];
            const nonTodayRows = existingRows.filter(row => !row.createdAt || new Date(row.createdAt).toDateString() !== today);

            // 2. Filter out untouched auto-generated rows to save space
            const validRowsToSave = updatedTodayRows.filter(r => {
                const hasScore = parseInt(r.total) > 0 || parseInt(r.correct) > 0;
                if (r.isAuto) {
                    return hasScore;
                }
                return true; // Keep manual rows while typing
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

                        const grandTotalQ = newHistory.reduce((acc, h) => acc + h.total, 0);
                        const grandTotalC = newHistory.reduce((acc, h) => acc + h.correct, 0);
                        const newAverage = grandTotalQ > 0 ? (grandTotalC / grandTotalQ) * 100 : 0;

                        let trend = 'stable';
                        if (newHistory.length >= 2) {
                            const last = newHistory[newHistory.length - 1].score;
                            const prevS = newHistory[newHistory.length - 2].score;
                            trend = last > prevS ? 'up' : last < prevS ? 'down' : 'stable';
                        }

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

            showToast('Simulado Processado! +500 XP 📈', 'success');
            return applyGamification({ ...prev, categories: newCategories, simuladoRows: validatedRows }, 500);
        });
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
