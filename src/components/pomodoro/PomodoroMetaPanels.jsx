import React, { useMemo } from 'react';
import { motion as Motion } from 'framer-motion';
import {
  CheckCircle2, BrainCircuit, Zap, AlertTriangle,
  Flame, Sparkles, Target, Calendar, BarChart3, Medal, Trophy
} from 'lucide-react';
import { getLocalMidnight, getDateKey, parseNoonLocal, normalizeDate } from '../../utils/dateHelper';
import { getCoachInsight } from '../../utils/coachLogic';
import { isSubjectMatch } from '../../utils/normalization';

const EMPTY_OBJECT = Object.freeze({});

const DEFAULT_INSIGHT = Object.freeze({
  title: 'Pronto para Foco',
  text: 'Sua mente está pronta. Selecione um objetivo tático abaixo para iniciar.',
  color: 'indigo',
  iconType: 'Brain'
});

export const DataTriviaPanel = React.memo(function DataTriviaPanel({ studyLogs, simulados, categories }) {
  const stats = useMemo(() => {
    const startOfToday = getLocalMidnight().getTime();
    const todayKey = getDateKey(new Date());
    const [ty, tm, td] = todayKey && /^\d{4}-\d{2}-\d{2}$/.test(todayKey)
      ? todayKey.split('-').map(Number)
      : [new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate()];
    const utcToday = new Date(Date.UTC(ty, tm - 1, td));
    const dayOfWeek = (utcToday.getUTCDay() + 6) % 7;
    const startOfWeek = startOfToday - (86400000 * dayOfWeek);
    const startOfMonth = getLocalMidnight(`${ty}-${String(tm).padStart(2, '0')}-01`).getTime();
    const startOfLast30Days = startOfToday - (86400000 * 29);

    let weekMins = 0;
    let monthMins = 0;
    let recentSimulados = 0;
    let totalTasks = 0;
    let completedTasks = 0;
    let weekTasks = 0;
    const daysStudied = new Set();

    (studyLogs || []).forEach(log => {
      if (!log) return;
      const logDate = log.date || log.createdAt || log.timestamp;
      if (!logDate) return;
      const isDateOnly = typeof logDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(logDate.trim());
      const normDate = normalizeDate(logDate);
      const parsedDate = isDateOnly ? normDate : new Date(logDate);
      const t = (parsedDate && Number.isFinite(parsedDate.getTime()))
        ? parsedDate.getTime()
        : (normDate?.getTime() ?? NaN);
      if (Number.isNaN(t)) return;
      const rawMins = log.type === 'flashcard'
        ? 0
        : (Number(log.minutes ?? log.minutos) || Number(log.duration) || 0);
      const mins = Math.max(0, rawMins);
      if (t >= startOfWeek) weekMins += mins;
      if (t >= startOfMonth) monthMins += mins;
      const dayKey = getDateKey(logDate) || getDateKey(new Date(t));
      if (dayKey && (mins > 0 || log.type === 'flashcard')) daysStudied.add(dayKey);
    });

    (simulados || []).forEach(s => {
      if (!s || s.valid === false || s.validated === false || s.source === 'manual-error-notebook') return;
      const sDate = s.date || s.createdAt;
      const sTime = sDate ? normalizeDate(sDate)?.getTime() : NaN;
      if (!Number.isNaN(sTime) && sTime >= startOfLast30Days) recentSimulados++;
    });

    (categories || []).forEach(c => {
      if (!c || !c.tasks) return;
      const safeTasks = Array.isArray(c.tasks) ? c.tasks : Object.values(c.tasks);
      safeTasks.forEach(t => {
        if (!t) return;
        totalTasks++;
        if (t.completed) {
          completedTasks++;
          const completedTime = (t.completedAt || t.lastStudiedAt) ? new Date(t.completedAt || t.lastStudiedAt).getTime() : NaN;
          if (!Number.isNaN(completedTime) && completedTime >= startOfWeek) weekTasks++;
        }
      });
    });

    const sortedDays = Array.from(daysStudied).sort();
    let maxStreak = 0;
    let currentStreak = 0;
    let lastDate = null;
    sortedDays.forEach(dayStr => {
      const parsed = parseNoonLocal(dayStr);
      if (!parsed) return;
      const current = parsed.getTime();
      currentStreak = lastDate && Math.round((current - lastDate) / 86400000) === 1 ? currentStreak + 1 : 1;
      if (currentStreak > maxStreak) maxStreak = currentStreak;
      lastDate = current;
    });

    return {
      weekMins,
      monthMins,
      recentSimulados,
      weekTasks,
      maxStreak,
      efficacy: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      hasData: weekMins > 0 || monthMins > 0 || recentSimulados > 0 || totalTasks > 0
    };
  }, [studyLogs, simulados, categories]);

  const fmt = (mins) => {
    const total = Math.max(0, Math.round(Number(mins) || 0));
    const h = Math.floor(total / 60);
    const m = total % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  if (!stats || !stats.hasData) return null;

  const tiles = [
    { icon: <Calendar size={16} className="text-indigo-400" />, label: 'Semana', value: fmt(stats.weekMins), show: stats.weekMins > 0 },
    { icon: <BarChart3 size={16} className="text-cyan-400" />, label: 'Mês', value: fmt(stats.monthMins), show: stats.monthMins > 0 },
    { icon: <Target size={16} className="text-rose-400" />, label: 'Simulados (30 dias)', value: String(stats.recentSimulados), show: stats.recentSimulados > 0 },
    { icon: <Trophy size={16} className="text-yellow-500" />, label: 'Eficácia', value: `${stats.efficacy}%`, show: stats.efficacy > 0 },
    { icon: <Flame size={16} className="text-orange-500" />, label: 'Sequência Máxima', value: `${stats.maxStreak} dias`, show: stats.maxStreak >= 2 },
    { icon: <CheckCircle2 size={16} className="text-emerald-400" />, label: 'Missões na Semana', value: String(stats.weekTasks), show: stats.weekTasks > 0 }
  ].filter(t => t.show).slice(0, 6);

  if (tiles.length === 0) return null;

  return (
    <div className="mb-4 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4 relative overflow-hidden shadow-md">
      <div className="flex justify-between items-center mb-3 relative z-10">
        <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 flex items-center gap-2">
          <span className="w-5 h-5 rounded-md bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
            <Medal size={11} />
          </span>
          Conquistas e Telemetria
        </p>
        <span className="text-[9px] font-black text-indigo-500/60 uppercase">Central de Dados</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 relative z-10">
        {tiles.map((tile, i) => (
          <div key={i} className="flex items-center gap-2.5 bg-white/[0.03] border border-white/[0.05] hover:border-white/10 px-3 py-2.5 rounded-xl transition-all group">
            <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/5 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform">
              {tile.icon}
            </div>
            <div className="min-w-0">
              <p className="text-[9px] uppercase tracking-widest text-slate-500 font-bold truncate">{tile.label}</p>
              <p className="text-sm font-black text-cyan-300 truncate">{tile.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

export const AICoachPanel = React.memo(function AICoachPanel({ activeSubject, stats, categories = [], studyLogs = [], simulados = [], settings = EMPTY_OBJECT }) {
  const insight = useMemo(() => {
    if (!activeSubject) return DEFAULT_INSIGHT;

    const catId = activeSubject.categoryId || activeSubject.catId;
    const safeCats = Array.isArray(categories) ? categories : Object.values(categories || {});
    const targetCategory = safeCats.find(c => c && (c.id === catId || c.name === activeSubject.category));

    if (!targetCategory) {
      return {
        title: activeSubject.category || 'Foco Tático',
        text: `Mantenha a concentração em **${activeSubject.task || 'sua meta'}**. Ciclos consistentes constroem retenção profunda.`,
        color: 'indigo',
        iconType: 'Brain'
      };
    }

    try {
      const hasCategoryHistory = Array.isArray(targetCategory?.simuladoStats?.history)
        ? targetCategory.simuladoStats.history.length > 0
        : Object.keys(targetCategory?.simuladoStats?.history || {}).length > 0;
      const hasSimulados = hasCategoryHistory || (simulados || []).some(s => {
        if (!s || s.valid === false || s.validated === false || s.source === 'manual-error-notebook') return false;
        if (targetCategory.id != null && s.categoryId != null && String(s.categoryId) === String(targetCategory.id)) return true;
        if (targetCategory.name && isSubjectMatch(s.subject || s.categoryName || s.materia || s.disciplina || '', targetCategory.name)) return true;
        return Boolean(s.categoryScores && (
          s.categoryScores[targetCategory.id] !== undefined ||
          (targetCategory.name && s.categoryScores[targetCategory.name] !== undefined)
        ));
      });
      if (!hasSimulados) {
        return {
          title: `IA Mentor · ${targetCategory.name || 'Foco'}`,
          text: `Alvo ativo: **${activeSubject.task || targetCategory.name}**. Mantenha o ritmo para maximizar retenção.`,
          color: 'indigo',
          iconType: 'Brain'
        };
      }

      const effectiveSettings = settings && settings !== EMPTY_OBJECT ? settings : (stats?.settings || EMPTY_OBJECT);
      const safeMaxScore = Number(targetCategory.maxScore || effectiveSettings?.maxScore) || 100;
      const rawMinScore = Number(targetCategory.minScore ?? effectiveSettings?.minScore);
      const safeMinScore = Number.isFinite(rawMinScore) ? Math.min(rawMinScore, safeMaxScore) : 0;
      const safeDomain = Math.max(1e-9, safeMaxScore - safeMinScore);
      const rawInsight = getCoachInsight(targetCategory, simulados, studyLogs, {
        maxScore: safeMaxScore,
        minScore: safeMinScore,
        allCategories: safeCats
      });
      if (rawInsight && !rawInsight.error && rawInsight.text && rawInsight.text !== 'Dados insuficientes para análise.') {
        let color = 'indigo';
        let iconType = 'Brain';
        const volThreshold = 15 * (safeDomain / 100);
        const trendThreshold = 0.5 * (safeDomain / 100);
        if (rawInsight.trend > trendThreshold) {
          color = 'emerald';
          iconType = 'Zap';
        } else if (rawInsight.trend < -trendThreshold || rawInsight.volatility > volThreshold) {
          color = 'red';
          iconType = 'Alert';
        }

        return {
          title: `IA Mentor · ${targetCategory.name || 'Diagnóstico'}`,
          text: `Desempenho em ${targetCategory.name}: **${rawInsight.text}**. Foco redobrado nesta etapa.`,
          color,
          iconType
        };
      }
    } catch {
      // Silently fallback to default subject advice
    }

    return {
      title: `IA Mentor · ${targetCategory.name || 'Foco'}`,
      text: `Alvo ativo: **${activeSubject.task || targetCategory.name}**. Mantenha o ritmo para maximizar retenção.`,
      color: 'indigo',
      iconType: 'Brain'
    };
  }, [activeSubject, categories, studyLogs, simulados, settings, stats]);

  const icons = {
    Brain: <BrainCircuit size={24} strokeWidth={1.5} />,
    Zap: <Zap size={24} strokeWidth={1.5} />,
    Alert: <AlertTriangle size={24} strokeWidth={1.5} />
  };
  const colorMap = {
    red: {
      border: 'border-red-500/30', bg: 'bg-red-500/5', glow: 'shadow-red-500/10',
      text: 'text-red-400', accent: 'bg-red-400', gradient: 'from-red-500/20 via-red-500/5 to-transparent'
    },
    emerald: {
      border: 'border-emerald-500/30', bg: 'bg-emerald-500/5', glow: 'shadow-emerald-500/10',
      text: 'text-emerald-400', accent: 'bg-emerald-400', gradient: 'from-emerald-500/20 via-emerald-500/5 to-transparent'
    },
    indigo: {
      border: 'border-indigo-500/20', bg: 'bg-slate-800/40', glow: 'shadow-indigo-500/5',
      text: 'text-indigo-300', accent: 'bg-indigo-400', gradient: 'from-indigo-500/10 via-indigo-500/5 to-transparent'
    }
  };
  const theme = colorMap[insight?.color] || colorMap.indigo;
  const formatText = (text) => {
    if (!text) return '';
    return text.split('**').map((part, i) =>
      i % 2 === 1 ? <strong key={i} className={`font-black text-white ${theme.text} drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]`}>{part}</strong> : part
    );
  };
  return (
    <Motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`relative rounded-2xl border ${theme.border} ${theme.bg} ${theme.glow} backdrop-blur-md p-4 mb-4 overflow-hidden group shadow-lg`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} opacity-40 pointer-events-none`} />
      <Motion.div
        animate={{ x: ['-120%', '320%'] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
        className="absolute left-0 top-0 bottom-0 w-[50px] bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-50 pointer-events-none z-20 skew-x-[-20deg]"
      />
      <div className="flex items-center gap-4 sm:gap-6 relative z-10">
        <div className="relative shrink-0">
          <div
            className="absolute -inset-2 rounded-full opacity-35 pointer-events-none"
            style={{ background: 'radial-gradient(closest-side, rgba(99, 102, 241, 0.35), rgba(99, 102, 241, 0))' }}
          />
          <div className={`relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl border ${theme.border} bg-slate-900/70 flex items-center justify-center ${theme.text} shadow-inner`}>
            {icons[insight?.iconType] || <BrainCircuit size={24} />}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1.5">
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 shrink-0">
              <Sparkles size={10} className={`${theme.text} shrink-0`} />
              <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-slate-400">Mentor Ativo</span>
            </div>
          </div>
          <h3 className="text-base font-bold text-white mb-0.5 tracking-tight flex items-center gap-2">
            <span className="truncate">{insight?.title || 'Pronto para Foco'}</span>
            <span className={`w-1.5 h-1.5 rounded-full ${theme.accent} animate-pulse shrink-0`} />
          </h3>
          <div className="text-xs text-slate-300/90 leading-relaxed font-medium">
            {formatText(insight?.text)}
          </div>
        </div>
      </div>
    </Motion.div>
  );
});
