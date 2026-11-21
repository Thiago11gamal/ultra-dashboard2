import React, { useMemo, useId } from 'react';
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
import { Activity, Sparkles } from 'lucide-react';
import { ChartFrame } from '../ChartFrame';
import { buildKalmanChartData } from '../../../utils/advancedChartHelpers';
import { formatValue } from '../../../utils/scoreHelper';

function KalmanDot(props) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null) return null;
  if (payload?.isOutlier) {
    return (
      <g>
        <circle cx={cx} cy={cy} r={8} fill="#f43f5e" fillOpacity={0.22} />
        <circle cx={cx} cy={cy} r={4.5} fill="#fb7185" stroke="#fff" strokeWidth={1.5} />
      </g>
    );
  }
  return <circle cx={cx} cy={cy} r={3.5} fill="#fb923c" stroke="#0f172a" strokeWidth={1} />;
}

function KalmanTooltip({ active, payload, unit }) {
  if (!active || !payload || !payload.length) return null;
  const pt = payload[0]?.payload;
  if (!pt) return null;
  const fmt = (v) => (unit === '%' ? `${Number(v).toFixed(1)}%` : `${formatValue(v)} ${unit}`);

  return (
    <div className="bg-slate-950/95 border border-white/15 rounded-2xl p-3.5 shadow-2xl backdrop-blur-xl min-w-[215px] text-xs">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-white/10 pb-1.5 mb-2">
        {pt.date}
      </p>
      <div className="space-y-1 font-mono">
        <div className="flex justify-between gap-4">
          <span className="text-emerald-300">Habilidade Latente:</span>
          <span className="font-black text-emerald-300">{fmt(pt.ability)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-orange-300">Nota Bruta:</span>
          <span className="font-bold text-white">{fmt(pt.rawScore)}</span>
        </div>
        <div className="flex justify-between gap-4 text-[11px] text-slate-400">
          <span>IC 95% Kalman:</span>
          <span>{fmt(pt.ci95Low)} – {fmt(pt.ci95High)}</span>
        </div>
        <div className="flex justify-between gap-4 text-[11px] text-slate-400">
          <span>Inovação (ruído):</span>
          <span className={pt.innovation >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
            {pt.innovation >= 0 ? '+' : ''}{pt.innovation}{unit === '%' ? '%' : ` ${unit}`}
          </span>
        </div>
      </div>
      {pt.isOutlier && (
        <p className="mt-2 pt-1.5 border-t border-rose-500/30 text-[10px] text-rose-300 font-semibold">
          ⚡ Choque pontual de ruído absorvido pelo filtro
        </p>
      )}
    </div>
  );
}

export const KalmanLatentChart = React.memo(function KalmanLatentChart({
  focusCategory = null,
  timeline = [],
  timeWindow = 'all',
  targetScore = 80,
  minScore = 0,
  maxScore = 100,
  unit = '%',
}) {
  const uid = useId().replace(/:/g, '');
  const kalman = useMemo(
    () => buildKalmanChartData(focusCategory, timeline, { minScore, maxScore, timeWindow }),
    [focusCategory, timeline, minScore, maxScore, timeWindow]
  );

  const fmt = (v) => (unit === '%' ? `${Number(v).toFixed(1)}%` : `${formatValue(v)} ${unit}`);

  if (!kalman.points.length || !kalman.summary) {
    return (
      <div className="min-h-[300px] flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/5 bg-slate-950/50 p-8 text-center">
        <Activity size={34} className="text-emerald-400/50" />
        <p className="text-sm font-bold text-slate-300">Necessário ao menos 2 simulados para ativar o Filtro de Kalman</p>
        <p className="text-xs text-slate-500 max-w-md">
          O modelo State-Space separa sua habilidade real latente do ruído aleatório de simulados pontuais.
        </p>
      </div>
    );
  }

  const { summary } = kalman;
  const trendPositive = summary.trendPerMonth >= 0;
  const unitSuffix = unit === '%' ? '%' : ` ${unit}`;

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-200 font-bold">
          <span>{focusCategory ? `🎯 Foco: ${focusCategory.name}` : '🌐 Visão Global'}</span>
        </span>
        <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-400">
          <span className="inline-flex items-center gap-1.5"><span className="w-3 h-0.5 bg-emerald-400 inline-block" /> Habilidade real (Kalman)</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block" /> Nota bruta</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-400 inline-block" /> Choque de ruído absorvido</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl bg-slate-950/70 border border-emerald-500/30 p-3" title="Seu domínio real estimado após filtrar oscilações aleatórias">
          <p className="text-[9px] uppercase text-slate-400 font-bold">Habilidade Latente</p>
          <p className="text-lg font-black font-mono text-emerald-300">{fmt(summary.ability)}</p>
          <p className="text-[10px] text-slate-500 font-mono">±{summary.abilitySd.toFixed(1)}{unitSuffix} (1σ)</p>
        </div>
        <div className="rounded-xl bg-slate-950/70 border border-white/5 p-3" title="Ritmo estrutural de ganho ou perda projetado a cada 30 dias">
          <p className="text-[9px] uppercase text-slate-400 font-bold">Tendência / Mês</p>
          <p className={`text-lg font-black font-mono ${trendPositive ? 'text-sky-300' : 'text-rose-400'}`}>
            {trendPositive ? '+' : ''}{summary.trendPerMonth.toFixed(1)}{unitSuffix}
          </p>
          <p className="text-[10px] text-slate-500">velocidade estrutural</p>
        </div>
        <div className="rounded-xl bg-slate-950/70 border border-white/5 p-3" title="Quanto da oscilação bruta foi filtrada pelo modelo">
          <p className="text-[9px] uppercase text-slate-400 font-bold flex items-center gap-1">
            <Sparkles size={10} className="text-indigo-400" /> Ruído Filtrado
          </p>
          <p className="text-lg font-black font-mono text-indigo-300">{summary.noiseReductionPct}%</p>
          <p className="text-[10px] text-slate-500">σ obs {summary.observationSd.toFixed(1)} → σ real {summary.abilitySd.toFixed(1)}</p>
        </div>
        <div className="rounded-xl bg-slate-950/70 border border-white/5 p-3" title="Simulados muito fora da curva que o filtro amortizou para não distorcer sua tendência">
          <p className="text-[9px] uppercase text-slate-400 font-bold">Choques de Ruído</p>
          <p className="text-lg font-black font-mono text-rose-300">{summary.outlierCount}</p>
          <p className="text-[10px] text-slate-500">em {summary.sampleSize} simulados</p>
        </div>
      </div>

      <ChartFrame minHeight={340} label="Executando filtro State-Space Kalman">
        <div className="h-[340px] w-full" role="img" aria-label="Gráfico de Habilidade Latente (Filtro de Kalman) versus Notas Brutas">
          <ResponsiveContainer width="100%" height="100%" minHeight={300} minWidth={1}>
            <ComposedChart data={kalman.points} margin={{ top: 16, right: 20, left: 4, bottom: 12 }}>
              <defs>
                <linearGradient id={`kalmanBand_${uid}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.06} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="displayDate" stroke="#64748b" fontSize={10} />
              <YAxis
                domain={[minScore, maxScore]}
                stroke="#64748b"
                fontSize={11}
                tickFormatter={(v) => (unit === '%' ? `${Math.round(v)}%` : `${Math.round(v)}`)}
              />
              <Tooltip content={<KalmanTooltip unit={unit} />} />
              <ReferenceLine
                y={targetScore}
                stroke="#6366f1"
                strokeDasharray="4 4"
                label={{ value: `Meta ${fmt(targetScore)}`, position: 'insideTopRight', fill: '#818cf8', fontSize: 10 }}
              />
              <Area
                type="monotone"
                dataKey="ciBand"
                name="IC 95% Kalman"
                fill={`url(#kalmanBand_${uid})`}
                stroke="none"
                isAnimationActive={false}
              />
              <Line
                type="linear"
                dataKey="rawScore"
                name="Nota Bruta"
                stroke="#fb923c"
                strokeWidth={1.5}
                strokeOpacity={0.45}
                strokeDasharray="3 3"
                dot={<KalmanDot />}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="ability"
                name="Habilidade Latente (Kalman)"
                stroke="#34d399"
                strokeWidth={3}
                dot={{ r: 3, fill: '#34d399' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </ChartFrame>
    </div>
  );
});

export default KalmanLatentChart;
