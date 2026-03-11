import React from 'react';
import SimuladoAnalysis from '../components/SimuladoAnalysis';
import { useAppStore } from '../store/useAppStore';
import { useToast } from '../hooks/useToast';
import { normalize, aliases } from '../utils/normalization';
import { computeCategoryStats } from '../engine';
import { getDateKey } from '../utils/dateHelper';

export default function Simulados() {
    const data = useAppStore(state => state.appState.contests[state.appState.activeId]);
    const setData = useAppStore(state => state.setData);
    const showToast = useToast();

    // C-01 FIX: usar data local em vez de toISOString (UTC).
    // Em UTC-4 às 21h, toISOString retornava o dia seguinte.
    const todayKey = getDateKey(new Date());
    const rawTodayRows = (data.simuladoRows || []).filter(
        r => r.createdAt && getDateKey(new Date(r.createdAt)) === todayKey
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
        const todayKey = getDateKey(new Date());
        setData(prev => {
            const existingRows = prev.simuladoRows || [];
            const nonTodayRows = existingRows.filter(row => !row.createdAt || getDateKey(new Date(row.createdAt)) !== todayKey);

            // 2. Filter out untouched auto-generated rows to save space
            // BUG FIX: preserve the 'validated' field
            const validRowsToSave = updatedTodayRows.filter(r => {
                const hasScore = parseInt(r.total, 10) > 0 || parseInt(r.correct, 10) > 0;
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
                        totalQ = validTopics.reduce((acc, t) => acc + (parseInt(t.total, 10) || 0), 0);
                        totalC = validTopics.reduce((acc, t) => acc + (parseInt(t.correct, 10) || 0), 0);
                    } else {
                        const subjectRows = rawRows.filter(r => normalize(r.subject || r.discipline) === discName);
                        totalQ = subjectRows.reduce((acc, r) => acc + (parseInt(r.total, 10) || 0), 0);
                        totalC = subjectRows.reduce((acc, r) => acc + (parseInt(r.correct, 10) || 0), 0);
                    }

                    // Don't log entirely empty subjects to history
                    if (totalQ > 0) {
                        const d = new Date();
                        const localNow = d.toISOString();
                        const historyPoints = [...(currentStats.history || []), { date: localNow, score: (totalC / totalQ) * 100, total: totalQ, correct: totalC, topics: validTopics }];

                        // BUG-06 FIX: Use centralized engine logic for trend and averages
                        const stats = computeCategoryStats(historyPoints, category.weight || 1);

                        if (stats) {
                            newCategories[catIndex] = {
                                ...category,
                                simuladoStats: {
                                    history: historyPoints,
                                    average: stats.mean,
                                    lastAttempt: (totalC / totalQ) * 100,
                                    trend: stats.trend,
                                    level: stats.mean > 70 ? 'ALTO' : stats.mean > 40 ? 'MÉDIO' : 'BAIXO'
                                }
                            };
                        }
                    }
                }
            });

            // Persist the validated rows (only the ones filled out)
            // Fix 5: Cap to 300 to prevent Firestore 1MB document limit overflow
            // DEFINITIVE FIX: direct upsert of rawRows as validated
            // Skip fragile matching, just stamp and append to non-today data
            // C-02 FIX: mesma correção de timezone
            const todayKey2 = getDateKey(new Date());
            const nonTodayRows = (prev.simuladoRows || []).filter(
                r => !r.createdAt || getDateKey(new Date(r.createdAt)) !== todayKey2
            );

            const now = Date.now();
            const validatedRows = [
                ...nonTodayRows,
                ...rawRows
                    .filter(r => r.subject && r.topic && parseInt(r.total, 10) > 0)
                    .map(r => ({
                        ...r,
                        createdAt: r.createdAt || now,
                        validated: true
                    }))
            ].slice(-300); // keep most recent 300 rows

            return {
                ...prev,
                categories: newCategories,
                simuladoRows: validatedRows
            };
        }, false); // BUG-04 FIX: don't record history here, awardExperience will handle the one and only snapshot.

        const updatedCount = payload.analysis?.disciplines?.length || payload.disciplines?.length || 0;
        if (updatedCount > 0) {
            showToast('Simulado Processado! +500 XP 📈', 'success');
            // Then award XP via store action (which handles events cleanly)
            useAppStore.getState().awardExperience(500);
        } else {
            showToast('Nenhuma disciplina nova detectada no simulado.', 'warning');
        }
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
