import React, { useMemo, useState } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  Cell,
} from 'recharts';
import { Gauge, Layers, BookOpen } from 'lucide-react';
import { ChartFrame } from '../ChartFrame';
import { BenchmarkStrip } from '../../ui/BenchmarkStrip';
import { buildSpeedAccuracyData } from '../../../utils/advancedChartHelpers';

const formatSec = (s) => {
  const n = Math.round(Math.max(0, Number(s) || 0));
  const m = Math.floor(n / 60);
  const sec = n % 60;
  return m === 0 ? `${sec}s` : sec === 0 ? `${m}m` : `${m}m${String(sec).padStart(2, '0')}s`;
};

const QUADRANT_BADGE = {
  fastAccurate: {
    label: 'Domínio Rápido',
    hint: 'Rápido e acima da meta',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/30',
  },
  fastInaccurate: {
    label: 'Leitura Apressada',
    hint: 'Rápido, mas abaixo da meta',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/30',
  },
  slowAccurate: {
    label: 'Precisa Agilidade',
    hint: 'Acima da meta, mas lento',
    color: 'text-sky-400',
    bg: 'bg-sky-500/10 border-sky-500/30',
  },
  slowInaccurate: {
    label: 'Lacuna Teórica',
    hint: 'Lento e abaixo da meta',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10 border-rose-500/30',
  },
};

function SpeedAccuracyTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const pt = payload[0]?.payload;
  if (!pt) return null;
  const qStyle = QUADRANT_BADGE[pt.quadrant] || QUADRANT_BADGE.slowInaccurate;

  return (
    <div className="bg-slate-950/95 border border-white/15 rounded-2xl p-3.5 shadow-2xl backdrop-blur-xl min-w-[200px]">
      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/10">
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: pt.color }} />
        <div className="min-w-0">
          <p className="text-xs font-black text-white truncate">{pt.name}</p>
          {pt.subtitle && <p className="text-[10px] text-slate-400 truncate">{pt.subtitle}</p>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs mb-2">
        <div className="bg-slate-900/80 border border-white/[0.06] rounded-xl p-2">
          <p className="text-[10px] uppercase text-slate-400 font-bold">Tempo / Q</p>
          <p className="font-black font-mono tabular-nums text-cyan-300">{formatSec(pt.avgSeconds)}</p>
        </div>
        <div className="bg-slate-900/80 border border-white/[0.06] rounded-xl p-2">
          <p className="text-[10px] uppercase text-slate-400 font-bold">Acerto</p>
          <p className="font-black font-mono tabular-nums text-emerald-300">{pt.accuracyPct}%</p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 text-[10px]">
        <span className="text-slate-400 font-mono">{pt.totalQuestions} questões</span>
        <span className={`px-2 py-0.5 rounded-full border font-bold ${qStyle.bg} ${qStyle.color}`}>
          {qStyle.label}
        </span>
      </div>
    </div>
  );
}

export const SpeedAccuracyChart = React.memo(function SpeedAccuracyChart({
  categories = [],
  simuladoRows = [],
  showOnlyFocus = false,
  focusSubjectId = null,
  timeWindow = 'all',
  targetScore = 80,
  minScore = 0,
  maxScore = 100,
  examDurationMinutes = null,
  examTotalQuestions = null,
}) {
  const [mode, setMode] = useState('subject');

  const idealSec = useMemo(() => {
    const dur = Number(examDurationMinutes);
    const q = Number(examTotalQuestions);
    return Number.isFinite(dur) && dur > 0 && Number.isFinite(q) && q > 0
      ? Math.round((dur * 60) / q)
      : null;
  }, [examDurationMinutes, examTotalQuestions]);

  const data = useMemo(
    () =>
      buildSpeedAccuracyData(categories, simuladoRows, {
        mode,
        showOnlyFocus,
        focusSubjectId,
        timeWindow,
        targetScore,
        minScore,
        maxScore,
        idealSecondsPerQuestion: idealSec,
      }),
    [categories, simuladoRows, mode, showOnlyFocus, focusSubjectId, timeWindow, targetScore, minScore, maxScore, idealSec]
  );

  const maxX = useMemo(() => {
    if (!data.points.length) return 240;
    const highest = Math.max(data.benchmarkSeconds * 1.4, ...data.points.map((p) => p.avgSeconds));
    return Math.ceil((highest * 1.15) / 15) * 15;
  }, [data]);

  const speedBenchmark = useMemo(() => {
    if (!data.points.length) return null;
    const totalQ = data.points.reduce((acc, p) => acc + Math.max(1, Number(p.totalQuestions) || 1), 0);
    const avgSec = data.points.reduce((acc, p) => acc + p.avgSeconds * Math.max(1, Number(p.totalQuestions) || 1), 0) / totalQ;
    const avgAcc = data.points.reduce((acc, p) => acc + p.accuracyPct * Math.max(1, Number(p.totalQuestions) || 1), 0) / totalQ;
    const fastAcc = data.quadrants.fastAccurate || 0;
    const secDiff = Math.round(avgSec - data.benchmarkSeconds);
    const accDiff = avgAcc - data.targetPct;
    const isOptimal = secDiff <= 0 && accDiff >= 0;
    const status = isOptimal ? 'success' : (accDiff >= -8 && secDiff <= 25 ? 'warning' : 'danger');
    const gapParts = [];
    if (secDiff > 0) gapParts.push(`+${secDiff}s/q lento`);
    else gapParts.push('Ritmo ok');
    gapParts.push(accDiff >= 0 ? `+${accDiff.toFixed(1)}pp meta` : `${accDiff.toFixed(1)}pp meta`);
    return {
      currentValue: `${formatSec(avgSec)}/q · ${avgAcc.toFixed(1)}%`,
      targetValue: `≤ ${formatSec(data.benchmarkSeconds)}/q · ≥ ${data.targetPct}%`,
      gapLabel: isOptimal ? 'Na zona ideal ✓' : gapParts.join(' · '),
      status,
      progressPct: (fastAcc / Math.max(1, data.points.length)) * 100,
      extra: `${fastAcc}/${data.points.length} em Domínio Rápido`,
    };
  }, [data]);

  return (
    <div className="w-full space-y-4">
      {speedBenchmark && (
        <BenchmarkStrip
          currentLabel="Seu ritmo × acerto"
          currentValue={speedBenchmark.currentValue}
          targetLabel="Alvo"
          targetValue={speedBenchmark.targetValue}
          gapLabel={speedBenchmark.gapLabel}
          status={speedBenchmark.status}
          progressPct={speedBenchmark.progressPct}
          extra={speedBenchmark.extra}
          compact
        />
      )}
      {/* Controles + Resumo dos 4 quadrantes */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-slate-950/80 border border-white/[0.08] p-1 rounded-xl shadow-inner">
          <button
            type="button"
            onClick={() => setMode('subject')}
            aria-pressed={mode === 'subject'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
              mode === 'subject'
                ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400/45 shadow-sm'
                : 'text-slate-400 hover:text-white border-transparent hover:bg-white/[0.04]'
            }`}
          >
            <BookOpen size={13} />
            Por Disciplina
          </button>
          <button
            type="button"
            onClick={() => setMode('topic')}
            aria-pressed={mode === 'topic'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
              mode === 'topic'
                ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400/45 shadow-sm'
                : 'text-slate-400 hover:text-white border-transparent hover:bg-white/[0.04]'
            }`}
          >
            <Layers size={13} />
            Por Assunto
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
          {Object.entries(QUADRANT_BADGE).map(([key, meta]) => (
            <span
              key={key}
              title={meta.hint}
              className={`px-2.5 py-1 rounded-full border ${meta.bg} ${meta.color} tabular-nums`}
            >
              {meta.label}: {data.quadrants[key] || 0}
              <span className="hidden xl:inline opacity-75 font-medium"> ({meta.hint})</span>
            </span>
          ))}
        </div>
      </div>

      {data.points.length === 0 ? (
        <div className="min-h-[300px] flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/[0.08] bg-slate-950/55 p-8 text-center">
          <Gauge size={34} className="text-cyan-400/60" />
          <p className="text-sm font-bold text-slate-300">Sem registros cronometrados de questões ainda</p>
          <p className="text-xs text-slate-400 max-w-md">
            Realize simulados com cronômetro (como o Simulado IA ou registrando o tempo gasto) para cruzar velocidade (s/questão) × precisão (%).
          </p>
        </div>
      ) : (
        <ChartFrame minHeight={340} label="Calibrando matriz Speed × Precisão">
          <div className="h-[340px] w-full" role="img" aria-label="Gráfico de dispersão Speed vs Precisão">
            <ResponsiveContainer width="100%" height="100%" minHeight={300} minWidth={1}>
              <ScatterChart margin={{ top: 20, right: 24, bottom: 28, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                {/* Fundo suave dos 4 quadrantes */}
                <ReferenceArea x1={0} x2={data.benchmarkSeconds} y1={data.targetPct} y2={100} fill="#10b981" fillOpacity={0.06} />
                <ReferenceArea x1={0} x2={data.benchmarkSeconds} y1={0} y2={data.targetPct} fill="#f59e0b" fillOpacity={0.05} />
                <ReferenceArea x1={data.benchmarkSeconds} x2={maxX} y1={data.targetPct} y2={100} fill="#38bdf8" fillOpacity={0.05} />
                <ReferenceArea x1={data.benchmarkSeconds} x2={maxX} y1={0} y2={data.targetPct} fill="#f43f5e" fillOpacity={0.06} />

                <XAxis
                  type="number"
                  dataKey="avgSeconds"
                  name="Tempo/Questão"
                  domain={[0, maxX]}
                  tickFormatter={formatSec}
                  stroke="#64748b"
                  fontSize={11}
                  label={{ value: 'Segundos por questão (menor = mais rápido)', position: 'insideBottom', offset: -16, fill: '#64748b', fontSize: 10 }}
                />
                <YAxis
                  type="number"
                  dataKey="accuracyPct"
                  name="Acerto"
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                  stroke="#64748b"
                  fontSize={11}
                />
                <ZAxis type="number" dataKey="totalQuestions" range={[90, 520]} name="Questões" />

                <ReferenceLine
                  x={data.benchmarkSeconds}
                  stroke="#38bdf8"
                  strokeDasharray="4 4"
                  label={{ value: `Alvo ${formatSec(data.benchmarkSeconds)}/q`, position: 'top', fill: '#38bdf8', fontSize: 10 }}
                />
                <ReferenceLine
                  y={data.targetPct}
                  stroke="#10b981"
                  strokeDasharray="4 4"
                  label={{ value: `Meta ${data.targetPct}%`, position: 'insideTopRight', fill: '#10b981', fontSize: 10 }}
                />

                <Tooltip content={<SpeedAccuracyTooltip />} cursor={{ strokeDasharray: '3 3', stroke: '#94a3b8' }} />

                <Scatter data={data.points} name="Disciplinas">
                  {data.points.map((pt) => (
                    <Cell
                      key={pt.id}
                      fill={pt.color}
                      fillOpacity={0.82}
                      stroke="#ffffff"
                      strokeWidth={1.5}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </ChartFrame>
      )}
    </div>
  );
});

export default SpeedAccuracyChart;
