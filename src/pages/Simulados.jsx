import { PageErrorBoundary } from '../components/ErrorBoundary';
import { safeClone } from '../store/safeClone.js';
import React, { useState } from 'react';
import SimuladoAnalysis from '../components/SimuladoAnalysis';
import AIGeneratedSimulado from '../components/ai/AIGeneratedSimulado';
import { useAppStore } from '../store/useAppStore';
import { useToast } from '../hooks/useToast';
import { normalize, aliases } from '../utils/normalization';
import { computeCategoryStats } from '../engine';
import { getDateKey, normalizeDate } from '../utils/dateHelper';
import { generateId } from '../utils/idGenerator';
import { ListChecks, Brain } from 'lucide-react';

export default function Simulados() {
    const data = useAppStore(state => state.appState?.contests?.[state.appState?.activeId] || null);
    const setData = useAppStore(state => state.setData);
    const showToast = useToast();

    const displayRows = React.useMemo(() => {
        if (!data || !data.categories) return [];
        const todayKey = getDateKey(normalizeDate(new Date()));
        const rawTodayRows = (data.simuladoRows || []).filter(
            r => getDateKey(normalizeDate(r.date || r.createdAt)) === todayKey
        );

        const rows = [];
        const savedAutoRows = {};

        rawTodayRows.forEach(r => {
            if (r.isAuto) {
                const key = `${normalize(r.subject)}-${normalize(r.topic)}`;
                savedAutoRows[key] = r;

                // Support for AI-generated rows that carry exact IDs (adendo requirement)
                if (r.categoryId && r.taskId) {
                    savedAutoRows[`id:${r.categoryId}:${r.taskId}`] = r;
                }
            }
        });

        (data.categories || []).forEach(cat => {
            const tasks = cat.tasks || [];

            if (tasks.length === 0) {
                const subjNorm = normalize(cat.name);
                const topicNorm = normalize('nenhum');
                const key = `${subjNorm}-${topicNorm}`;

                if (savedAutoRows[key]) {
                    rows.push(savedAutoRows[key]);
                } else {
                    rows.push({
                        id: `auto-${cat.id}-fallback`,
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
                    const idKey = `id:${cat.id}:${task.id}`;

                    if (savedAutoRows[idKey]) {
                        // Prefer exact ID match (from AI generated simulados)
                        rows.push(savedAutoRows[idKey]);
                    } else if (savedAutoRows[key]) {
                        rows.push(savedAutoRows[key]);
                    } else {
                        rows.push({
                            id: `auto-${cat.id}-${task.id}`,
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
        return rows;
    }, [data]);

    const [mode, setMode] = useState('analyzer'); // 'analyzer' | 'ai-generator'

    // BUG-11/20 FIX: Guarda de segurança contra estado vazio
    if (!data || !data.categories) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
                <p className="text-purple-300 font-mono animate-pulse">Sincronizando dados...</p>
            </div>
        );
    }


    // manual rows are no longer supported

    const handleUpdateSimuladoRows = (updatedTodayRows) => {
        const todayKey = getDateKey(normalizeDate(new Date()));
        setData(prev => {
            const existingRows = prev.simuladoRows || [];
            // BUGFIX CRITICO: Preservar dados importados via CSV (isAuto falso).
            // As rows isAuto de hoje (incluindo AI) serão substituídas pelos valores atuais da tabela.
            // Os dados de AI são preservados porque a tabela (displayRows) injeta as rows de AI com seus scores.
            const rowsToKeep = existingRows.filter(row => 
                !(row.isAuto && getDateKey(normalizeDate(row.date || row.createdAt)) === todayKey)
            );

            const validRowsToSave = updatedTodayRows.filter(r => {
                const hasScore = parseInt(r.total, 10) > 0 || parseInt(r.correct, 10) > 0;
                const hasEmptyString = r.total === '' || r.correct === '';
                const hasCustomDifficulty = r.difficulty !== undefined && parseFloat(r.difficulty) !== 1.0;
                return hasScore || hasEmptyString || hasCustomDifficulty;
            }).map(row => ({
                ...row,
                createdAt: row.createdAt || new Date().toISOString()
            }));

            return { ...prev, simuladoRows: [...rowsToKeep, ...validRowsToSave] };
        });
    };

    const handleSimuladoAnalysis = (payload) => {
        try {
            // FIX 1: Obtenha o estado síncrono atual FORA do updater
            const store = useAppStore.getState();
            const prev = store.appState?.contests?.[store.appState?.activeId];
            if (!prev) throw new Error('Contest ativo não encontrado para salvar simulado');
            
            const analysisResult = payload?.analysis || payload || {};
            const rawRows = Array.isArray(payload?.rawRows) ? payload.rawRows : [];
            
            // FIX 5: Clone estrutural nativo
            const newCategories = safeClone(Array.isArray(prev.categories) ? prev.categories : []);
            let totalProcessedDisciplines = 0;

            const dataToProcess = analysisResult?.disciplines || analysisResult;
            const todayKey = getDateKey(normalizeDate(new Date()));

            const processStats = (targetName, stats) => {
                const discNameNorm = normalize(targetName);
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

                    const history = Array.isArray(cat.simuladoStats.history) ? cat.simuladoStats.history.filter(Boolean) : [];
                    const historyWithoutToday = history.filter(h => h.date !== todayKey);
                    const historyWithCurrent = historyWithoutToday.slice(-49);
                    
                    const finalC = Math.max(0, Number(stats.totalCorrect || 0));
                    const finalQ = Math.max(0, Number(stats.totalQuestions || 0));

                    if (finalQ > 0) {
                        const maxScore = Number(cat.maxScore) || 100;
                        
                        // [TRI] Cálculo da dificuldade ponderada média do simulado para esta matéria
                        const topicList = Array.isArray(stats.topics) ? stats.topics : [];
                        const totalDifficultyWeight = topicList.reduce((acc, t) => 
                            acc + (Number(t.difficulty) || 1.0) * (Number(t.total) || 0), 0);
                        const avgDifficulty = topicList.length > 0 && totalDifficultyWeight > 0
                            ? totalDifficultyWeight / finalQ
                            : 1.0;

                        historyWithCurrent.push({
                            date: todayKey,
                            correct: finalC,
                            total: finalQ,
                            difficulty: Number(avgDifficulty.toFixed(2)),
                            score: Math.min(maxScore, Math.max(0, (finalC / finalQ) * maxScore)),
                            topics: stats.topics || []
                        });

                        const statsResult = computeCategoryStats(historyWithCurrent, 1, 60, maxScore);
                        cat.simuladoStats = {
                            ...cat.simuladoStats,
                            history: historyWithCurrent.slice(-50),
                            average: Number((statsResult?.mean || 0).toFixed(2)),
                            trend: statsResult?.trend || 'stable',
                            lastAttempt: (finalC / finalQ) * maxScore,
                            level: statsResult?.level || (
                                (statsResult?.mean || 0) > 0.7 * maxScore ? 'ALTO' : 
                                (statsResult?.mean || 0) > 0.4 * maxScore ? 'MÉDIO' : 'BAIXO'
                            )
                        };
                    }
                }
            };

            if (Array.isArray(dataToProcess)) {
                dataToProcess.forEach(disc => {
                    if (disc && disc.name) processStats(disc.name, disc);
                });
            } else if (dataToProcess && typeof dataToProcess === 'object') {
                Object.entries(dataToProcess || {}).forEach(([rawSubject, stats]) => {
                    if (rawSubject && stats) processStats(rawSubject, stats);
                });
            }

            // BUGFIX CRITICO: Preservar dados importados via CSV (isAuto falso).
            // As rows isAuto de hoje (incluindo de IA) serão substituídas pelos valores da análise atual.
            // Dados de IA são mantidos via os rawRows vindos da tabela que injeta eles.
            const rowsToKeep = (prev.simuladoRows || []).filter(
                r => !(r.isAuto && getDateKey(normalizeDate(r.date || r.createdAt)) === todayKey)
            );

            const validatedRows = [
                ...rowsToKeep,
                ...rawRows
                    .filter(r => r && r.subject && r.topic && Number.isFinite(Number(r.total)) && Number(r.total) > 0)
                    .map(r => ({
                        ...r,
                        createdAt: r.createdAt || new Date().toISOString(),
                        validated: true,
                        subject: String(r.subject || '').trim(),
                        topic: String(r.topic || '').trim(),
                        correct: Math.min(Math.max(0, Number(r.total) || 0), Math.max(0, Number(r.correct) || 0)),
                        total: Math.max(0, Number(r.total) || 0)
                    }))
            ].slice(-300);

            const totalQ = rawRows.reduce((acc, r) => acc + (parseInt(r?.total, 10) || 0), 0);
            const totalC = rawRows.reduce((acc, r) => acc + (parseInt(r?.correct, 10) || 0), 0);
            const globalPct = totalQ > 0 ? Number(((totalC / totalQ) * 100).toFixed(2)) : 0;
            
            const newSimuladoEvent = {
                id: generateId('sim'),
                date: todayKey,
                score: globalPct,
                total: totalQ,
                correct: totalC,
                type: 'auto-analyzer',
                subject: 'Simulado Geral'
            };

            const existingSimulados = Array.isArray(prev.simulados) ? prev.simulados.filter(Boolean) : [];
            const withoutDuplicateToday = existingSimulados.filter(s => !(s?.date === todayKey && s?.type === 'auto-analyzer'));
            const updatedSimulados = [...withoutDuplicateToday, newSimuladoEvent].slice(-100);

            // Commit atômico (functional updater para evitar sobrescrever mudanças concorrentes)
            setData(current => ({
                ...(current || {}),
                categories: newCategories,
                simuladoRows: validatedRows,
                simulados: updatedSimulados,
                lastUpdated: new Date().toISOString()
            }));

            // Efeitos colaterais fora da mutação
            if (totalProcessedDisciplines > 0) {
                showToast('Simulado processado com sucesso!', 'success');
                store.awardExperience(500);
            } else {
                showToast('Nenhuma matéria correspondente encontrada.', 'warning');
            }
        } catch (err) {
            console.error("FATAL ERROR IN handleSimuladoAnalysis:", err);
            showToast('Erro fatal ao salvar simulado. Verifique os logs.', 'error');
        }
    };


    return (<PageErrorBoundary pageName="Simulados">
        {/* Premium Tabs */}
        <div className="mb-8 flex items-center bg-white/5 border border-white/10 rounded-2xl p-1 w-fit">
          <button
            onClick={() => setMode('analyzer')}
            className={`flex items-center gap-2 px-6 py-2.5 text-sm font-black rounded-[14px] transition-all ${mode === 'analyzer' 
              ? 'bg-white text-slate-950 shadow' 
              : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            <ListChecks size={17} className="opacity-70" /> Analisador de Desempenho
          </button>
          <button
            onClick={() => setMode('ai-generator')}
            className={`flex items-center gap-2 px-6 py-2.5 text-sm font-black rounded-[14px] transition-all ${mode === 'ai-generator' 
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow' 
              : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            <Brain size={17} className="opacity-70" /> Gerar Simulado com IA
          </button>
        </div>

        {mode === 'analyzer' ? (
          <SimuladoAnalysis
            rows={displayRows}
            onRowsChange={handleUpdateSimuladoRows}
            onAnalysisComplete={handleSimuladoAnalysis}
            categories={data.categories || []}
          />
        ) : (
          <AIGeneratedSimulado />
        )}
    </PageErrorBoundary>);
}
