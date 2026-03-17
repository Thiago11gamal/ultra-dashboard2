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
                createdAt: row.createdAt || new Date().toISOString()
            }));

            return { ...prev, simuladoRows: [...nonTodayRows, ...validRowsToSave] };
        });
    };

    const handleSimuladoAnalysis = (payload) => {
        setData(prev => {
            const analysisResult = payload.analysis || payload;
            const rawRows = payload.rawRows || [];
            
            // 1. Garantir nova referência profunda para as categorias (Reatividade total)
            const categoriesSource = Array.isArray(prev.categories) ? prev.categories : [];
            const newCategories = JSON.parse(JSON.stringify(categoriesSource));
            let totalProcessedDisciplines = 0;
            const updatedNames = [];

            analysisResult.disciplines.forEach(disc => {
                const discNameNorm = normalize(disc.name);
                
                // Encontrar categoria correspondente (Exato ou Alias)
                let catIndex = newCategories.findIndex(c => normalize(c.name) === discNameNorm);
                if (catIndex === -1) {
                    catIndex = newCategories.findIndex(c => 
                        aliases[normalize(c.name)]?.some(a => normalize(a) === discNameNorm)
                    );
                }

                if (catIndex !== -1) {
                    const category = newCategories[catIndex];
                    const currentStats = category.simuladoStats || { history: [], average: 0 };

                    // 2. Calcular questões e acertos apenas dos tópicos desta sessão
                    const validTopicsFromAnalysis = (disc.topics || []).filter(t => {
                        const tasks = Array.isArray(category.tasks) ? category.tasks : [];
                        return tasks.some(task => normalize(task?.title || task?.text || '') === normalize(t?.name || ''));
                    });

                    let sessionQ = 0;
                    let sessionC = 0;

                    if (validTopicsFromAnalysis.length > 0) {
                        sessionQ = validTopicsFromAnalysis.reduce((acc, t) => acc + (Number(t.total) || 0), 0);
                        sessionC = validTopicsFromAnalysis.reduce((acc, t) => acc + (Number(t.correct) || 0), 0);
                    } else {
                        // Fallback para as linhas brutas se não houver tarefas mapeadas
                        const subjectRows = rawRows.filter(r => normalize(r.subject) === discNameNorm);
                        sessionQ = subjectRows.reduce((acc, r) => acc + (Number(r.total) || 0), 0);
                        sessionC = subjectRows.reduce((acc, r) => acc + (Number(r.correct) || 0), 0);
                    }

                    if (sessionQ > 0) {
                        totalProcessedDisciplines++;
                        updatedNames.push(category.name);
                        
                        // 3. Atualizar Histórico (Garantindo apenas um ponto por dia)
                        const d = new Date();
                        const timestamp = d.toISOString();
                        const todayKeyStr = getDateKey(d);
                        
                        const historyWithoutToday = (currentStats.history || []).filter(
                            h => getDateKey(h.date) !== todayKeyStr
                        );

                        // Encontrar ganhos do dia atual se já houver registro (Soma incremental)
                        const existingToday = (currentStats.history || []).find(
                            h => getDateKey(h.date) === todayKeyStr
                        );
                        
                        // AGGREGATION FIX: Sum current session with existing today record
                        const finalQ = (Number(existingToday?.total) || 0) + Number(sessionQ);
                        const finalC = (Number(existingToday?.correct) || 0) + Number(sessionC);

                        const existingTopics = Array.isArray(existingToday?.topics) ? existingToday.topics : [];
                        const newHistoryPoint = { 
                            date: timestamp, 
                            score: finalQ > 0 ? (finalC / finalQ) * 100 : 0, 
                            total: finalQ, 
                            correct: finalC, 
                            topics: [...existingTopics, ...validTopicsFromAnalysis] 
                        };

                        const historyPoints = [...historyWithoutToday, newHistoryPoint];

                        // 4. Recalcular Estatísticas
                        const stats = computeCategoryStats(historyPoints, category.weight || 10);

                        newCategories[catIndex].simuladoStats = {
                            history: historyPoints,
                            average: stats ? stats.mean : (finalC / finalQ) * 100,
                            lastAttempt: (sessionC / sessionQ) * 100,
                            trend: stats ? stats.trend : 'stable',
                            level: (stats ? stats.mean : (finalC / finalQ) * 100) > 70 ? 'ALTO' : 
                                   (stats ? stats.mean : (finalC / finalQ) * 100) > 40 ? 'MÉDIO' : 'BAIXO'
                        };
                    }
                }
            });

            // 5. Persistência das linhas da tabela
            const todayKey2 = getDateKey(new Date());
            const nonTodayRows = (prev.simuladoRows || []).filter(
                r => !r.createdAt || getDateKey(new Date(r.createdAt)) !== todayKey2
            );

            const validatedRows = [
                ...nonTodayRows,
                ...rawRows
                    .filter(r => r.subject && r.topic && (Number(r.total) > 0))
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
                lastUpdated: new Date().toISOString(),
                _lastProcessedCount: totalProcessedDisciplines
            };
        }, true);

        // BUG-A5 FIX: Read count from state and cleanup immediately
        const activeId = useAppStore.getState().appState.activeId;
        const updatedContest = useAppStore.getState().appState.contests[activeId];
        const updatedCount = updatedContest?._lastProcessedCount ?? 0;

        // Cleanup temporary field
        setData(prev => {
            const { _lastProcessedCount: _drop, ...rest } = prev;
            return rest;
        }, false);

        if (updatedCount > 0) {
            showToast('Simulado processado com sucesso!', 'success');
            useAppStore.getState().awardExperience(500);
        } else {
            showToast('Nenhuma matéria correspondente encontrada.', 'warning');
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
