import React, { useMemo, useState, useId } from 'react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { CalendarClock, TrendingUp, TrendingDown } from 'lucide-react';
import { ChartFrame } from '../ChartFrame';
import { buildSyllabusBurndownData } from '../../../utils/advancedChartHelpers';

const STATUS_BADGE = {
  completed: { label: 'Edital 100% Concluído', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
  ahead: { label: 'No Prazo / Adiantado', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  on_track: { label: 'Ritmo Estável', cls: 'bg-sky-500/15 text-sky-300 border-sky-500/30' },
  behind: { label: 'Ritmo Abaixo da Meta', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  overdue: { label: 'Prazo Atingido', cls: 'bg-rose-500/15 text-rose-300 border-rose-500/30' },
  stalled: { label: 'Sem Avanço Recente', cls: 'bg-slate-700/40 text-slate-300 border-slate-600/40' },
  no_goal: { label: 'Sem Data de Prova', cls: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' },
};

function BurndownTooltip({ active, payload, mode }) {
  if (!active || !payload || !payload.length) return null;
  const pt = payload[0]?.payload;
  if (!pt) return null;
  const isBurnup = mode === 'burnup';

  return (
    <div className="bg-slate-950/95 border border-white/15 rounded-2xl p-3.5 shadow-2xl backdrop-blur-xl min-w-[195px] text-xs">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-white/10 pb-1.5 mb-2">
        {pt.isToday ? `${pt.label} (Hoje)` : pt.label}
      </p>
      <div className="space-y-1 font-mono">
        {(isBurnup ? pt.actualCompleted : pt.actualRemaining) != null && (
          <div className="flex justify-between gap-4">
            <span className="text-emerald-300">{isBurnup ? 'Concluídos:' : 'Restantes:'}</span>
            <span className="font-black text-white">{isBurnup ? pt.actualCompleted : pt.actualRemaining}</span>
          </div>
        )}
        {(isBurnup ? pt.projectedCompleted : pt.projectedRemaining) != null && !pt.isToday && (
          <div className="flex justify-between gap-4">
            <span className="text-sky-300">Projeção:</span>
            <span className="font-bold text-sky-300">{isBurnup ? pt.projectedCompleted : pt.projectedRemaining}</span>
          </div>
        )}
        <div className="flex justify-between gap-4 text-slate-400">
          <span>Ritmo Ideal:</span>
          <span>{isBurnup ? pt.idealCompleted : pt.idealRemaining}</span>
        </div>
      </div>
    </div>
  );
}

export const SyllabusBurndownChart = React.memo(function SyllabusBurndownChart({
  categories = [],
  user = {},
  defaultMode = 'burnup',
  dayTick,
}) {
  const uid = useId().replace(/:/g, '');
  const [mode, setMode] = useState(defaultMode);

  const data = useMemo(() => {
    void dayTick;
    return buildSyllabusBurndownData(categories, user);
  }, [categories, user, dayTick]);

  const dateLabelMap = useMemo(() => {
    const map = new Map();
    (data.series || []).forEach((pt) => {
      if (pt?.date) map.set(pt.date, pt.label);
    });
    return map;
  }, [data.series]);

  if (data.totalTasks === 0) {
    return null;
  }

  const isBurnup = mode === 'burnup';
  const badge = STATUS_BADGE[data.status] || STATUS_BADGE.on_track;
  const todayEntry = data.series.find((s) => s.isToday);

  return (
    <div className="glass p-5 sm:p-6 rounded-3xl border border-white/10 shadow-2xl bg-slate-900/45 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <CalendarClock size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-black text-white uppercase tracking-widest leading-none">
                {isBurnup ? 'Burnup do Edital' : 'Burndown do Edital'}
              </h2>
              <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase ${badge.cls}`}>
                {badge.label}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Ritmo real de tópicos concluídos vs. ritmo ideal até {data.hasGoalDate ? data.goalDateKey.split('-').reverse().join('/') : 'horizonte de 60 dias'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-slate-950/70 border border-white/10 p-1 rounded-xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setMode('burnup')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
              isBurnup ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'text-slate-400 hover:text-white'
            }`}
          >
            <TrendingUp size={13} />
            Burnup
          </button>
          <button
            type="button"
            onClick={() => setMode('burndown')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
              !isBurnup ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' : 'text-slate-400 hover:text-white'
            }`}
          >
            <TrendingDown size={13} />
            Burndown
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl bg-slate-950/60 border border-white/5 p-3">
          <p className="text-[9px] uppercase text-slate-500 font-bold">Progresso</p>
          <p className="text-lg font-black font-mono text-white">
            {data.completionPct}% <span className="text-xs text-slate-400 font-normal">({data.completedTasks}/{data.totalTasks})</span>
          </p>
        </div>
        <div className="rounded-xl bg-slate-950/60 border border-white/5 p-3">
          <p className="text-[9px] uppercase text-slate-500 font-bold">Ritmo Atual</p>
          <p className="text-lg font-black font-mono text-emerald-300">{data.currentWeeklyPace}/sem</p>
        </div>
        <div className="rounded-xl bg-slate-950/60 border border-white/5 p-3">
          <p className="text-[9px] uppercase text-slate-500 font-bold">Ritmo Necessário</p>
          <p className="text-lg font-black font-mono text-amber-300">
            {data.status === 'overdue' ? 'Prazo encerrado' : `${data.requiredWeeklyPace}/sem`}
          </p>
        </div>
        <div className="rounded-xl bg-slate-950/60 border border-white/5 p-3">
          <p className="text-[9px] uppercase text-slate-500 font-bold">Previsão Fechamento</p>
          <p className="text-sm font-black font-mono text-sky-300 mt-0.5">
            {data.projectedFinishKey ? data.projectedFinishKey.split('-').reverse().join('/') : 'Defina ritmo'}
          </p>
        </div>
      </div>

      <ChartFrame minHeight={260} label="Calculando burndown do edital">
        <div className="h-[260px] w-full" role="img" aria-label="Gráfico de Burndown e Burnup do Edital">
          <ResponsiveContainer width="100%" height="100%" minHeight={240} minWidth={1}>
            <ComposedChart data={data.series} margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
              <defs>
                <linearGradient id={`burnFill_${uid}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={isBurnup ? '#10b981' : '#38bdf8'} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={isBurnup ? '#10b981' : '#38bdf8'} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#64748b"
                fontSize={10}
                tickFormatter={(d) => dateLabelMap.get(d) || d}
              />
              <YAxis domain={[0, data.totalTasks]} stroke="#64748b" fontSize={11} allowDecimals={false} />
              <Tooltip content={<BurndownTooltip mode={mode} />} />
              {todayEntry && (
                <ReferenceLine
                  x={todayEntry.date}
                  stroke="#94a3b8"
                  strokeDasharray="3 3"
                  label={{ value: 'Hoje', position: 'top', fill: '#cbd5e1', fontSize: 10 }}
                />
              )}
              <Line
                type="linear"
                dataKey={isBurnup ? 'idealCompleted' : 'idealRemaining'}
                name="Ritmo Ideal"
                stroke="#64748b"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
              <Area
                type="monotone"
                dataKey={isBurnup ? 'actualCompleted' : 'actualRemaining'}
                name={isBurnup ? 'Concluídos' : 'Restantes'}
                stroke={isBurnup ? '#34d399' : '#38bdf8'}
                strokeWidth={2.5}
                fill={`url(#burnFill_${uid})`}
                connectNulls={false}
              />
              <Line
                type="linear"
                dataKey={isBurnup ? 'projectedCompleted' : 'projectedRemaining'}
                name="Projeção (ritmo 14d)"
                stroke="#a78bfa"
                strokeWidth={2}
                strokeDasharray="3 3"
                dot={false}
                connectNulls
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </ChartFrame>
    </div>
  );
});

export default SyllabusBurndownChart;
