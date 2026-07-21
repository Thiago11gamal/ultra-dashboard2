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
    const deleteSession = useAppStore((state) => state.deleteSession);
    const deleteSimulado = useAppStore((state) => state.deleteSimulado);

    const categoriesArray = React.useMemo(() => Array.isArray(data?.categories) ? data.categories : Object.values(data?.categories || {}), [data]);
    const simuladoRowsArray = React.useMemo(() => Array.isArray(data?.simuladoRows) ? data.simuladoRows : Object.values(data?.simuladoRows || {}), [data]);
    const studySessionsArray = React.useMemo(() => Array.isArray(data?.studySessions) ? data.studySessions : Object.values(data?.studySessions || {}), [data]);

    const displayRows = React.useMemo(() => {
        if (!categoriesArray.length || !data || !data.categories) return [];
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

  // 1. Filtra apenas rows com dados reais (total > 0 ou correct > 0)
  const answeredRows = simuladoRowsArray.filter(
    (r) => parseInt(r.total, 10) > 0 || parseInt(r.correct, 10) > 0
  );
  if (answeredRows.length === 0) return [];

  // 2. Ordena por timestamp mais recente (lastUpdated > createdAt > date)
  const getTimestamp = (r) => {
    const raw = r.lastUpdated || r.createdAt || r.date;
    if (!raw) return 0;
    const t = new Date(raw).getTime();
    return Number.isFinite(t) ? t : 0;
  };

  const sorted = [...answeredRows].sort((a, b) => getTimestamp(b) - getTimestamp(a));
  const lastRef = sorted[0];
  if (!lastRef) return [];

  // 3. Estratégia A: Se tem batchId, agrupa por batchId (simulados IA)
  if (lastRef.batchId) {
    return simuladoRowsArray.filter((r) => r.batchId === lastRef.batchId);
  }

  // 4. Estratégia B: Agrupa por data + proximidade temporal (simulados manuais)
  const refDateKey =
    lastRef.date ||
    getDateKey(normalizeDate(lastRef.lastUpdated || lastRef.createdAt || new Date()));
  if (!refDateKey) return [lastRef];

  const refTime = getTimestamp(lastRef);
  const BATCH_TOLERANCE_MS = 10 * 60 * 1000; // 10 minutos (mais tolerante)

  return simuladoRowsArray.filter((r) => {
    // Mesma data
    const rowDateKey =
      r.date || getDateKey(normalizeDate(r.lastUpdated || r.createdAt || ''));
    if (rowDateKey !== refDateKey) return false;

    // Se não tem timestamp, inclui (segurança)
    const rowTime = getTimestamp(r);
    if (rowTime === 0) return true;

    // Dentro da janela temporal
    return Math.abs(rowTime - refTime) <= BATCH_TOLERANCE_MS;
  });
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
    const analysisResult = payload?.analysis || payload || {};
    const rawRows = Array.isArray(payload?.rawRows) ? payload.rawRows : [];

    const todayKey = getDateKey(normalizeDate(new Date()));
    const nowIso = new Date().toISOString();
    const batchId = generateId('batch');

    let processedDisciplines = 0;
    let finalTotalQ = 0;

    setData((current) => {
      const prev = current || {};

      const newCategories = safeClone(
        Array.isArray(prev.categories) ? prev.categories : Object.values(prev.categories || {})
      );

      let totalProcessedDisciplines = 0;

      const prevSimuladoRowsArray = Array.isArray(prev.simuladoRows)
        ? prev.simuladoRows
        : Object.values(prev.simuladoRows || {});

      // BUG-15 FIX: Validate that rowsToKeep doesn't duplicate recent manual inputs
      const submittedIds = new Set(rawRows.map(r => r.id).filter(Boolean));

      const rowsToKeep = prevSimuladoRowsArray.filter((r) => {
        if (r?.id && submittedIds.has(r.id)) return false;
        const isToday = getDateKey(normalizeDate(r?.date || r?.createdAt)) === todayKey;
        const isManual = r && !r.isAuto && r.source !== 'ai-generated';
        return !(isToday && isManual);
      });

      const manualSubmittedRows = rawRows
        .filter(
          (r) =>
            r &&
            r.subject &&
            r.topic &&
            Number.isFinite(Number(r.total)) &&
            Number(r.total) > 0
        )
        .map((r) => {
          const total = Math.max(0, Number(r.total) || 0);
          const correct = Math.max(0, Math.min(Number(r.correct) || 0, total));

          return {
            ...r,
            id: r.id || generateId('row'),
            batchId: r.batchId || batchId,
            date: r.date || todayKey,
            createdAt: nowIso,
            lastUpdated: nowIso,
            validated: true,
            isAuto: false,
            source: 'manual',
            subject: String(r.subject || '').trim(),
            topic: String(r.topic || '').trim(),
            correct,
            total
          };
        });

      const sortRowsByTime = (a, b) =>
        new Date(a?.lastUpdated || a?.createdAt || a?.date || 0).getTime() -
        new Date(b?.lastUpdated || b?.createdAt || b?.date || 0).getTime();

      const validatedRows = [...rowsToKeep, ...manualSubmittedRows]
        .sort(sortRowsByTime)
        .slice(-300);

      const processStats = (targetName) => {
        const discNameNorm = normalize(String(targetName || ''));
        if (!discNameNorm) return;

        let catIdx = newCategories.findIndex(
          (c) => c && c.name && normalize(c.name) === discNameNorm
        );

        if (catIdx === -1) {
          catIdx = newCategories.findIndex(
            (c) =>
              c &&
              c.name &&
              aliases[normalize(c.name)]?.some((a) => normalize(a) === discNameNorm)
          );
        }

        if (catIdx === -1) return;

        totalProcessedDisciplines++;

        const cat = newCategories[catIdx];

        if (!cat.simuladoStats) {
          cat.simuladoStats = {
            history: [],
            average: 0,
            lastAttempt: 0,
            trend: 'stable',
            level: 'BAIXO'
          };
        }

        const rawHistory = Array.isArray(cat.simuladoStats.history)
          ? cat.simuladoStats.history
          : Object.values(cat.simuladoStats.history || {});

        const history = rawHistory.filter(Boolean);
        const historyWithoutToday = history.filter((h) => h?.date !== todayKey);

        const todayRows = validatedRows.filter((r) => {
          const rowSubjectNorm = normalize(String(r?.subject || ''));
          const isToday = getDateKey(normalizeDate(r?.date || r?.createdAt)) === todayKey;
          const isSubject =
            rowSubjectNorm === discNameNorm ||
            aliases[rowSubjectNorm]?.some((a) => normalize(a) === discNameNorm);

          return isToday && isSubject;
        });

        const finalC = todayRows.reduce((sum, r) => sum + (Number(r.correct) || 0), 0);
        const finalQ = todayRows.reduce((sum, r) => sum + (Number(r.total) || 0), 0);

        const finalTimeSpent = todayRows.reduce(
          (sum, r) => sum + (Number(r.timeSpent) || 0),
          0
        );

        const finalTimedQuestoes = todayRows.reduce(
          (sum, r) => sum + (Number(r.timeSpent) > 0 ? Number(r.total) || 0 : 0),
          0
        );

        const topicsMap = {};

        todayRows.forEach((r) => {
          const tName = String(r.topic || '').trim();

          if (!topicsMap[tName]) {
            topicsMap[tName] = {
              correct: 0,
              total: 0,
              difficulty: [],
              timeSpent: 0,
              timedQuestoes: 0
            };
          }

          topicsMap[tName].correct += Number(r.correct) || 0;
          topicsMap[tName].total += Number(r.total) || 0;

          const diff = Number(r.difficulty);
          topicsMap[tName].difficulty.push(Number.isFinite(diff) ? diff : 1.0);

          const rowTime = Number(r.timeSpent) || 0;
          if (rowTime > 0) {
            topicsMap[tName].timeSpent += rowTime;
            topicsMap[tName].timedQuestoes += Number(r.total) || 0;
          }
        });

        const finalTopics = Object.entries(topicsMap).map(([name, topicData]) => ({
          name,
          correct: topicData.correct,
          total: topicData.total,
          percentage: topicData.total > 0 ? (topicData.correct / topicData.total) * 100 : 0,
          difficulty:
            topicData.difficulty.length > 0
              ? topicData.difficulty.reduce((a, b) => a + b, 0) / topicData.difficulty.length
              : 1.0,
          timeSpent: topicData.timeSpent,
          timedQuestoes: topicData.timedQuestoes
        }));

        const maxScore = Number(cat.maxScore) || 100;

        if (finalQ > 0) {
          const totalDifficultyWeight = finalTopics.reduce(
            (acc, t) => acc + (Number(t.difficulty) || 1.0) * (Number(t.total) || 0),
            0
          );

          const avgDifficulty =
            finalTopics.length > 0 && totalDifficultyWeight > 0
              ? totalDifficultyWeight / finalQ
              : 1.0;

          historyWithoutToday.push({
            date: todayKey,
            correct: finalC,
            total: finalQ,
            difficulty: Number(avgDifficulty.toFixed(2)),
            score: Math.min(maxScore, Math.max(0, (finalC / finalQ) * maxScore)),
            timeSpent: finalTimeSpent,
            timedQuestoes: finalTimedQuestoes,
            topics: finalTopics
          });
        }

        const historyWithCurrent = historyWithoutToday.slice(-50);

        const statsResult = computeCategoryStats(
          historyWithCurrent,
          Number(cat.targetScore) || 100,
          60,
          maxScore
        );

        cat.simuladoStats = {
          ...cat.simuladoStats,
          history: historyWithCurrent,
          average: Number((statsResult?.mean || 0).toFixed(2)),
          trend: statsResult?.trend || 'stable',
          lastAttempt:
            finalQ > 0 ? (finalC / finalQ) * maxScore : cat.simuladoStats.lastAttempt,
          level:
            statsResult?.level ||
            ((statsResult?.mean || 0) > 0.7 * maxScore
              ? 'ALTO'
              : (statsResult?.mean || 0) > 0.4 * maxScore
                ? 'MÉDIO'
                : 'BAIXO')
        };
      };

      const dataToProcess = analysisResult?.disciplines || analysisResult;

      if (Array.isArray(dataToProcess)) {
        dataToProcess.forEach((disc) => {
          if (disc && disc.name) processStats(disc.name);
        });
      } else if (dataToProcess && typeof dataToProcess === 'object') {
        Object.keys(dataToProcess).forEach((rawSubject) => {
          if (rawSubject) processStats(rawSubject);
        });
      }

      const todayValidatedRows = validatedRows.filter(
        (r) => getDateKey(normalizeDate(r?.date || r?.createdAt)) === todayKey
      );

      const totalQ = todayValidatedRows.reduce(
        (acc, r) => acc + (parseInt(r?.total, 10) || 0),
        0
      );

      const totalC = todayValidatedRows.reduce(
        (acc, r) => acc + (parseInt(r?.correct, 10) || 0),
        0
      );

      const globalPct = totalQ > 0 ? Number(((totalC / totalQ) * 100).toFixed(2)) : 0;

      const existingSimuladosRaw = Array.isArray(prev.simulados)
        ? prev.simulados
        : Object.values(prev.simulados || {});

      const existingSimulados = existingSimuladosRaw.filter(Boolean);
      let updatedSimulados = existingSimulados;

      if (totalQ > 0) {
        const newSimuladoEvent = {
          id: generateId('sim'),
          batchId,
          date: todayKey,
          score: globalPct,
          total: totalQ,
          correct: totalC,
          type: 'auto-analyzer',
          subject: 'Simulado Geral',
          createdAt: nowIso,
          lastUpdated: nowIso
        };

        const withoutDuplicateToday = existingSimulados.filter(
          (s) => !(s?.date === todayKey && s?.type === 'auto-analyzer')
        );

        updatedSimulados = [...withoutDuplicateToday, newSimuladoEvent]
          .sort(
            (a, b) =>
              new Date(a?.date || a?.lastUpdated || a?.createdAt || 0).getTime() -
              new Date(b?.date || b?.lastUpdated || b?.createdAt || 0).getTime()
          )
          .slice(-100);
      }

      processedDisciplines = totalProcessedDisciplines;
      finalTotalQ = totalQ;

      return {
        ...prev,
        categories: newCategories,
        simuladoRows: validatedRows,
        simulados: updatedSimulados,
        lastUpdated: nowIso
      };
    });

    if (finalTotalQ > 0 && processedDisciplines > 0) {
      showToast('Simulado processado com sucesso!', 'success');
      useAppStore.getState().awardExperience?.(500);
    } else if (processedDisciplines > 0) {
      showToast('Matérias encontradas, mas nenhuma questão válida foi salva hoje.', 'warning');
    } else {
      showToast('Nenhuma matéria correspondente encontrada.', 'warning');
    }
  } catch (err) {
    console.error('FATAL ERROR IN handleSimuladoAnalysis:', err);
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
              onDeleteSession={deleteSession}
              onDeleteSimulado={deleteSimulado}
              mode="full"
          />
        )}
    </PageErrorBoundary>);
}
