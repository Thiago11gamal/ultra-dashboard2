import { PageErrorBoundary } from '../components/ErrorBoundary';
import { safeClone } from '../store/safeClone.js';
import React, { useState } from 'react';
import SimuladoAnalysis from '../components/SimuladoAnalysis';
import AIGeneratedSimulado from '../components/ai/AIGeneratedSimulado';
import { useAppStore } from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { useToast } from '../hooks/useToast';
import { normalize, aliases } from '../utils/normalization';
import { computeCategoryStats } from '../engine';
import { getDateKey, normalizeDate } from '../utils/dateHelper';
import { generateId } from '../utils/idGenerator';
import { ListChecks, Brain, History as HistoryIcon } from 'lucide-react';
import StudyHistory from '../components/StudyHistory';

export default function Simulados() {
    const data = useAppStore(useShallow(state => {
        const contest = state.appState?.contests?.[state.appState?.activeId] || {};
        return {
            categories: contest.categories,
            simuladoRows: contest.simuladoRows,
            simulados: contest.simulados,
            studySessions: contest.studySessions
        };
    }));
    const setData = useAppStore(state => state.setData);
    const showToast = useToast();

    const categoriesArray = React.useMemo(() => Array.isArray(data?.categories) ? data.categories : Object.values(data?.categories || {}), [data]);
    const simuladoRowsArray = React.useMemo(() => Array.isArray(data?.simuladoRows) ? data.simuladoRows : Object.values(data?.simuladoRows || {}), [data]);
    const studySessionsArray = React.useMemo(() => Array.isArray(data?.studySessions) ? data.studySessions : Object.values(data?.studySessions || {}), [data]);

    const displayRows = React.useMemo(() => {
        if (!categoriesArray.length) return [];
        const todayKey = getDateKey(normalizeDate(new Date()));
        const rawTodayRows = simuladoRowsArray.filter(
            r => getDateKey(normalizeDate(r.date || r.createdAt)) === todayKey
        );

        const rows = [];
        const savedManualRows = {};

        rawTodayRows.forEach(r => {
            // Isolando o formulário manual: não injeta dados gerados por IA.
            if (!r.isAuto && r.source !== 'ai-generated') {
                const key = `${normalize(r.subject)}-${normalize(r.topic)}`;
                savedManualRows[key] = r;
            }
        });

        categoriesArray.forEach(cat => {
            const rawTasks = cat.tasks || [];
            const tasks = Array.isArray(rawTasks) ? rawTasks : Object.values(rawTasks);

            if (tasks.length === 0) {
                const subjNorm = normalize(cat.name);
                const topicNorm = normalize('nenhum');
                const key = `${subjNorm}-${topicNorm}`;

                if (savedManualRows[key]) {
                    rows.push(savedManualRows[key]);
                } else {
                    rows.push({
                        id: `manual-fallback-${cat.id}`,
                        subject: cat.name,
                        topic: 'nenhum',
                        correct: 0,
                        total: 0,
                        isAuto: false,
                        source: 'manual'
                    });
                }
            } else {
                tasks.forEach(task => {
                    const subjNorm = normalize(cat.name);
                    const title = String(task.title || task.text || '').trim();
                    const topicNorm = normalize(title);

                    if (!title) return;

                    const key = `${subjNorm}-${topicNorm}`;

                    if (savedManualRows[key]) {
                        rows.push(savedManualRows[key]);
                    } else {
                        rows.push({
                            id: `manual-${cat.id}-${task.id}`,
                            subject: cat.name,
                            topic: title,
                            correct: 0,
                            total: 0,
                            isAuto: false,
                            source: 'manual'
                        });
                    }
                });
            }
        });
        return rows;
    }, [categoriesArray, simuladoRowsArray]);

    const lastSimuladoRows = React.useMemo(() => {
        if (!simuladoRowsArray.length) return [];
        const rows = simuladoRowsArray;
        
        const answeredRows = rows.filter(r => parseInt(r.total, 10) > 0 || parseInt(r.correct, 10) > 0);
        if (answeredRows.length === 0) return [];
        
        const sorted = [...answeredRows].sort((a, b) => {
            const dateA = new Date(a.lastUpdated || a.createdAt || a.date || 0);
            const dateB = new Date(b.lastUpdated || b.createdAt || b.date || 0);
            return dateB.getTime() - dateA.getTime();
        });
        
        const lastRef = sorted[0];
        if (!lastRef) return [];
        
        // Return all rows from the most recent day of activity
        return rows.filter(r => r.date === lastRef.date);
    }, [simuladoRowsArray]);

    const [mode, setMode] = useState('ai-generator'); // 'ai-generator' | 'analyzer' | 'history'
    const [subMode, setSubMode] = useState('ia'); // 'ia' | 'manual'

    // BUG-11/20 FIX: Guarda de segurança contra estado vazio
    if (!categoriesArray.length) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-8 text-center bg-slate-900/50 rounded-2xl border border-white/5 mx-4 mt-8">
                <Brain className="w-16 h-16 text-slate-600 mb-4" />
                <h2 className="text-xl font-black text-white">Nenhuma matéria encontrada</h2>
                <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                    Você ainda não cadastrou matérias no seu concurso ativo. Para gerar ou analisar simulados, adicione matérias no seu plano de estudos.
                </p>
            </div>
        );
    }


    // manual rows are no longer supported



    const handleSimuladoAnalysis = (payload) => {
        try {
            // FIX 1: Obtenha o estado síncrono atual FORA do updater
            const store = useAppStore.getState();
            const prev = store.appState?.contests?.[store.appState?.activeId];
            if (!prev) throw new Error('Contest ativo não encontrado para salvar simulado');
            
            const analysisResult = payload?.analysis || payload || {};
            const rawRows = Array.isArray(payload?.rawRows) ? payload.rawRows : [];
            
            // FIX 5: Clone estrutural nativo
            const newCategories = safeClone(Array.isArray(prev.categories) ? prev.categories : Object.values(prev.categories || {}));
            let totalProcessedDisciplines = 0;

            const dataToProcess = analysisResult?.disciplines || analysisResult;
            const todayKey = getDateKey(normalizeDate(new Date()));
            const nowIso = new Date().toISOString();

            // 1. Build validatedRows FIRST
            const prevSimuladoRowsArray = Array.isArray(prev.simuladoRows) ? prev.simuladoRows : Object.values(prev.simuladoRows || {});
            const rowsToKeep = prevSimuladoRowsArray.filter(
                r => {
                    const isToday = getDateKey(normalizeDate(r.date || r.createdAt)) === todayKey;
                    const isManual = !r.isAuto && r.source !== 'ai-generated';
                    return !(isToday && isManual); // Se for manual de hoje, remove para salvar o novo lote por cima
                }
            );

            const manualSubmittedRows = rawRows
                .filter(r => r && r.subject && r.topic && Number.isFinite(Number(r.total)) && Number(r.total) > 0)
                .map(r => ({
                    ...r,
                    createdAt: nowIso, 
                    validated: true,
                    isAuto: false,
                    source: 'manual',
                    subject: String(r.subject || '').trim(),
                    topic: String(r.topic || '').trim(),
                    correct: Math.max(0, Math.min(Number(r.correct) || 0, Number(r.total) || 0)),
                    total: Math.max(0, Number(r.total) || 0)
                }));

            const validatedRows = [ ...rowsToKeep, ...manualSubmittedRows ].slice(-300);

            // 2. Process Categories using validatedRows to avoid AI data suppression
            const processStats = (targetName) => {
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

                    const rawHistory = Array.isArray(cat.simuladoStats.history) ? cat.simuladoStats.history : Object.values(cat.simuladoStats.history || {});
                    const history = rawHistory.filter(Boolean);
                    const historyWithoutToday = history.filter(h => h.date !== todayKey);
                    
                    // Recalculate today's stats from ALL validatedRows for this subject (merging AI and Manual)
                    const todayRows = validatedRows.filter(r => 
                        getDateKey(normalizeDate(r.date || r.createdAt)) === todayKey &&
                        (normalize(r.subject) === discNameNorm || aliases[normalize(r.subject)]?.some(a => normalize(a) === discNameNorm))
                    );

                    const finalC = todayRows.reduce((sum, r) => sum + (Number(r.correct) || 0), 0);
                    const finalQ = todayRows.reduce((sum, r) => sum + (Number(r.total) || 0), 0);
                    
                    // FEAT: Consolidate time spent for Agilidade AI / Monte Carlo Penalty
                    const finalTimeSpent = todayRows.reduce((sum, r) => sum + (Number(r.timeSpent) || 0), 0);
                    const finalTimedQuestoes = todayRows.reduce((sum, r) => sum + (Number(r.timeSpent) > 0 ? (Number(r.total) || 0) : 0), 0);

                    // Topics from today's rows
                    const topicsMap = {};
                    todayRows.forEach(r => {
                        const tName = String(r.topic || '').trim();
                        if (!topicsMap[tName]) topicsMap[tName] = { correct: 0, total: 0, difficulty: [], timeSpent: 0, timedQuestoes: 0 };
                        topicsMap[tName].correct += Number(r.correct) || 0;
                        topicsMap[tName].total += Number(r.total) || 0;
                        topicsMap[tName].difficulty.push(Number(r.difficulty) || 1.0);
                        
                        const rowTime = Number(r.timeSpent) || 0;
                        if (rowTime > 0) {
                            topicsMap[tName].timeSpent += rowTime;
                            topicsMap[tName].timedQuestoes += (Number(r.total) || 0);
                        }
                    });

                    const finalTopics = Object.entries(topicsMap).map(([name, data]) => ({
                        name,
                        correct: data.correct,
                        total: data.total,
                        percentage: data.total > 0 ? (data.correct / data.total) * 100 : 0,
                        difficulty: data.difficulty.length > 0 ? data.difficulty.reduce((a, b) => a + b, 0) / data.difficulty.length : 1.0,
                        timeSpent: data.timeSpent,
                        timedQuestoes: data.timedQuestoes
                    }));

                    if (finalQ > 0) {
                        const maxScore = Number(cat.maxScore) || 100;
                        
                        const totalDifficultyWeight = finalTopics.reduce((acc, t) => 
                            acc + (Number(t.difficulty) || 1.0) * (Number(t.total) || 0), 0);
                        const avgDifficulty = finalTopics.length > 0 && totalDifficultyWeight > 0
                            ? totalDifficultyWeight / finalQ
                            : 1.0;

                        historyWithoutToday.push({
                            date: todayKey,
                            correct: finalC,
                            total: finalQ,
                            difficulty: Number(avgDifficulty.toFixed(2)),
                            score: finalQ > 0 ? Math.min(maxScore, Math.max(0, (finalC / finalQ) * maxScore)) : 0,
                            timeSpent: finalTimeSpent,
                            timedQuestoes: finalTimedQuestoes,
                            topics: finalTopics
                        });
                    }

                    const historyWithCurrent = historyWithoutToday.slice(-50);
                    const statsResult = computeCategoryStats(historyWithCurrent, 1, 60, Number(cat.maxScore) || 100);
                    
                    cat.simuladoStats = {
                        ...cat.simuladoStats,
                        history: historyWithCurrent,
                        average: Number((statsResult?.mean || 0).toFixed(2)),
                        trend: statsResult?.trend || 'stable',
                        lastAttempt: finalQ > 0 ? (finalC / finalQ) * (Number(cat.maxScore) || 100) : cat.simuladoStats.lastAttempt,
                        level: statsResult?.level || (
                            (statsResult?.mean || 0) > 0.7 * (Number(cat.maxScore) || 100) ? 'ALTO' : 
                            (statsResult?.mean || 0) > 0.4 * (Number(cat.maxScore) || 100) ? 'MÉDIO' : 'BAIXO'
                        )
                    };
                }
            };

            if (Array.isArray(dataToProcess)) {
                dataToProcess.forEach(disc => {
                    if (disc && disc.name) processStats(disc.name);
                });
            } else if (dataToProcess && typeof dataToProcess === 'object') {
                Object.keys(dataToProcess || {}).forEach(rawSubject => {
                    if (rawSubject) processStats(rawSubject);
                });
            }

            // 3. Fix Global Event Score (Ghost Rows Issue)
            const todayValidatedRows = validatedRows.filter(r => getDateKey(normalizeDate(r.date || r.createdAt)) === todayKey);
            const totalQ = todayValidatedRows.reduce((acc, r) => acc + (parseInt(r?.total, 10) || 0), 0);
            const totalC = todayValidatedRows.reduce((acc, r) => acc + (parseInt(r?.correct, 10) || 0), 0);
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

            const existingSimuladosRaw = Array.isArray(prev.simulados) ? prev.simulados : Object.values(prev.simulados || {});
            const existingSimulados = existingSimuladosRaw.filter(Boolean);
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
        <div className="mb-8 flex flex-wrap items-center bg-white/5 border border-white/10 rounded-2xl p-1 w-fit gap-1">
          <button
            onClick={() => setMode('ai-generator')}
            className={`flex items-center gap-2 px-6 py-2.5 text-sm font-black rounded-[14px] transition-all ${mode === 'ai-generator' 
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow' 
              : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            <Brain size={17} className={mode === 'ai-generator' ? '' : 'opacity-70'} /> Gerar Simulado
          </button>
          <button
            onClick={() => setMode('analyzer')}
            className={`flex items-center gap-2 px-6 py-2.5 text-sm font-black rounded-[14px] transition-all ${mode === 'analyzer' 
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow' 
              : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            <ListChecks size={17} className={mode === 'analyzer' ? '' : 'opacity-70'} /> Último Simulado
          </button>
          <button
            onClick={() => setMode('history')}
            className={`flex items-center gap-2 px-6 py-2.5 text-sm font-black rounded-[14px] transition-all ${mode === 'history' 
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow' 
              : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            <HistoryIcon size={17} className={mode === 'history' ? '' : 'opacity-70'} /> Histórico
          </button>
        </div>

        {mode === 'analyzer' ? (
          <SimuladoAnalysis
            rows={lastSimuladoRows}
            categories={categoriesArray}
            viewMode="report"
          />
        ) : mode === 'ai-generator' ? (
          <div className="flex flex-col h-full animate-fade-in">
              <div className="w-full flex justify-center mb-6">
                  <div className="flex gap-3 bg-slate-800/50 p-1.5 rounded-2xl w-fit border border-slate-700/50 shadow-inner">
                  <button 
                      onClick={() => setSubMode('ia')} 
                      className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-sm transition-all duration-300 ${subMode === 'ia' ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/30' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                  >
                      <Brain size={16} className={subMode === 'ia' ? '' : 'opacity-70'} />
                      Simulado IA
                  </button>
                  <button 
                      onClick={() => setSubMode('manual')} 
                      className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-sm transition-all duration-300 ${subMode === 'manual' ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/30' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                  >
                      <ListChecks size={16} className={subMode === 'manual' ? '' : 'opacity-70'} />
                      Simulado Manual
                  </button>
                  </div>
              </div>
              {subMode === 'ia' ? (
                  <AIGeneratedSimulado />
              ) : (
                  <SimuladoAnalysis
                      rows={displayRows}
                      onAnalysisComplete={handleSimuladoAnalysis}
                      categories={categoriesArray}
                      viewMode="form"
                  />
              )}
          </div>
        ) : (
          <StudyHistory
              studySessions={studySessionsArray}
              categories={categoriesArray}
              simuladoRows={simuladoRowsArray}
              onDeleteSession={useAppStore.getState().deleteSession}
              onDeleteSimulado={useAppStore.getState().deleteSimulado}
              mode="performance"
          />
        )}
    </PageErrorBoundary>);
}
