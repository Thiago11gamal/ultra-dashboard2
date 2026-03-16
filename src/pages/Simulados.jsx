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
            
            // 1. Garantir nova referência para o array de categorias
            const newCategories = prev.categories.map(c => ({ ...c }));
            let totalProcessedDisciplines = 0;

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

                    // 2. Extrair questões e acertos de forma robusta
                    // Prioridade 1: Tópicos validados (que existem no Dashboard)
                    const validTopicsFromAnalysis = (disc.topics || []).filter(t => 
                        category.tasks?.some(task => normalize(task.title || task.text) === normalize(t.name))
                    );

                    let totalQ = 0;
                    let totalC = 0;

                    if (validTopicsFromAnalysis.length > 0) {
                        totalQ = validTopicsFromAnalysis.reduce((acc, t) => acc + (Number(t.total) || 0), 0);
                        totalC = validTopicsFromAnalysis.reduce((acc, t) => acc + (Number(t.correct) || 0), 0);
                    } else {
                        // Prioridade 2: Fallback para as linhas brutas da tabela (caso existam assuntos sem tarefas)
                        const subjectRows = rawRows.filter(r => normalize(r.subject) === discNameNorm);
                        totalQ = subjectRows.reduce((acc, r) => acc + (Number(r.total) || 0), 0);
                        totalC = subjectRows.reduce((acc, r) => acc + (Number(r.correct) || 0), 0);
                    }

                    // Só processa se houver volume de dados
                    if (totalQ > 0) {
                        totalProcessedDisciplines++;
                        
                        // 3. Atualizar Histórico (Substituindo apenas a entrada de hoje se existir)
                        const d = new Date();
                        const timestamp = d.toISOString();
                        const todayKey = getDateKey(d);
                        
                        const historyWithoutToday = (currentStats.history || []).filter(
                            h => getDateKey(h.date) !== todayKey
                        );
                        
                        const newHistoryPoint = { 
                            date: timestamp, 
                            score: (totalC / totalQ) * 100, 
                            total: totalQ, 
                            correct: totalC, 
                            topics: validTopicsFromAnalysis 
                        };

                        const historyPoints = [...historyWithoutToday, newHistoryPoint];

                        // 4. Recalcular Estatísticas usando o motor central
                        const stats = computeCategoryStats(historyPoints, category.weight || 10);

                        if (stats) {
                            newCategories[catIndex].simuladoStats = {
                                history: historyPoints,
                                average: stats.mean,
                                lastAttempt: (totalC / totalQ) * 100,
                                trend: stats.trend,
                                level: stats.mean > 70 ? 'ALTO' : stats.mean > 40 ? 'MÉDIO' : 'BAIXO'
                            };
                        }
                    }
                }
            });

            // 5. Persistir as linhas validadas para manter o Simulador preenchido
            const todayKey2 = getDateKey(new Date());
            const nonTodayRows = (prev.simuladoRows || []).filter(
                r => !r.createdAt || getDateKey(new Date(r.createdAt)) !== todayKey2
            );

            const now = Date.now();
            const validatedRows = [
                ...nonTodayRows,
                ...rawRows
                    .filter(r => r.subject && r.topic && (Number(r.total) > 0))
                    .map(r => ({
                        ...r,
                        createdAt: r.createdAt || now,
                        validated: true
                    }))
            ].slice(-300);

            // Armazenar sinalizador temporário para o Toast
            window.__LAST_RESULT_COUNT = totalProcessedDisciplines;

            return {
                ...prev,
                categories: newCategories,
                simuladoRows: validatedRows,
                lastUpdated: new Date().toISOString()
            };
        }, false);

        // Feedback visual imediato
        const updatedCount = window.__LAST_RESULT_COUNT || 0;
        delete window.__LAST_RESULT_COUNT;

        if (updatedCount > 0) {
            showToast(`Sucesso! ${updatedCount} matérias atualizadas no seu gráfico de evolução. +500 XP`, 'success');
            useAppStore.getState().awardExperience(500);
        } else {
            showToast('Nenhum dado novo para as matérias atuais. Verifique os valores.', 'warning');
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
