import React, { useMemo, useId, useState } from 'react';
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
  ReferenceArea,
} from 'recharts';
import { Compass, Target } from 'lucide-react';
import { ChartFrame } from '../ChartFrame';
import { buildProjectionFanData } from '../../../utils/advancedChartHelpers';
import { formatValue } from '../../../utils/scoreHelper';

function FanTooltip({ active, payload, unit }) {
  if (!active || !payload || !payload.length) return null;
  const pt = payload[0]?.payload;
  if (!pt) return null;
  const fmt = (v) => (v == null ? '—' : unit === '%' ? `${Number(v).toFixed(1)}%` : `${formatValue(v)} ${unit}`);

  return (
    <div className="bg-slate-950/95 border border-white/15 rounded-2xl p-3.5 shadow-2xl backdrop-blur-xl min-w-[205px] text-xs">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-white/10 pb-1.5 mb-2">
        {pt.label} {pt.daysAhead ? `(+${pt.daysAhead}d)` : ''}
      </p>
      {pt.isFuture ? (
        <div className="space-y-1 font-mono">
          <div className="flex justify-between gap-4">
            <span className="text-emerald-400">Otimista (P90):</span>
            <span className="font-bold text-white">{fmt(pt.p90)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-sky-300">Provável (P50):</span>
            <span className="font-black text-sky-300">{fmt(pt.p50)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-amber-300">Conservador (P10):</span>
            <span className="font-bold text-white">{fmt(pt.p10)}</span>
          </div>
          <div className="flex justify-between gap-4 pt-1 border-t border-white/10 text-[10px] text-slate-400">
            <span>Faixa Central (P25–P75):</span>
            <span>{fmt(pt.p25)} – {fmt(pt.p75)}</span>
          </div>
        </div>
      ) : (
        <div className="flex justify-between gap-4 font-mono">
          <span className="text-slate-400">{pt.isAnchor ? 'Nível Atual:' : 'Nota Real:'}</span>
          <span className="font-black text-white">{fmt(pt.historical)}</span>
        </div>
      )}
    </div>
  );
}

export const ProjectionFanChart = React.memo(function ProjectionFanChart({
  focusCategory = null,
  timeline = [],
  projectDays = 60,
  historicalCutoffs = [],
  targetScore = 80,
  minScore = 0,
  maxScore = 100,
  unit = '%',
  activeMcResult = null,
}) {
  const uid = useId().replace(/:/g, '');
  const [customHorizon, setCustomHorizon] = useState(null);
  const effectiveHorizon = customHorizon ?? Math.max(14, Math.min(365, Number(projectDays) || 60));

  const data = useMemo(
    () =>
      buildProjectionFanData(focusCategory, timeline, {
        minScore,
        maxScore,
        targetScore,
        horizonDays: effectiveHorizon,
        historicalCutoffs,
        activeMcResult,
      }),
    [focusCategory, timeline, minScore, maxScore, targetScore, effectiveHorizon, historicalCutoffs, activeMcResult]
  );

  const fmt = (v) => (unit === '%' ? `${Number(v).toFixed(1)}%` : `${formatValue(v)} ${unit}`);

  if (!data.series.length) {
    return (
      <div className="min-h-[300px] flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/5 bg-slate-950/50 p-8 text-center">
        <Compass size={34} className="text-indigo-400/50" />
        <p className="text-sm font-bold text-slate-300">Sem simulados suficientes para projetar o Cone Futuro</p>
        <p className="text-xs text-slate-500">Cadastre ao menos 1 simulado para traçar as faixas P10 / P50 / P90 até a prova.</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Cabeçalho KPIs + Seletor de horizonte */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 flex-1 min-w-[260px]">
          <div className="rounded-xl bg-slate-950/70 border border-white/5 px-3 py-2">
            <p className="text-[9px] uppercase text-slate-500 font-bold">Conservador (P10)</p>
            <p className="text-sm font-black font-mono text-amber-300">{fmt(data.summary.finalP10)}</p>
          </div>
          <div className="rounded-xl bg-slate-950/70 border border-sky-500/30 px-3 py-2">
            <p className="text-[9px] uppercase text-slate-500 font-bold">Mediana (P50)</p>
            <p className="text-sm font-black font-mono text-sky-300">{fmt(data.summary.finalP50)}</p>
          </div>
          <div className="rounded-xl bg-slate-950/70 border border-white/5 px-3 py-2">
            <p className="text-[9px] uppercase text-slate-500 font-bold">Otimista (P90)</p>
            <p className="text-sm font-black font-mono text-emerald-300">{fmt(data.summary.finalP90)}</p>
          </div>
          <div className="rounded-xl bg-slate-950/70 border border-white/5 px-3 py-2">
            <p className="text-[9px] uppercase text-slate-500 font-bold flex items-center gap-1">
              <Target size={10} className="text-emerald-400" /> Cruzamento Meta
            </p>
            <p className="text-xs font-black font-mono text-white">
              {data.targetCrossingDate ? data.targetCrossingDate.split('-').reverse().join('/') : 'Acima do prazo'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-slate-950/70 border border-white/10 p-1 rounded-xl text-[10px] font-bold">
          {[30, 60, 90, 180].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setCustomHorizon(d)}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                effectiveHorizon === d ? 'bg-indigo-500/30 text-indigo-200 border border-indigo-400/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      <ChartFrame minHeight={340} label="Traçando cone probabilístico futuro">
        <div className="h-[340px] w-full" role="img" aria-label="Cone de Projeção Futuro P10 a P90">
          <ResponsiveContainer width="100%" height="100%" minHeight={300} minWidth={1}>
            <ComposedChart data={data.series} margin={{ top: 16, right: 20, left: 4, bottom: 12 }}>
              <defs>
                <linearGradient id={`fanOuter_${uid}`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.14} />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.22} />
                </linearGradient>
                <linearGradient id={`fanInner_${uid}`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="#34d399" stopOpacity={0.34} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="label" stroke="#64748b" fontSize={10} />
              <YAxis
                domain={[minScore, maxScore]}
                stroke="#64748b"
                fontSize={11}
                tickFormatter={(v) => (unit === '%' ? `${Math.round(v)}%` : `${Math.round(v)}`)}
              />
              <Tooltip content={<FanTooltip unit={unit} />} />

              {/* Faixa de notas de corte históricas, se cadastradas */}
              {data.cutoffBand && (
                <ReferenceArea
                  y1={data.cutoffBand.min}
                  y2={data.cutoffBand.max === data.cutoffBand.min ? Math.min(maxScore, data.cutoffBand.max + (maxScore - minScore) * 0.015) : data.cutoffBand.max}
                  fill="#f59e0b"
                  fillOpacity={0.14}
                  stroke="#f59e0b"
                  strokeOpacity={0.4}
                  strokeDasharray="3 3"
                />
              )}

              <ReferenceLine
                y={targetScore}
                stroke="#10b981"
                strokeDasharray="5 5"
                label={{ value: `Meta ${fmt(targetScore)}`, position: 'insideTopRight', fill: '#10b981', fontSize: 10 }}
              />
              <ReferenceLine x="Hoje" stroke="#94a3b8" strokeDasharray="3 3" />

              {/* Cone externo P10-P90 */}
              <Area
                type="monotone"
                dataKey="bandOuter"
                name="Faixa P10–P90"
                fill={`url(#fanOuter_${uid})`}
                stroke="none"
                connectNulls
                isAnimationActive={false}
              />
              {/* Cone interno P25-P75 */}
              <Area
                type="monotone"
                dataKey="bandInner"
                name="Faixa P25–P75"
                fill={`url(#fanInner_${uid})`}
                stroke="none"
                connectNulls
                isAnimationActive={false}
              />
              {/* Histórico recente */}
              <Line
                type="monotone"
                dataKey="historical"
                name="Histórico"
                stroke="#e2e8f0"
                strokeWidth={2}
                dot={{ r: 3.5, fill: '#e2e8f0' }}
                connectNulls
              />
              {/* Mediana projetada P50 */}
              <Line
                type="monotone"
                dataKey="p50"
                name="Projeção Mediana (P50)"
                stroke="#38bdf8"
                strokeWidth={3}
                strokeDasharray="6 3"
                dot={{ r: 3, fill: '#38bdf8' }}
                connectNulls
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </ChartFrame>

      {data.cutoffBand && (
        <p className="text-[11px] text-amber-300/90 flex items-center gap-2">
          <span className="inline-block w-3 h-2 rounded-sm bg-amber-500/30 border border-amber-400/60" />
          Faixa de cortes históricos ({data.cutoffBand.count} editais): {fmt(data.cutoffBand.min)} – {fmt(data.cutoffBand.max)} (média {fmt(data.cutoffBand.avg)})
        </p>
      )}
    </div>
  );
});

export default ProjectionFanChart;
