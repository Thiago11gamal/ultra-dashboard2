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
import { Compass, Target, Globe } from 'lucide-react';
import { ChartFrame } from '../ChartFrame';
import { BenchmarkStrip } from '../../ui/BenchmarkStrip';
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
  timeWindow = 'all',
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
  const examHorizon = Math.max(1, Math.min(365, Math.round(Number(projectDays) || 60)));
  const effectiveHorizon = customHorizon ?? examHorizon;

  const data = useMemo(
    () =>
      buildProjectionFanData(focusCategory, timeline, {
        minScore,
        maxScore,
        targetScore,
        timeWindow,
        horizonDays: effectiveHorizon,
        mcHorizonDays: examHorizon,
        historicalCutoffs,
        activeMcResult,
      }),
    [focusCategory, timeline, minScore, maxScore, targetScore, timeWindow, effectiveHorizon, examHorizon, historicalCutoffs, activeMcResult]
  );

  const fmt = (v) => (unit === '%' ? `${Number(v).toFixed(1)}%` : `${formatValue(v)} ${unit}`);

  if (!data.series.length) {
    return (
      <div className="min-h-[300px] flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/[0.08] bg-slate-950/55 p-8 text-center">
        <Compass size={34} className="text-indigo-400/60" />
        <p className="text-sm font-bold text-slate-300">Sem simulados suficientes para projetar o Cone Futuro</p>
        <p className="text-xs text-slate-400">Cadastre ao menos 1 simulado para traçar as faixas P10 / P50 / P90 até a prova.</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {data.summary && (() => {
        const diff = data.summary.finalP50 - targetScore;
        const range = Math.max(1e-9, maxScore - minScore);
        const gapUnit = unit === '%' ? 'pp' : ` ${unit}`;
        return (
          <BenchmarkStrip
            currentLabel={`Hoje ${fmt(data.summary.currentLevel)} · P50 (${effectiveHorizon}d)`}
            currentValue={fmt(data.summary.finalP50)}
            targetLabel="Meta"
            targetValue={fmt(targetScore)}
            gapLabel={Math.abs(diff) < 0.05 ? 'Na meta ✓' : (diff > 0 ? `+${formatValue(diff)}${gapUnit} acima` : `Faltam ${formatValue(Math.abs(diff))}${gapUnit}`)}
            status={diff >= -0.05 ? 'success' : diff >= -(range * 0.1) ? 'warning' : 'danger'}
            progressPct={targetScore > minScore ? ((data.summary.finalP50 - minScore) / Math.max(1e-9, targetScore - minScore)) * 100 : 100}
            extra={data.alreadyAtTarget ? 'Já na meta ✓' : (data.targetCrossingDate ? `Cruza em ${data.targetCrossingDate.split('-').reverse().join('/')}` : (diff >= 0 ? 'Atinge no prazo ✓' : 'Abaixo no prazo'))}
            compact
          />
        );
      })()}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/15 border border-indigo-400/30 text-indigo-200 font-bold">
          {focusCategory ? <Target size={12} className="shrink-0" /> : <Globe size={12} className="shrink-0" />}
          <span>{focusCategory ? `Foco: ${focusCategory.name}` : 'Visão Global'}</span>
        </span>
        <span className="text-[11px] text-slate-400">
          Faixa clara = P25–P75 (50% dos cenários) · Faixa externa = P10–P90 (80% dos cenários)
        </span>
      </div>

      {/* Cabeçalho KPIs + Seletor de horizonte */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 flex-1 min-w-[260px]">
          <div className="rounded-xl bg-slate-950/60 border border-white/[0.08] px-3 py-2.5" title="Cenário pessimista: 90% de chance de ficar acima desta nota">
            <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Conservador (P10)</p>
            <p className="text-sm font-black font-mono tabular-nums text-amber-300 mt-0.5">{fmt(data.summary.finalP10)}</p>
            <p className="text-[10px] text-slate-500">piso cauteloso</p>
          </div>
          <div className="rounded-xl bg-slate-950/60 border border-sky-500/30 px-3 py-2.5" title="Cenário central mais provável mantendo o ritmo atual">
            <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Mediana (P50)</p>
            <p className="text-sm font-black font-mono tabular-nums text-sky-300 mt-0.5">{fmt(data.summary.finalP50)}</p>
            <p className="text-[10px] text-slate-500">cenário provável</p>
          </div>
          <div className="rounded-xl bg-slate-950/60 border border-white/[0.08] px-3 py-2.5" title="Cenário favorável se você acelerar a constância">
            <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Otimista (P90)</p>
            <p className="text-sm font-black font-mono tabular-nums text-emerald-300 mt-0.5">{fmt(data.summary.finalP90)}</p>
            <p className="text-[10px] text-slate-500">teto favorável</p>
          </div>
          <div className="rounded-xl bg-slate-950/60 border border-white/[0.08] px-3 py-2.5" title="Data estimada em que a linha P50 alcança a meta">
            <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wider flex items-center gap-1">
              <Target size={11} className="text-emerald-400 shrink-0" /> Cruzamento Meta
            </p>
            <p className="text-xs font-black font-mono tabular-nums text-white mt-0.5">
              {data.alreadyAtTarget
                ? 'Já na meta ✓'
                : (data.targetCrossingDate ? data.targetCrossingDate.split('-').reverse().join('/') : 'Acima do prazo')}
            </p>
            <p className="text-[10px] text-slate-500">quando P50 bate {fmt(targetScore)}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1 bg-slate-950/80 border border-white/[0.08] p-1 rounded-xl text-[11px] font-bold shadow-inner">
          <button
            type="button"
            onClick={() => setCustomHorizon(null)}
            aria-pressed={customHorizon === null}
            className={`px-2.5 py-1 rounded-lg border transition-colors ${
              customHorizon === null ? 'bg-emerald-500/25 text-emerald-200 border-emerald-400/45' : 'text-slate-400 hover:text-white border-transparent'
            }`}
          >
            Prova ({examHorizon}d)
          </button>
          {[30, 60, 90, 180].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setCustomHorizon(d)}
              aria-pressed={customHorizon === d}
              className={`px-2.5 py-1 rounded-lg border transition-colors ${
                customHorizon === d ? 'bg-indigo-500/25 text-indigo-100 border-indigo-400/45' : 'text-slate-400 hover:text-white border-transparent'
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
                tickFormatter={(v) => {
                  const decimals = (maxScore - minScore) <= 20 ? 1 : 0;
                  const formatted = formatValue(v, decimals);
                  return unit === '%' ? `${formatted}%` : formatted;
                }}
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
