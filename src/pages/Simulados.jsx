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

    // BUG-11/20 FIX: Guarda de segurança contra estado vazio
    if (!data || !data.categories) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
                <p className="text-purple-300 font-mono animate-pulse">Sincronizando dados...</p>
            </div>
        );
    }

    // C-01 FIX: usar data local em vez de toISOString (UTC).
    // Em UTC-4 às 21h, toISOString retornava o dia seguinte.
    const todayKey = getDateKey(new Date());
    const rawTodayRows = (data.simuladoRows || []).filter(
        r => getDateKey(r.date || r.createdAt) === todayKey
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
            // BUGFIX CRITICO: Preservar dados importados via CSV no dia de hoje (isAuto falso).
            // Apenas deleta as rows autogeradas de hoje, pois elas serão substituídas pela UI atual.
            const rowsToKeep = existingRows.filter(row => 
                !(row.isAuto && getDateKey(row.date || row.createdAt) === todayKey)
            );

            // 2. Filter out untouched auto-generated rows to save space
            // BUG FIX: preserve the 'validated' field
            const validRowsToSave = updatedTodayRows.filter(r => {
                const hasScore = parseInt(r.total, 10) > 0 || parseInt(r.correct, 10) > 0;
                return hasScore;
            }).map(row => ({
                ...row,
                createdAt: row.createdAt || new Date().toISOString()
            }));

            return { ...prev, simuladoRows: [...rowsToKeep, ...validRowsToSave] };
        });
    };

    const handleSimuladoAnalysis = (payload) => {
        try {
            // Captura a contagem diretamente no callback, evitando leitura assíncrona de getState()
            let capturedCount = 0;

            setData(prev => {
                const analysisResult = payload.analysis || payload;
                const rawRows = payload.rawRows || [];

                const categoriesSource = Array.isArray(prev.categories) ? prev.categories : [];
                // Hardened deep clone
                let newCategories;
                try {
                    newCategories = JSON.parse(JSON.stringify(categoriesSource));
                } catch (e) {
                    console.error("Clone failed, using shallow copy", e);
                    newCategories = [...categoriesSource].map(c => ({ ...c }));
                }

                let totalProcessedDisciplines = 0;

                // BUG-07: Processamento unificado suportando tanto o formato 'disciplines' 
                // quanto o formato de objeto direto (para maior resiliência).
                const dataToProcess = analysisResult.disciplines || analysisResult;

                if (Array.isArray(dataToProcess)) {
                    // Formato de array (disciplines)
                    dataToProcess.forEach(disc => {
                        if (!disc || !disc.name) return;
                        const discNameNorm = normalize(disc.name);
                        let catIdx = newCategories.findIndex(c => c && c.name && normalize(c.name) === discNameNorm);
                        if (catIdx === -1) {
                            catIdx = newCategories.findIndex(c => 
                                c && c.name && aliases[normalize(c.name)]?.some(a => normalize(a) === discNameNorm)
                            );
                        }

                        if (catIdx !== -1) {
                            totalProcessedDisciplines++;
                            const cat = newCategories[catIdx];
                            if (!cat.simuladoStats) {
                                cat.simuladoStats = { history: [], average: 0, lastAttempt: 0, trend: 'stable', level: 'BAIXO' };
                            }

                            const history = Array.isArray(cat.simuladoStats.history) ? cat.simuladoStats.history : [];
                            const todayKey = getDateKey(new Date());
                            const filteredHistory = history.filter(h => h && h.date && getDateKey(new Date(h.date)) !== todayKey);
                            
                            const finalC = Number(disc.totalCorrect || 0);
                            const finalQ = Number(disc.totalQuestions || 0);

                            if (finalQ > 0) {
                                const maxScore = Number(cat.maxScore) || 100;
                                filteredHistory.push({
                                    date: getDateKey(new Date()),
                                    correct: finalC,
                                    total: finalQ,
                                    score: (finalC / finalQ) * maxScore,
                                    isPercentage: true,  // BUGFIX M1: flag inequívoca para getSafeScore
                                    topics: disc.topics || [] 
                                });

                                const statsResult = computeCategoryStats(filteredHistory, 1, 60, maxScore);
                                cat.simuladoStats = {
                                    ...cat.simuladoStats,
                                    history: filteredHistory.slice(-50),
                                    average: Number((statsResult?.mean || 0).toFixed(1)),
                                    trend: statsResult?.trend || 'stable',
                                    lastAttempt: (finalC / finalQ) * maxScore,
                                    level: statsResult?.level || (
                                        (statsResult?.mean || 0) > 0.7 * maxScore ? 'ALTO' : 
                                        (statsResult?.mean || 0) > 0.4 * maxScore ? 'MÉDIO' : 'BAIXO'
                                    )
                                };
                            }
                        }
                    });
                } else {
                    // Formato de objeto (rawSubject -> stats)
                    Object.entries(dataToProcess || {}).forEach(([rawSubject, stats]) => {
                        if (!rawSubject || !stats) return;
                        const discNameNorm = normalize(rawSubject);
                        let catIdx = newCategories.findIndex(c => c && c.name && normalize(c.name) === discNameNorm);
                        if (catIdx === -1) {
                            catIdx = newCategories.findIndex(c => 
                                c && c.name && aliases[normalize(c.name)]?.some(a => normalize(a) === discNameNorm)
                            );
                        }

                        if (catIdx !== -1) {
                            totalProcessedDisciplines++;
                            const cat = newCategories[catIdx];
                            if (!cat.simuladoStats) {
                                cat.simuladoStats = { history: [], average: 0, lastAttempt: 0, trend: 'stable', level: 'BAIXO' };
                            }

                            const history = Array.isArray(cat.simuladoStats.history) ? cat.simuladoStats.history : [];
                            const todayKey = getDateKey(new Date());
                            const filteredHistory = history.filter(h => h && h.date && getDateKey(new Date(h.date)) !== todayKey);
                            
                            const finalC = Number(stats.totalCorrect || 0);
                            const finalQ = Number(stats.totalQuestions || 0);

                            if (finalQ > 0) {
                                const maxScore = Number(cat.maxScore) || 100;
                                filteredHistory.push({
                                    date: getDateKey(new Date()),
                                    correct: finalC,
                                    total: finalQ,
                                    score: (finalC / finalQ) * maxScore,
                                    isPercentage: true,  // BUGFIX M1: flag inequívoca para getSafeScore
                                    topics: stats.topics || []
                                });

                                const statsResult = computeCategoryStats(filteredHistory, 1, 60, maxScore);
                                cat.simuladoStats = {
                                    ...cat.simuladoStats,
                                    history: filteredHistory.slice(-50),
                                    average: Number((statsResult?.mean || 0).toFixed(1)),
                                    trend: statsResult?.trend || 'stable',
                                    lastAttempt: (finalC / finalQ) * maxScore,
                                    level: statsResult?.level || (
                                        (statsResult?.mean || 0) > 0.7 * maxScore ? 'ALTO' : 
                                        (statsResult?.mean || 0) > 0.4 * maxScore ? 'MÉDIO' : 'BAIXO'
                                    )
                                };
                            }
                        }
                    });
                }

                capturedCount = totalProcessedDisciplines;

                const todayKey2 = getDateKey(new Date());
                // BUGFIX CRITICO: Preservar dados importados via CSV no dia de hoje (isAuto falso).
                const rowsToKeep2 = (prev.simuladoRows || []).filter(
                    r => !(r.isAuto && getDateKey(r.date || r.createdAt) === todayKey2)
                );

                const validatedRows = [
                    ...rowsToKeep2,
                    ...rawRows
                        .filter(r => r && r.subject && r.topic && (Number(r.total) > 0))
                        .map(r => ({
                            ...r,
                            createdAt: r.createdAt || new Date().toISOString(),
                            validated: true
                        }))
                ].slice(-300);

                return {
                    ...prev,
                    categories: newCategories,
                    simuladoRows: validatedRows,
                    lastUpdated: new Date().toISOString()
                };
            }, true);

            if (capturedCount > 0) {
                showToast('Simulado processado com sucesso!', 'success');
                useAppStore.getState().awardExperience(500);
            } else {
                showToast('Nenhuma matéria correspondente encontrada.', 'warning');
            }
        } catch (err) {
            console.error("FATAL ERROR IN handleSimuladoAnalysis:", err);
            showToast('Erro fatal ao salvar simulado. Verifique os logs.', 'error');
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
