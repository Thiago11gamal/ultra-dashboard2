import { PageErrorBoundary } from '../components/ErrorBoundary';
import React, { useState, useMemo } from 'react';
import SimuladoAnalysis from '../components/SimuladoAnalysis';
import AIGeneratedSimulado from '../components/ai/AIGeneratedSimulado';
import { useAppStore } from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { useToast } from '../hooks/useToast';
import { normalize, aliases } from '../utils/normalization';
import { computeCategoryStats } from '../engine';
import { getDateKey, normalizeDate } from '../utils/dateHelper';
import { generateId } from '../utils/idGenerator';
import {
  ListChecks, Brain, History as HistoryIcon,
  ChevronRight, Clock, Target, TrendingUp, TrendingDown,
  Minus, Sparkles, PenLine, BarChart3, CalendarDays
} from 'lucide-react';
import StudyHistory from '../components/StudyHistory';

/* ─────────────────────────────────────────────
   HELPER: Extrai timestamp seguro de uma row
   ───────────────────────────────────────────── */
const getRowTimestamp = (r) => {
  const raw = r?.lastUpdated || r?.createdAt || r?.date;
  if (!raw) return 0;
  const parsed = normalizeDate(raw);
  const t = parsed ? parsed.getTime() : new Date(raw).getTime();
  return Number.isFinite(t) ? t : 0;
};

/* ─────────────────────────────────────────────
   HELPER: Formata data/hora para exibição
   ───────────────────────────────────────────── */
const formatDateTime = (r) => {
  const raw = r?.lastUpdated || r?.createdAt || r?.date;
  if (!raw) return '—';
  const d = normalizeDate(raw);
  if (!d || isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

/* ─────────────────────────────────────────────
   HELPER: Determina a origem do simulado
   ───────────────────────────────────────────── */
const getSimuladoSource = (rows) => {
  if (!rows || rows.length === 0) return null;
  const hasAI = rows.some(r => r.batchId || r.source === 'ai-generated');
  const hasManual = rows.some(r => !r.batchId && r.source !== 'ai-generated');
  if (hasAI && hasManual) return 'mixed';
  if (hasAI) return 'ai';
  return 'manual';
};

/* ─────────────────────────────────────────────
   COMPONENTE: Badge de origem
   ───────────────────────────────────────────── */
const SourceBadge = ({ source }) => {
  if (!source) return null;
  const config = {
    ai:     { label: 'Simulado IA',     icon: Sparkles, cls: 'bg-purple-500/15 text-purple-300 border-purple-500/30' },
    manual: { label: 'Simulado Manual', icon: PenLine,  cls: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
    mixed:  { label: 'IA + Manual',     icon: BarChart3, cls: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' },
  };
  const c = config[source] || config.manual;
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${c.cls}`}>
      <Icon size={12} /> {c.label}
    </span>
  );
};

/* ─────────────────────────────────────────────
   COMPONENTE: Card de resumo diário (melhorado)
   ───────────────────────────────────────────── */
const DailyCard = ({ label, icon: Icon, data, accent, accentText, comparison }) => (
  <div className={`glass p-5 rounded-2xl border-l-4 ${accent} relative overflow-hidden group`}>
    {/* Glow decorativo */}
    <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity ${accent.replace('border-', 'bg-')}`} />

    <div className="flex items-center gap-2 mb-3 relative z-10">
      <Icon size={16} className={accentText} />
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
    </div>

    {data.totalQ > 0 ? (
      <div className="relative z-10">
        {/* Score principal */}
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-4xl font-black text-white tabular-nums">{data.pct}%</span>
          <span className="text-sm text-slate-400 font-medium">acerto</span>
          {/* Tendência */}
          {comparison !== null && (
            <span className={`ml-auto flex items-center gap-1 text-xs font-bold ${
              comparison > 0 ? 'text-emerald-400' : comparison < 0 ? 'text-rose-400' : 'text-slate-400'
            }`}>
              {comparison > 0 ? <TrendingUp size={14} /> : comparison < 0 ? <TrendingDown size={14} /> : <Minus size={14} />}
              {comparison > 0 ? '+' : ''}{comparison}pp
            </span>
          )}
        </div>

        {/* Métricas secundárias */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-black/20 rounded-xl p-2.5 text-center">
            <div className="text-lg font-black text-white tabular-nums">{data.totalC}<span className="text-slate-500 text-xs">/{data.totalQ}</span></div>
            <div className="text-[9px] text-slate-500 uppercase tracking-wider mt-0.5">Acertos</div>
          </div>
          <div className="bg-black/20 rounded-xl p-2.5 text-center">
            <div className="text-lg font-black text-white tabular-nums">{data.subjects}</div>
            <div className="text-[9px] text-slate-500 uppercase tracking-wider mt-0.5">Matérias</div>
          </div>
          <div className="bg-black/20 rounded-xl p-2.5 text-center">
            <div className="text-lg font-black text-white tabular-nums">{data.count}</div>
            <div className="text-[9px] text-slate-500 uppercase tracking-wider mt-0.5">Registros</div>
          </div>
        </div>

        {/* Breakdown por matéria (top 3) */}
        {data.bySubject && data.bySubject.length > 0 && (
          <div className="mt-3 space-y-1.5">
            <div className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Por Matéria</div>
            {data.bySubject.slice(0, 3).map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[11px] text-slate-300 truncate flex-1 min-w-0">{s.name}</span>
                <div className="w-20 h-1.5 bg-black/30 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${s.pct >= 70 ? 'bg-emerald-500' : s.pct >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                    style={{ width: `${Math.min(100, s.pct)}%` }}
                  />
                </div>
                <span className="text-[10px] font-bold text-slate-400 w-8 text-right tabular-nums">{s.pct}%</span>
              </div>
            ))}
          </div>
        )}
      </div>
    ) : (
      <div className="relative z-10 py-6 text-center">
        <Clock size={28} className="mx-auto mb-2 text-slate-600" />
        <p className="text-sm text-slate-500">Nenhum simulado registrado.</p>
      </div>
    )}
  </div>
);

/* ─────────────────────────────────────────────
   COMPONENTE: Cards de resumo Hoje / Ontem
   ───────────────────────────────────────────── */
function DailySummaryCards({ simuladoRows }) {
  const summary = useMemo(() => {
    const todayKey = getDateKey(normalizeDate(new Date()));
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayKey = getDateKey(normalizeDate(yesterdayDate));

    const calcDay = (dayKey) => {
      const rows = simuladoRows.filter((r) => {
        const rk = getDateKey(normalizeDate(r.date || r.createdAt));
        return rk === dayKey && (parseInt(r.total, 10) > 0 || parseInt(r.correct, 10) > 0);
      });
      const totalQ = rows.reduce((s, r) => s + (parseInt(r.total, 10) || 0), 0);
      const totalC = rows.reduce((s, r) => s + (parseInt(r.correct, 10) || 0), 0);
      const pct = totalQ > 0 ? Math.round((totalC / totalQ) * 100) : 0;
      const subjects = new Set(rows.map((r) => r.subject).filter(Boolean)).size;

      // Breakdown por matéria
      const subjectMap = {};
      rows.forEach(r => {
        const name = r.subject || 'Geral';
        if (!subjectMap[name]) subjectMap[name] = { c: 0, t: 0 };
        subjectMap[name].c += parseInt(r.correct, 10) || 0;
        subjectMap[name].t += parseInt(r.total, 10) || 0;
      });
      const bySubject = Object.entries(subjectMap)
        .map(([name, d]) => ({ name, pct: d.t > 0 ? Math.round((d.c / d.t) * 100) : 0, c: d.c, t: d.t }))
        .sort((a, b) => b.t - a.t);

      return { totalQ, totalC, pct, subjects, count: rows.length, bySubject };
    };

    const today = calcDay(todayKey);
    const yesterday = calcDay(yesterdayKey);

    return { today, yesterday };
  }, [simuladoRows]);

  // Comparação: hoje vs ontem (em pontos percentuais)
  const comparison = (summary.today.totalQ > 0 && summary.yesterday.totalQ > 0)
    ? summary.today.pct - summary.yesterday.pct
    : null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
      {/* HOJE — lado esquerdo */}
      <DailyCard
        label="Hoje"
        icon={CalendarDays}
        data={summary.today}
        accent="border-emerald-500"
        accentText="text-emerald-400"
        comparison={comparison}
      />
      {/* ONTEM — lado direito */}
      <DailyCard
        label="Ontem"
        icon={HistoryIcon}
        data={summary.yesterday}
        accent="border-blue-500"
        accentText="text-blue-400"
        comparison={null}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────
   PÁGINA PRINCIPAL: Simulados
   ───────────────────────────────────────────── */
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

  const categoriesArray = useMemo(
    () => Array.isArray(data?.categories) ? data.categories : Object.values(data?.categories || {}),
    [data]
  );
  const simuladoRowsArray = useMemo(
    () => Array.isArray(data?.simuladoRows) ? data.simuladoRows : Object.values(data?.simuladoRows || {}),
    [data]
  );
  const studySessionsArray = useMemo(
    () => Array.isArray(data?.studySessions) ? data.studySessions : Object.values(data?.studySessions || {}),
    [data]
  );

  /* ── Rows do formulário manual (apenas matÃ©rias/assuntos cadastrados) ── */
  const displayRows = useMemo(() => {
    if (!categoriesArray.length || !data?.categories) return [];
    const todayKey = getDateKey(normalizeDate(new Date()));
    const rawTodayRows = simuladoRowsArray.filter(
      r => getDateKey(normalizeDate(r.date || r.createdAt)) === todayKey
    );
    const rows = [];
    const savedManualRows = {};
    rawTodayRows.forEach(r => {
      if (!r.isAuto && r.source !== 'ai-generated') {
        const key = `${normalize(r.subject)}-${normalize(r.topic)}`;
        savedManualRows[key] = r;
      }
    });
    categoriesArray.forEach(cat => {
      const rawTasks = cat.tasks || [];
      const tasks = Array.isArray(rawTasks) ? rawTasks : Object.values(rawTasks);
      if (tasks.length === 0) {
        const key = `${normalize(cat.name)}-${normalize('nenhum')}`;
        rows.push(savedManualRows[key] || {
          id: `manual-fallback-${cat.id}`, subject: cat.name, topic: 'nenhum',
          correct: 0, total: 0, isAuto: false, source: 'manual'
        });
      } else {
        tasks.forEach(task => {
          const title = String(task.title || task.text || '').trim();
          if (!title) return;
          const key = `${normalize(cat.name)}-${normalize(title)}`;
          rows.push(savedManualRows[key] || {
            id: `manual-${cat.id}-${task.id}`, subject: cat.name, topic: title,
            correct: 0, total: 0, isAuto: false, source: 'manual'
          });
        });
      }
    });
    return rows;
  }, [categoriesArray, simuladoRowsArray]);

  /* ── FIX: Último simulado — lógica corrigida e robusta ── */
  const lastSimuladoData = useMemo(() => {
    if (!simuladoRowsArray.length) return { rows: [], source: null, timestamp: null };

    // 1. Filtra apenas rows com dados reais
    const answeredRows = simuladoRowsArray.filter(
      (r) => parseInt(r.total, 10) > 0 || parseInt(r.correct, 10) > 0
    );
    if (answeredRows.length === 0) return { rows: [], source: null, timestamp: null };

    // 2. Ordena por timestamp (mais recente primeiro)
    const sorted = [...answeredRows].sort((a, b) => getRowTimestamp(b) - getRowTimestamp(a));
    const lastRef = sorted[0];
    if (!lastRef) return { rows: [], source: null, timestamp: null };

    let resultRows;

    // 3. Estratégia A: batchId (Simulado IA)
    if (lastRef.batchId) {
      resultRows = simuladoRowsArray.filter((r) => r.batchId === lastRef.batchId);
    } else {
      // 4. Estratégia B: mesma data + mesma origem (manual)
      const refDateKey = getDateKey(normalizeDate(
        lastRef.date || lastRef.lastUpdated || lastRef.createdAt || new Date()
      ));
      resultRows = simuladoRowsArray.filter((r) => {
        // Não misturar IA com manual
        if (r.batchId !== lastRef.batchId) return false;
        const rowDateKey = getDateKey(normalizeDate(
          r.date || r.lastUpdated || r.createdAt || ''
        ));
        return rowDateKey === refDateKey;
      });
    }

    return {
      rows: resultRows.length > 0 ? resultRows : [lastRef],
      source: getSimuladoSource(resultRows),
      timestamp: formatDateTime(lastRef),
    };
  }, [simuladoRowsArray]);

  const [mode, setMode] = useState('ai-generator');
  const [subMode, setSubMode] = useState('ia');

  // Guarda de segurança
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

  /* ── Handler de análise (salvamento) ── */
  const handleSimuladoAnalysis = (payload) => {
    try {
      const analysisResult = payload?.analysis || payload || {};
      const rawRows = Array.isArray(payload?.rawRows) ? payload.rawRows : [];
      const todayKey = getDateKey(normalizeDate(new Date()));
      const nowIso = new Date().toISOString();
      const batchId = generateId('batch');

      const validRowsForToast = rawRows.filter(
        (r) => r && r.subject && r.topic && Number(r.total) > 0
      );
      const totalQForToast = validRowsForToast.reduce((s, r) => s + (Number(r.total) || 0), 0);

      setData((current) => {
        const prev = current || {};
        const newCategories = JSON.parse(JSON.stringify(
          Array.isArray(prev.categories) ? prev.categories : Object.values(prev.categories || {})
        ));
        const prevSimuladoRowsArray = Array.isArray(prev.simuladoRows)
          ? prev.simuladoRows : Object.values(prev.simuladoRows || {});

        const submittedIds = new Set(rawRows.map(r => r.id).filter(Boolean));
        const rowsToKeep = prevSimuladoRowsArray.filter((r) => {
          if (r?.id && submittedIds.has(r.id)) return false;
          const isToday = getDateKey(normalizeDate(r?.date || r?.createdAt)) === todayKey;
          const isManual = r && !r.isAuto && r.source !== 'ai-generated';
          return !(isToday && isManual);
        });

        const manualSubmittedRows = rawRows
          .filter((r) => r && r.subject && r.topic && Number.isFinite(Number(r.total)) && Number(r.total) > 0)
          .map((r) => {
            const total = Math.max(0, Number(r.total) || 0);
            const correct = Math.max(0, Math.min(Number(r.correct) || 0, total));
            return {
              ...r, id: r.id || generateId('row'), batchId: r.batchId || batchId,
              date: r.date || todayKey, createdAt: nowIso, lastUpdated: nowIso,
              validated: true, isAuto: false, source: 'manual',
              subject: String(r.subject || '').trim(), topic: String(r.topic || '').trim(),
              correct, total
            };
          });

        const getMs = (r) => {
          const raw = r?.lastUpdated || r?.createdAt || r?.date;
          if (!raw) return 0;
          const parsed = normalizeDate(raw);
          const t = parsed ? parsed.getTime() : new Date(raw).getTime();
          return Number.isFinite(t) ? t : 0;
        };

        const validatedRows = [...rowsToKeep, ...manualSubmittedRows]
          .sort((a, b) => getMs(a) - getMs(b)).slice(-300);

        // Processar stats por categoria
        const processStats = (targetName) => {
          const discNameNorm = normalize(String(targetName || ''));
          if (!discNameNorm) return;
          let catIdx = newCategories.findIndex(c => c && c.name && normalize(c.name) === discNameNorm);
          if (catIdx === -1) {
            catIdx = newCategories.findIndex(c =>
              c && c.name && aliases[normalize(c.name)]?.some((a) => normalize(a) === discNameNorm)
            );
          }
          if (catIdx === -1) return;
          const cat = newCategories[catIdx];
          if (!cat.simuladoStats) {
            cat.simuladoStats = { history: [], average: 0, lastAttempt: 0, trend: 'stable', level: 'BAIXO' };
          }
          const rawHistory = Array.isArray(cat.simuladoStats.history)
            ? cat.simuladoStats.history : Object.values(cat.simuladoStats.history || {});
          const history = rawHistory.filter(Boolean);
          const historyWithoutToday = history.filter((h) => h?.date !== todayKey);

          const todayRows = validatedRows.filter((r) => {
            const rowSubjectNorm = normalize(String(r?.subject || ''));
            const isToday = getDateKey(normalizeDate(r?.date || r?.createdAt)) === todayKey;
            const isSubject = rowSubjectNorm === discNameNorm ||
              aliases[rowSubjectNorm]?.some((a) => normalize(a) === discNameNorm);
            return isToday && isSubject;
          });

          const finalC = todayRows.reduce((sum, r) => sum + (Number(r.correct) || 0), 0);
          const finalQ = todayRows.reduce((sum, r) => sum + (Number(r.total) || 0), 0);
          const finalTimeSpent = todayRows.reduce((sum, r) => sum + (Number(r.timeSpent) || 0), 0);
          const finalTimedQuestoes = todayRows.reduce(
            (sum, r) => sum + (Number(r.timeSpent) > 0 ? Number(r.total) || 0 : 0), 0
          );

          const topicsMap = {};
          todayRows.forEach((r) => {
            const tName = String(r.topic || '').trim();
            if (!topicsMap[tName]) topicsMap[tName] = { correct: 0, total: 0, difficulty: [], timeSpent: 0, timedQuestoes: 0 };
            topicsMap[tName].correct += Number(r.correct) || 0;
            topicsMap[tName].total += Number(r.total) || 0;
            const diff = Number(r.difficulty);
            topicsMap[tName].difficulty.push(Number.isFinite(diff) ? diff : 1.0);
            const rowTime = Number(r.timeSpent) || 0;
            if (rowTime > 0) { topicsMap[tName].timeSpent += rowTime; topicsMap[tName].timedQuestoes += Number(r.total) || 0; }
          });

          const finalTopics = Object.entries(topicsMap).map(([name, td]) => ({
            name, correct: td.correct, total: td.total,
            percentage: td.total > 0 ? (td.correct / td.total) * 100 : 0,
            difficulty: td.difficulty.length > 0 ? td.difficulty.reduce((a, b) => a + b, 0) / td.difficulty.length : 1.0,
            timeSpent: td.timeSpent, timedQuestoes: td.timedQuestoes
          }));

          const maxScore = Number(cat.maxScore) || 100;
          if (finalQ > 0) {
            const totalDifficultyWeight = finalTopics.reduce((acc, t) => acc + (Number(t.difficulty) || 1.0) * (Number(t.total) || 0), 0);
            const avgDifficulty = finalTopics.length > 0 && totalDifficultyWeight > 0 ? totalDifficultyWeight / finalQ : 1.0;
            historyWithoutToday.push({
              date: todayKey, correct: finalC, total: finalQ,
              difficulty: Number(avgDifficulty.toFixed(2)),
              score: Math.min(maxScore, Math.max(0, (finalC / finalQ) * maxScore)),
              timeSpent: finalTimeSpent, timedQuestoes: finalTimedQuestoes, topics: finalTopics,
            });
          }

          const historyWithCurrent = historyWithoutToday.slice(-50);
          const statsResult = computeCategoryStats(historyWithCurrent, Number(cat.weight) || 100, 60, maxScore);
          cat.simuladoStats = {
            ...cat.simuladoStats, history: historyWithCurrent,
            average: Number((statsResult?.mean || 0).toFixed(2)),
            trend: statsResult?.trend || 'stable',
            lastAttempt: finalQ > 0 ? (finalC / finalQ) * maxScore : cat.simuladoStats.lastAttempt,
            level: statsResult?.level || 'BAIXO'
          };
        };

        const dataToProcess = analysisResult?.disciplines || analysisResult;
        if (Array.isArray(dataToProcess)) {
          dataToProcess.forEach((disc) => { if (disc && disc.name) processStats(disc.name); });
        } else if (dataToProcess && typeof dataToProcess === 'object') {
          Object.keys(dataToProcess).forEach((rawSubject) => { if (rawSubject) processStats(rawSubject); });
        }

        // Evento global de simulado
        const todayValidatedRows = validatedRows.filter(
          (r) => getDateKey(normalizeDate(r?.date || r?.createdAt)) === todayKey
        );
        const totalQ = todayValidatedRows.reduce((acc, r) => acc + (parseInt(r?.total, 10) || 0), 0);
        const totalC = todayValidatedRows.reduce((acc, r) => acc + (parseInt(r?.correct, 10) || 0), 0);
        const globalPct = totalQ > 0 ? Number(((totalC / totalQ) * 100).toFixed(2)) : 0;

        const existingSimuladosRaw = Array.isArray(prev.simulados) ? prev.simulados : Object.values(prev.simulados || {});
        let updatedSimulados = existingSimuladosRaw.filter(Boolean);
        if (totalQ > 0) {
          const newSimuladoEvent = {
            id: generateId('sim'), batchId, date: todayKey, score: globalPct,
            total: totalQ, correct: totalC, type: 'auto-analyzer', subject: 'Simulado Geral',
            createdAt: nowIso, lastUpdated: nowIso
          };
          updatedSimulados = [...updatedSimulados.filter(s => !(s?.date === todayKey && s?.type === 'auto-analyzer')), newSimuladoEvent]
            .sort((a, b) => getMs(a) - getMs(b)).slice(-100);
        }

        return { ...prev, categories: newCategories, simuladoRows: validatedRows, simulados: updatedSimulados, lastUpdated: nowIso };
      });

      if (totalQForToast > 0) {
        showToast('Simulado processado com sucesso!', 'success');
        useAppStore.getState().awardExperience?.(500);
      } else {
        showToast('Nenhuma questão válida encontrada.', 'warning');
      }
    } catch (err) {
      console.error('FATAL ERROR IN handleSimuladoAnalysis:', err);
      showToast('Erro fatal ao salvar simulado. Verifique os logs.', 'error');
    }
  };

  /* ── Configuração das tabs ── */
  const tabs = [
    { id: 'ai-generator', label: 'Gerar Simulado', icon: Brain },
    { id: 'analyzer',     label: 'Último Simulado', icon: ListChecks },
    { id: 'history',      label: 'Histórico', icon: HistoryIcon },
  ];

  return (
    <PageErrorBoundary pageName="Simulados">
      {/* ── Header + Tabs ── */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center border border-indigo-500/30">
            <Brain size={22} className="text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Simulados</h1>
            <p className="text-xs text-slate-400 mt-0.5">Gere, analise e acompanhe seus simulados IA e manuais</p>
          </div>
        </div>

        {/* Tabs premium */}
        <div className="flex flex-wrap items-center bg-white/5 border border-white/10 rounded-2xl p-1.5 w-fit gap-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = mode === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setMode(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 text-sm font-black rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon size={16} className={isActive ? '' : 'opacity-70'} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Conteúdo por modo ── */}
      {mode === 'analyzer' ? (
        <div className="animate-fade-in">
          {/* Header do último simulado */}
          {lastSimuladoData.rows.length > 0 && (
            <div className="glass p-5 rounded-2xl mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center border border-indigo-500/25">
                  <Target size={18} className="text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-white">Último Simulado Realizado</h2>
                  <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                    <Clock size={11} /> {lastSimuladoData.timestamp}
                  </p>
                </div>
              </div>
              <SourceBadge source={lastSimuladoData.source} />
            </div>
          )}

          <SimuladoAnalysis
            rows={lastSimuladoData.rows}
            categories={categoriesArray}
            viewMode="report"
          />
        </div>
      ) : mode === 'ai-generator' ? (
        <div className="flex flex-col h-full animate-fade-in">
          {/* Sub-tabs IA / Manual */}
          <div className="w-full flex justify-center mb-6">
            <div className="flex gap-3 bg-slate-800/50 p-1.5 rounded-2xl w-fit border border-slate-700/50 shadow-inner">
              <button
                onClick={() => setSubMode('ia')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-sm transition-all duration-300 ${
                  subMode === 'ia'
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Brain size={16} className={subMode === 'ia' ? '' : 'opacity-70'} />
                Simulado IA
              </button>
              <button
                onClick={() => setSubMode('manual')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-sm transition-all duration-300 ${
                  subMode === 'manual'
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
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
        /* ── MODO HISTÓRICO ── */
        <div className="space-y-6 animate-fade-in">
          <DailySummaryCards simuladoRows={simuladoRowsArray} />
          <StudyHistory
            studySessions={studySessionsArray}
            categories={categoriesArray}
            simuladoRows={simuladoRowsArray}
            onDeleteSession={deleteSession}
            onDeleteSimulado={deleteSimulado}
            mode="performance"
          />
        </div>
      )}
    </PageErrorBoundary>
  );
}
