import { PageErrorBoundary } from '../components/ErrorBoundary';
import React, { useState, useMemo, useCallback } from 'react';
import SimuladoAnalysis from '../components/SimuladoAnalysis';
import AIGeneratedSimulado from '../components/ai/AIGeneratedSimulado';
import { useAppStore } from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { useToast } from '../hooks/useToast';
import { normalize, isSubjectMatch } from '../utils/normalization';
import { computeCategorySimuladoStats, DEFAULT_SIMULADO_HISTORY_CAP, resolveCategoryScoreDomain } from '../utils/simuladoReconciler';
import { computeEffectiveScoreRatio } from '../utils/aiSaveHelper';
import { getDateKey, normalizeDate } from '../utils/dateHelper';
import { generateId } from '../utils/idGenerator';
import { clearUrgencyCache, clearTopicsCache } from '../utils/coachCaches';
import { clearMcCache } from '../utils/coachAdaptive';
import {
  ListChecks, Brain, History as HistoryIcon,
  ChevronRight, Clock, Target, TrendingUp, TrendingDown,
  Minus, Sparkles, PenLine, BarChart3, CalendarDays, AlertTriangle
} from 'lucide-react';
import StudyHistory from '../components/StudyHistory';
import ErrorNotebook from '../components/ai/ErrorNotebook';

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

const isAiSimuladoRow = (r) =>
  r?.source === 'ai-generated' ||
  (Boolean(r?.batchId) && r?.source !== 'manual' && !String(r?.id || '').startsWith('manual'));

const getSimuladoSource = (rows) => {
  if (!rows || rows.length === 0) return null;
  const hasAI = rows.some(r => isAiSimuladoRow(r));
  const hasManual = rows.some(r => r?.source === 'manual' || !isAiSimuladoRow(r));
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
    ai: { label: 'Simulado IA', icon: Sparkles, cls: 'bg-purple-500/15 text-purple-300 border-purple-500/30' },
    manual: { label: 'Simulado Manual', icon: PenLine, cls: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
    mixed: { label: 'IA + Manual', icon: BarChart3, cls: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' },
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
            <span className={`ml-auto flex items-center gap-1 text-xs font-bold ${comparison > 0 ? 'text-emerald-400' : comparison < 0 ? 'text-rose-400' : 'text-slate-400'
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
      const safeRows = (Array.isArray(simuladoRows) ? simuladoRows : Object.values(simuladoRows || {})).filter(Boolean);
      const rows = safeRows.filter((r) => {
        if (r.valid === false || r.validated === false) return false;
        const rk = getDateKey(normalizeDate(r.date || r.createdAt));
        return rk === dayKey && (parseInt(r.total, 10) > 0 || parseInt(r.correct, 10) > 0);
      });
      let totalQ = 0;
      let totalC = 0;
      const subjectMap = {};

      rows.forEach(r => {
        const rowT = Math.max(0, parseInt(r.total, 10) || 0);
        const rowC = Math.max(0, Math.min(rowT, parseInt(r.correct, 10) || 0));
        totalQ += rowT;
        totalC += rowC;

        const name = r.subject || 'Geral';
        if (!subjectMap[name]) subjectMap[name] = { c: 0, t: 0 };
        subjectMap[name].c += rowC;
        subjectMap[name].t += rowT;
      });

      const safeC = Math.min(totalC, totalQ);
      const pct = totalQ > 0 ? Math.max(0, Math.min(100, Math.round((safeC / totalQ) * 100))) : 0;
      const subjects = new Set(rows.map((r) => r.subject).filter(Boolean)).size;

      const bySubject = Object.entries(subjectMap)
        .map(([name, d]) => {
          const safeSubjC = Math.min(d.c, d.t);
          return { name, pct: d.t > 0 ? Math.round((safeSubjC / d.t) * 100) : 0, c: safeSubjC, t: d.t };
        })
        .sort((a, b) => b.t - a.t);

      return { totalQ, totalC: safeC, pct, subjects, count: rows.length, bySubject };
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
  const { categories, simuladoRows, studySessions } = useAppStore(useShallow(state => {
    const contest = state.appState?.contests?.[state.appState?.activeId] || {};
    return {
      categories: contest.categories,
      simuladoRows: contest.simuladoRows,
      studySessions: contest.studySessions
    };
  }));
  const setData = useAppStore(state => state.setData);
  const showToast = useToast();
  const deleteSession = useAppStore((state) => state.deleteSession);
  const deleteSimulado = useAppStore((state) => state.deleteSimulado);

  // P05 PERF FIX: Granular dependencies directly referencing destructured state
  const categoriesArray = useMemo(
    () => (Array.isArray(categories) ? categories : Object.values(categories || {})).filter(Boolean),
    [categories]
  );
  const simuladoRowsArray = useMemo(
    () => (Array.isArray(simuladoRows) ? simuladoRows : Object.values(simuladoRows || {})).filter(Boolean),
    [simuladoRows]
  );
  const studySessionsArray = useMemo(
    () => (Array.isArray(studySessions) ? studySessions : Object.values(studySessions || {})).filter(Boolean),
    [studySessions]
  );

  /* ── Rows do formulário manual (apenas matérias/assuntos cadastrados) ── */
  const displayRows = useMemo(() => {
    if (!categoriesArray.length || !categories) return [];
    const todayKey = getDateKey(normalizeDate(new Date()));
    const rawTodayRows = simuladoRowsArray.filter(
      r => r && getDateKey(normalizeDate(r.date || r.createdAt)) === todayKey
    );
    const rows = [];
    const savedManualRows = {};
    rawTodayRows.forEach(r => {
      if (!r.isAuto && r.source !== 'ai-generated') {
        if (r.categoryId && r.topicId) {
          savedManualRows[`${r.categoryId}-${r.topicId}`] = r;
        }
        if (r.subject && r.topic) {
          savedManualRows[`${normalize(r.subject)}-${normalize(r.topic)}`] = r;
        }
      }
    });
    categoriesArray.forEach(cat => {
      if (!cat) return;
      const rawTasks = cat.tasks || [];
      const tasks = (Array.isArray(rawTasks) ? rawTasks : Object.values(rawTasks)).filter(Boolean);
      if (tasks.length === 0) {
        const keyStr = `${normalize(cat.name)}-${normalize('nenhum')}`;
        const keyId = `${cat.id}-nenhum`;
        const existing = savedManualRows[keyId] || savedManualRows[keyStr];
        rows.push(existing ? {
          ...existing,
          categoryId: existing.categoryId || cat.id,
          topicId: existing.topicId || 'nenhum',
          subject: cat.name,
          topic: 'nenhum'
        } : {
          id: `manual-fallback-${cat.id}`, categoryId: cat.id, topicId: 'nenhum', subject: cat.name, topic: 'nenhum',
          correct: 0, total: 0, isAuto: false, source: 'manual'
        });
      } else {
        tasks.forEach(task => {
          const title = String(task.title || task.text || '').trim();
          if (!title) return;
          const keyStr = `${normalize(cat.name)}-${normalize(title)}`;
          const keyId = `${cat.id}-${task.id}`;
          const existing = savedManualRows[keyId] || savedManualRows[keyStr];
          rows.push(existing ? {
            ...existing,
            categoryId: existing.categoryId || cat.id,
            topicId: existing.topicId || task.id,
            subject: cat.name,
            topic: title
          } : {
            id: `manual-${cat.id}-${task.id}`, categoryId: cat.id, topicId: task.id, subject: cat.name, topic: title,
            correct: 0, total: 0, isAuto: false, source: 'manual'
          });
        });
      }
    });
    return rows;
  }, [categoriesArray, simuladoRowsArray, categories]);

  /* ── FIX: Último simulado — lógica corrigida e robusta ── */
  const lastSimuladoData = useMemo(() => {
    if (!simuladoRowsArray.length) return { rows: [], source: null, timestamp: null };

    // 1. Filtra apenas rows com dados reais
    const answeredRows = simuladoRowsArray.filter(
      (r) => r && typeof r === 'object' && (parseInt(r.total, 10) > 0 || parseInt(r.correct, 10) > 0)
    );
    if (answeredRows.length === 0) return { rows: [], source: null, timestamp: null };

    // 2. Ordena por timestamp (mais recente primeiro)
    const sorted = [...answeredRows].sort((a, b) => getRowTimestamp(b) - getRowTimestamp(a));
    const lastRef = sorted[0];
    if (!lastRef) return { rows: [], source: null, timestamp: null };

    let resultRows = [];

    // 3. Estratégia A: batchId (Simulado IA)
    if (lastRef.batchId && lastRef.source !== 'manual') {
      resultRows = simuladoRowsArray.filter((r) => r && r.batchId === lastRef.batchId);
      // ✅ FIX BUG-49: fallback se batchId não encontrar nada
      if (resultRows.length === 0) {
        console.warn(`[SimuladoFilter] batchId ${lastRef.batchId} não encontrou rows. Fallback para data.`);
        // Cai para estratégia B
      }
    }

    if (!lastRef.batchId || (lastRef.batchId && resultRows.length === 0) || lastRef.source === 'manual') {
      // 4. Estratégia B: mesma data + mesma origem (manual)
      const refDateKey = getDateKey(normalizeDate(
        lastRef.date || lastRef.lastUpdated || lastRef.createdAt || new Date()
      ));

      // ✅ FIX BUG-36: cache de dateKey por row (evita N chamadas de normalizeDate)
      const dateKeyCache = new WeakMap();
      const getRowDateKey = (r) => {
        if (!r || typeof r !== 'object') return null;
        if (dateKeyCache.has(r)) return dateKeyCache.get(r);
        const key = getDateKey(normalizeDate(r.date || r.createdAt));
        dateKeyCache.set(r, key);
        return key;
      };

      resultRows = simuladoRowsArray.filter((r) => {
        if (!r || typeof r !== 'object') return false;
        // Para manual, queremos agrupar todos do dia excluindo linhas de IA
        const isAi = isAiSimuladoRow(r);
        const isManual = !isAi && (
          r?.source === 'manual' ||
          r?.isAuto === false ||
          (r?.source == null && r?.isAuto == null && r?.id?.startsWith('manual'))
        );
        if (!isManual) return false;
        return getRowDateKey(r) === refDateKey;
      });

      // ✅ FIX BUG-49: fallback final se nada encontrado
      if (resultRows.length === 0) {
        console.warn(`[SimuladoFilter] Data ${refDateKey} não encontrou rows manual.`);
      }
    }

    const finalRows = resultRows.length > 0 ? resultRows : [lastRef];
    return {
      rows: finalRows,
      source: getSimuladoSource(finalRows),
      timestamp: formatDateTime(lastRef),
    };
  }, [simuladoRowsArray]);

  const [mode, setMode] = useState('ai-generator');
  const [subMode, setSubMode] = useState('ia');

  /* ── Handler de análise (salvamento) ── */
  const handleSimuladoAnalysis = useCallback((payload) => {
    try {
      const analysisResult = payload?.analysis || payload || {};
      const rawRows = Array.isArray(payload?.rawRows) ? payload.rawRows : [];
      // G-10 FIX: Validar rawRows antes de processar
      if (!rawRows.length) {
        showToast('Nenhuma linha válida para processar.', 'warning');
        return;
      }
      const todayKey = getDateKey(normalizeDate(new Date()));
      const nowIso = new Date().toISOString();
      const batchId = generateId('batch');

      const validRowsForToast = rawRows.filter(
        (r) => r && r.subject && (String(r.topic || '').trim() || parseInt(r.total, 10) > 0) && Number(r.total) > 0
      );
      const totalQForToast = validRowsForToast.reduce((s, r) => s + (Number(r.total) || 0), 0);
      let shouldAwardDailyXP = false;

      setData((current) => {
        if (!current || typeof current !== 'object') return current;
        if (!current.categories && !current.simuladoRows) return current;
        const prev = current;
        const newCategories = (Array.isArray(prev.categories) ? prev.categories : Object.values(prev.categories || {}))
          .filter(Boolean)
          .map(c => ({
            ...c,
            simuladoStats: c.simuladoStats
              ? {
                ...c.simuladoStats,
                history: Array.isArray(c.simuladoStats.history)
                  ? [...c.simuladoStats.history]
                  : Object.values(c.simuladoStats.history || {})
              }
              : undefined
          }));
        const prevSimuladoRowsArray = Array.isArray(prev.simuladoRows)
          ? prev.simuladoRows : Object.values(prev.simuladoRows || {});

        const actuallySubmittedRows = rawRows
          .filter((r) => r && r.subject && Number.isFinite(Number(r.total)) && Number(r.total) > 0)
          .map((r) => ({ ...r, topic: String(r.topic || '').trim() || 'Geral' }));
        const submittedIds = new Set(actuallySubmittedRows.map(r => r.id).filter(Boolean));
        const submittedKeys = new Set();
        actuallySubmittedRows.forEach(r => {
          if (r.categoryId && r.topicId) submittedKeys.add(`${r.categoryId}-${r.topicId}`);
          if (r.subject && r.topic) submittedKeys.add(`${normalize(r.subject)}-${normalize(r.topic)}`);
        });

        const rowsToKeep = prevSimuladoRowsArray.filter((r) => {
          const isToday = getDateKey(normalizeDate(r?.date || r?.createdAt)) === todayKey;
          const isManual = r && !r.isAuto && r.source !== 'ai-generated';

          if (isToday && isManual) {
            if (r?.id && submittedIds.has(r.id)) return false;

            const key1 = (r?.categoryId && r?.topicId) ? `${r.categoryId}-${r.topicId}` : null;
            const key2 = (r?.subject && r?.topic) ? `${normalize(r.subject)}-${normalize(r.topic)}` : null;

            if (key1 && submittedKeys.has(key1)) return false;
            if (key2 && submittedKeys.has(key2)) return false;
          }

          return true;
        });

        const manualSubmittedRows = actuallySubmittedRows
          .map((r) => {
            const total = Math.max(0, Number(r.total) || 0);
            const correct = Math.max(0, Math.min(Number(r.correct) || 0, total));
            const pct = total > 0 ? Math.min(100, (correct / total) * 100) : 0;
            const hasExplicitPoints =
              r.scorePoints != null &&
              typeof r.scorePoints !== 'boolean' &&
              String(r.scorePoints).trim() !== '' &&
              Number.isFinite(Number(r.scorePoints)) &&
              r.scoreUnit !== 'pct' &&
              !r.isPercentage;
            const { scorePoints: _stalePts, ...cleanRow } = r;
            return {
              ...cleanRow, id: r.id || generateId('row'), batchId: batchId,
              date: r.date || todayKey, createdAt: nowIso, lastUpdated: nowIso,
              validated: true, isAuto: false, source: 'manual',
              subject: String(r.subject || '').trim(), topic: String(r.topic || '').trim() || 'Geral',
              correct, total,
              ...(hasExplicitPoints
                ? { scorePoints: Number(r.scorePoints) }
                : { score: pct, scorePct: pct, isPercentage: true, scoreUnit: 'pct' })
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
          const catIdx = newCategories.findIndex(c => c && c.name && isSubjectMatch(c.name, targetName));
          if (catIdx === -1) return;
          const cat = newCategories[catIdx];
          if (!cat.simuladoStats) {
            cat.simuladoStats = { history: [], average: 0, lastAttempt: 0, trend: 'stable', level: 'BAIXO' };
          }
          const rawHistory = Array.isArray(cat.simuladoStats.history)
            ? cat.simuladoStats.history : Object.values(cat.simuladoStats.history || {});
          const history = rawHistory.filter(Boolean);
          const todayHistoryEntries = history.filter((h) => getDateKey(normalizeDate(h?.date || h?.createdAt)) === todayKey);
          const historyWithoutToday = history.filter((h) => getDateKey(normalizeDate(h?.date || h?.createdAt)) !== todayKey);

          const todayRows = validatedRows.filter((r) => {
            const isToday = getDateKey(normalizeDate(r?.date || r?.createdAt)) === todayKey;
            const isSubject = (cat.id && r?.categoryId && r.categoryId === cat.id) ||
              isSubjectMatch(r?.subject, cat.name);
            return isToday && isSubject;
          });
          const todayBatchIds = Array.from(new Set([
            ...todayHistoryEntries.flatMap((h) => [
              ...(h?.batchId ? [String(h.batchId)] : []),
              ...(Array.isArray(h?.batchIds) ? h.batchIds.filter(Boolean).map(String) : [])
            ]),
            ...todayRows.map((r) => r?.batchId).filter(Boolean).map(String)
          ]));

          const finalC = todayRows.reduce((sum, r) => sum + (Number(r.correct) || 0), 0);
          const finalQ = todayRows.reduce((sum, r) => sum + (Number(r.total) || 0), 0);
          const finalBlanks = todayRows.reduce((sum, r) => sum + Math.max(0, Number(r.blanks) || 0), 0);
          const finalTimeSpent = todayRows.reduce((sum, r) => sum + (Number(r.timeSpent) || 0), 0);
          const finalTimedQuestoes = todayRows.reduce(
            (sum, r) => sum + (Number(r.timeSpent) > 0 ? Number(r.total) || 0 : 0), 0
          );
          const contestPenalty = Math.max(0, Number(prev?.penaltyPerWrong) || 0);

          const topicsMap = {};
          todayRows.forEach((r) => {
            const tName = String(r.topic || '').trim() || 'Geral';
            const rowTaskId = r.taskId || r.topicId || null;
            if (!topicsMap[tName]) {
              topicsMap[tName] = {
                correct: 0, total: 0, difficulty: [], timeSpent: 0, timedQuestoes: 0,
                taskId: rowTaskId
              };
            } else if (!topicsMap[tName].taskId && rowTaskId) {
              topicsMap[tName].taskId = rowTaskId;
            }
            topicsMap[tName].correct += Number(r.correct) || 0;
            topicsMap[tName].total += Number(r.total) || 0;
            const diff = Number(r.difficulty);
            topicsMap[tName].difficulty.push(Number.isFinite(diff) && diff > 0 ? diff : 1.0);
            const rowTime = Number(r.timeSpent) || 0;
            if (rowTime > 0) { topicsMap[tName].timeSpent += rowTime; topicsMap[tName].timedQuestoes += Number(r.total) || 0; }
          });

          const finalTopics = Object.entries(topicsMap).map(([name, td]) => ({
            name, taskId: td.taskId, correct: td.correct, total: td.total,
            percentage: td.total > 0 ? (td.correct / td.total) * 100 : 0,
            difficulty: td.difficulty.length > 0 ? td.difficulty.reduce((a, b) => a + b, 0) / td.difficulty.length : 1.0,
            timeSpent: td.timeSpent, timedQuestoes: td.timedQuestoes
          }));

          const { maxScore, minScore, range: scoreRange } = resolveCategoryScoreDomain(
            cat,
            prev?.maxScore,
            prev?.minScore
          );
          if (finalQ > 0) {
            const totalDifficultyWeight = finalTopics.reduce((acc, t) => acc + (Number(t.difficulty) || 1.0) * (Number(t.total) || 0), 0);
            const avgDifficulty = finalTopics.length > 0 && totalDifficultyWeight > 0 ? totalDifficultyWeight / finalQ : 1.0;
            const effCat = computeEffectiveScoreRatio(finalC, finalQ, {
              blanks: finalBlanks,
              penaltyPerWrong: contestPenalty,
              minScore,
              maxScore,
            });
            const computedScore = minScore + effCat.ratio * scoreRange;
            historyWithoutToday.push({
              date: todayKey, correct: finalC, total: finalQ,
              ...(finalBlanks > 0 ? { blanks: effCat.blanks } : {}),
              ...(effCat.penaltyApplied ? { netPoints: effCat.netPoints, penaltyPerWrong: contestPenalty } : {}),
              difficulty: Number(avgDifficulty.toFixed(2)),
              score: Math.min(maxScore, Math.max(minScore, computedScore)),
              timeSpent: finalTimeSpent, timedQuestoes: finalTimedQuestoes, topics: finalTopics,
              ...(todayBatchIds.length > 0 ? { batchId: todayBatchIds[todayBatchIds.length - 1], batchIds: todayBatchIds } : {}),
            });
          }

          cat.simuladoStats = computeCategorySimuladoStats(
            cat,
            historyWithoutToday,
            prev?.maxScore,
            prev?.minScore,
            { maxHistory: DEFAULT_SIMULADO_HISTORY_CAP }
          );
        };

        const subjectsToProcess = new Set();
        const dataToProcess = analysisResult?.disciplines || analysisResult;
        if (Array.isArray(dataToProcess)) {
          dataToProcess.forEach((disc) => { if (disc && disc.name) subjectsToProcess.add(disc.name); });
        } else if (dataToProcess && typeof dataToProcess === 'object') {
          Object.keys(dataToProcess).forEach((rawSubject) => { if (rawSubject) subjectsToProcess.add(rawSubject); });
        }
        manualSubmittedRows.forEach((r) => { if (r && r.subject) subjectsToProcess.add(r.subject); });
        const dedupedSubjects = new Set();
        subjectsToProcess.forEach((subName) => {
          const norm = normalize(subName);
          if (!dedupedSubjects.has(norm)) {
            dedupedSubjects.add(norm);
            processStats(subName);
          }
        });

        // Evento global de simulado
        const todayValidatedRows = validatedRows.filter(
          (r) => getDateKey(normalizeDate(r?.date || r?.createdAt)) === todayKey
        );
        let totalQ = 0;
        let totalC = 0;
        let totalBlanks = 0;
        todayValidatedRows.forEach(r => {
          const rT = Math.max(0, parseInt(r?.total, 10) || 0);
          const rC = rT > 0 ? Math.min(Math.max(0, parseInt(r?.correct, 10) || 0), rT) : 0;
          const rB = rT > 0 ? Math.min(Math.max(0, rT - rC), Math.max(0, parseInt(r?.blanks, 10) || 0)) : 0;
          totalQ += rT;
          totalC += rC;
          totalBlanks += rB;
        });
        const rawContestMax = Number.isFinite(Number(prev.maxScore)) && Number(prev.maxScore) > 0 ? Number(prev.maxScore) : 100;
        const rawContestMin = Number.isFinite(Number(prev.minScore)) ? Number(prev.minScore) : 0;
        const contestMin = Math.min(rawContestMin, rawContestMax);
        const contestMax = Math.max(rawContestMin, rawContestMax);
        const contestRange = Math.max(1e-9, contestMax - contestMin);
        const globalPenalty = Math.max(0, Number(prev?.penaltyPerWrong) || 0);
        const globalEff = computeEffectiveScoreRatio(totalC, totalQ, {
          blanks: totalBlanks,
          penaltyPerWrong: globalPenalty,
          minScore: contestMin,
          maxScore: contestMax,
        });
        const globalPointsRaw = totalQ > 0 ? (contestMin + globalEff.ratio * contestRange) : contestMin;
        const globalPoints = Number(Math.max(contestMin, Math.min(contestMax, globalPointsRaw)).toFixed(2));
        const globalPct = totalQ > 0 ? Math.max(0, Math.min(100, Number((globalEff.ratio * 100).toFixed(2)))) : 0;

        const existingSimuladosRaw = Array.isArray(prev.simulados) ? prev.simulados : Object.values(prev.simulados || {});
        let updatedSimulados = existingSimuladosRaw.filter(Boolean);
        const alreadyAwardedToday = updatedSimulados.some(
          s => s && s.type === 'auto-analyzer' && getDateKey(normalizeDate(s.date || s.createdAt)) === todayKey && s.xpAwarded
        );
        if (totalQ > 0) {
          shouldAwardDailyXP = totalQForToast > 0 && !alreadyAwardedToday;
          const newSimuladoEvent = {
            id: generateId('sim'), batchId, date: todayKey,
            score: globalPoints,
            scorePoints: globalPoints,
            scorePct: globalPct,
            total: totalQ, correct: totalC, type: 'auto-analyzer', subject: 'Simulado Geral',
            source: 'manual',
            scoreUnit: 'points',
            isPercentage: false,
            xpAwarded: Boolean(alreadyAwardedToday || totalQForToast > 0),
            createdAt: nowIso, lastUpdated: nowIso
          };
          updatedSimulados = [...updatedSimulados.filter(s => !(getDateKey(normalizeDate(s?.date || s?.createdAt)) === todayKey && s?.type === 'auto-analyzer')), newSimuladoEvent]
            .sort((a, b) => getMs(a) - getMs(b)).slice(-DEFAULT_SIMULADO_HISTORY_CAP);
        }

        return { ...prev, categories: newCategories, simuladoRows: validatedRows, simulados: updatedSimulados, lastUpdated: nowIso };
      });

      clearUrgencyCache();
      clearTopicsCache();
      clearMcCache();

      if (totalQForToast > 0) {
        showToast('Simulado processado com sucesso!', 'success');
        setMode('analyzer');
        if (shouldAwardDailyXP) {
          try {
            useAppStore.getState().awardExperience?.(500);
          } catch (xpErr) {
            console.warn('Falha não-bloqueante ao conceder XP do simulado:', xpErr);
          }
        }
      } else {
        showToast('Nenhuma questão válida encontrada.', 'warning');
      }
    } catch (err) {
      console.error('FATAL ERROR IN handleSimuladoAnalysis:', err);
      showToast('Erro fatal ao salvar simulado. Verifique os logs.', 'error');
    }
  }, [setData, showToast]);

  /* ── Configuração das tabs ── */
  const [drillErrors, setDrillErrors] = useState(null);

  const handleSendNotebookErrorsToFlashcards = useCallback((cardsBySubject, normFn) => {
    const nowIso = new Date().toISOString();
    let totalCreated = 0;
    setData((contest) => {
      if (!contest) return contest;
      const decks = Array.isArray(contest.flashcardDecks) ? [...contest.flashcardDecks] : [];
      Object.entries(cardsBySubject || {}).forEach(([subj, cards]) => {
        if (!Array.isArray(cards) || !cards.length) return;
        totalCreated += cards.length;
        const deckName = `Erros IA — ${subj}`;
        const idx = decks.findIndex((d) => d && normFn(d.name) === normFn(deckName));
        if (idx === -1) {
          decks.push({
            id: generateId('deck'),
            name: deckName,
            subject: subj,
            cards,
            createdAt: nowIso,
            lastUpdated: nowIso,
            stats: { totalReviews: 0, mastered: 0 },
          });
        } else {
          const existingCards = Array.isArray(decks[idx].cards) ? decks[idx].cards : [];
          decks[idx] = {
            ...decks[idx],
            cards: [...existingCards, ...cards],
            lastUpdated: nowIso,
          };
        }
      });
      return { ...contest, flashcardDecks: decks, lastUpdated: nowIso };
    });
    if (totalCreated > 0) {
      showToast(`${totalCreated} flashcard(s) FSRS criado(s) a partir do Caderno de Erros!`, 'success');
    }
  }, [setData, showToast]);

  const handleStartErrorDrill = useCallback((filteredErrors) => {
    if (!Array.isArray(filteredErrors) || filteredErrors.length === 0) return;
    setDrillErrors({ id: Date.now(), items: filteredErrors.slice(0, 10) });
    setSubMode('ia');
    setMode('ai-generator');
  }, []);

  const tabs = [
    { id: 'ai-generator', label: 'Gerar Simulado', icon: Brain },
    { id: 'analyzer', label: 'Último Simulado', icon: ListChecks },
    { id: 'errors', label: 'Caderno de Erros', icon: AlertTriangle },
    { id: 'history', label: 'Histórico', icon: HistoryIcon },
  ];

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
                className={`flex items-center gap-2 px-5 py-2.5 text-sm font-black rounded-xl transition-all duration-200 ${isActive
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
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-sm transition-all duration-300 ${subMode === 'ia'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
              >
                <Brain size={16} className={subMode === 'ia' ? '' : 'opacity-70'} />
                Simulado IA
              </button>
              <button
                onClick={() => setSubMode('manual')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-sm transition-all duration-300 ${subMode === 'manual'
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
            <AIGeneratedSimulado
              drillRequest={drillErrors}
              onDrillConsumed={() => setDrillErrors(null)}
            />
          ) : (
            <SimuladoAnalysis
              rows={displayRows}
              onAnalysisComplete={handleSimuladoAnalysis}
              categories={categoriesArray}
              viewMode="form"
            />
          )}
        </div>
      ) : mode === 'errors' ? (
        <ErrorNotebook
          simuladoRows={simuladoRowsArray}
          onSendToFlashcards={handleSendNotebookErrorsToFlashcards}
          onStartErrorDrill={handleStartErrorDrill}
        />
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

