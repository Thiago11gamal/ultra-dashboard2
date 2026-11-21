import React, { useMemo, useState } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { Compass } from 'lucide-react';
import { ChartFrame } from '../ChartFrame';
import { computeEfficientAllocation } from '../../../engine/adaptive/allocationOptimizer';

function FrontierTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const pt = payload[0]?.payload;
  if (!pt) return null;
  return (
    <div className="bg-slate-950/95 border border-white/15 rounded-2xl p-3 shadow-2xl text-xs min-w-[180px]">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-300 border-b border-white/10 pb-1 mb-1.5">
        {pt.label || payload[0]?.name || 'Portfólio'}
      </p>
      <div className="space-y-1 font-mono">
        <div className="flex justify-between gap-4">
          <span className="text-emerald-300">Ganho Esperado:</span>
          <span className="font-black text-white">+{Number(pt.expectedGainPct ?? 0).toFixed(2)} pp</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-amber-300">Risco Residual:</span>
          <span className="font-bold text-white">{Number(pt.residualRisk ?? 0).toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

function AllocationBarTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const pt = payload[0]?.payload;
  if (!pt) return null;
  const delta = Number(pt.deltaHours || 0);
  return (
    <div className="bg-slate-950/95 border border-white/15 rounded-2xl p-3 shadow-2xl text-xs min-w-[180px]">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-300 border-b border-white/10 pb-1 mb-1.5">
        {pt.name}
      </p>
      <div className="space-y-1 font-mono">
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">Atual:</span>
          <span className="text-white">{pt.currentHours}h/sem</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-sky-300">Ótima:</span>
          <span className="font-black text-sky-300">{pt.optimalHours}h/sem</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">Ajuste:</span>
          <span className={delta >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
            {delta >= 0 ? `+${delta}h` : `${delta}h`}
          </span>
        </div>
      </div>
    </div>
  );
}

export const EfficientAllocationChart = React.memo(function EfficientAllocationChart({
  categories = [],
  studyLogs = [],
  targetScore = 80,
  minScore = 0,
  maxScore = 100,
  dayTick,
}) {
  const [weeklyBudget, setWeeklyBudget] = useState(null);
  const [budgetDraft, setBudgetDraft] = useState(null);

  const data = useMemo(() => {
    void dayTick;
    return computeEfficientAllocation(categories, studyLogs, {
      weeklyBudgetHours: weeklyBudget || undefined,
      targetScore,
      minScore,
      maxScore,
    });
  }, [categories, studyLogs, weeklyBudget, targetScore, minScore, maxScore, dayTick]);

  const effectiveBudget = weeklyBudget ?? data.weeklyBudgetHours;

  if (!data.hasData || !data.subjects.length) return null;

  const commitBudgetDraft = (raw) => {
    const parsed = Number(raw);
    const clamped = Number.isFinite(parsed) ? Math.max(4, Math.min(70, Math.round(parsed))) : effectiveBudget;
    setWeeklyBudget(clamped);
    setBudgetDraft(null);
  };

  const barMinWidth = Math.max(320, data.subjects.length * 64);

  return (
    <div className="glass p-5 sm:p-6 rounded-3xl border border-white/10 shadow-2xl bg-slate-900/45 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-300 shrink-0">
            <Compass size={20} />
          </div>
          <div>
            <h2 className="text-sm font-black text-white uppercase tracking-widest leading-none">
              Fronteira Eficiente de Alocação (Markowitz)
            </h2>
            <p className="text-[11px] text-slate-400 mt-1">
              Otimização de horas semanais por ganho marginal decrescente × risco de corte
            </p>
          </div>
        </div>

        <label className="flex items-center gap-2 text-xs text-slate-300 bg-slate-950/70 border border-white/10 rounded-xl px-3 py-1.5">
          <span className="font-semibold">Orçamento semanal:</span>
          <input
            type="number"
            min={4}
            max={70}
            aria-label="Orçamento semanal de horas"
            value={budgetDraft !== null ? budgetDraft : String(effectiveBudget)}
            onChange={(e) => {
              const raw = e.target.value;
              setBudgetDraft(raw);
              const parsed = Number(raw);
              if (raw !== '' && Number.isFinite(parsed) && parsed >= 4 && parsed <= 70) {
                setWeeklyBudget(Math.round(parsed));
              }
            }}
            onBlur={(e) => commitBudgetDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitBudgetDraft(e.currentTarget.value);
            }}
            className="w-14 bg-slate-900 border border-white/10 rounded-md px-1.5 py-0.5 text-white font-mono text-center"
          />
          <span className="text-slate-500">h/sem</span>
        </label>
      </div>

      {/* Comparativo Atual vs Ótimo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-2xl border border-white/5 bg-slate-950/50 p-3.5 space-y-2">
          <p className="text-[11px] font-bold text-slate-300">
            Fronteira Eficiente: Risco Residual (X) × Ganho Esperado em pp (Y)
          </p>
          <ChartFrame minHeight={230} label="Traçando fronteira eficiente">
            <div className="h-[230px] w-full" role="img" aria-label="Curva de Fronteira Eficiente de alocação de horas">
              <ResponsiveContainer width="100%" height="100%" minHeight={200} minWidth={1}>
                <ScatterChart margin={{ top: 12, right: 16, bottom: 20, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis type="number" dataKey="residualRisk" name="Risco" stroke="#64748b" fontSize={10} label={{ value: 'Risco Residual (menor = mais seguro)', position: 'insideBottom', offset: -12, fill: '#64748b', fontSize: 10 }} />
                  <YAxis type="number" dataKey="expectedGainPct" name="Ganho (pp)" stroke="#64748b" fontSize={10} tickFormatter={(v) => `+${v}`} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<FrontierTooltip />} />
                  <Scatter name="Fronteira Eficiente" data={data.frontier} fill="#6366f1" line={{ stroke: '#818cf8', strokeWidth: 2 }} />
                  <Scatter name="Alocação Atual" data={[data.currentPortfolio]} fill="#f59e0b" />
                  <Scatter name="Ótimo Sugerido" data={[data.optimalPortfolio]} fill="#10b981" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </ChartFrame>
          <div className="flex flex-wrap gap-3 text-[10px] text-slate-400">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400" />Atual: +{data.currentPortfolio.expectedGainPct}pp ({effectiveBudget}h)</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />Ótima: +{data.optimalPortfolio.expectedGainPct}pp ({effectiveBudget}h)</span>
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-slate-950/50 p-3.5 space-y-2">
          <p className="text-[11px] font-bold text-slate-300">
            Realocação Recomendada (Horas Atuais vs. Ótimas / semana • {data.subjects.length} matéria{data.subjects.length === 1 ? '' : 's'})
          </p>
          <ChartFrame minHeight={230} label="Calculando realocação de horas">
            <div className="overflow-x-auto w-full">
              <div
                className="h-[230px] w-full"
                style={{ minWidth: data.subjects.length > 8 ? `${barMinWidth}px` : undefined }}
                role="img"
                aria-label="Comparativo de horas semanais atuais versus ótimas por disciplina"
              >
                <ResponsiveContainer width="100%" height="100%" minHeight={200} minWidth={1}>
                  <BarChart data={data.subjects} margin={{ top: 12, right: 12, left: 0, bottom: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} interval={0} angle={-18} textAnchor="end" height={45} tickFormatter={(v) => (String(v).length > 14 ? `${String(v).slice(0, 13)}…` : v)} />
                    <YAxis stroke="#64748b" fontSize={10} tickFormatter={(v) => `${v}h`} />
                    <Tooltip content={<AllocationBarTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Bar dataKey="currentHours" name="Atual (h/sem)" fill="#475569" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="optimalHours" name="Ótima (h/sem)" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </ChartFrame>
        </div>
      </div>
    </div>
  );
});

export default EfficientAllocationChart;
