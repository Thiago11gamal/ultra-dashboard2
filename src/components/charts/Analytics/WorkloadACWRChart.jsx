import React, { useMemo } from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
} from 'recharts';
import { Flame, HeartPulse } from 'lucide-react';
import { ChartFrame } from '../ChartFrame';
import { computeACWR } from '../../../engine/adaptive/workloadACWR';

const ZONE_STYLE = {
  optimal: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35',
  detraining: 'bg-sky-500/15 text-sky-300 border-sky-500/35',
  elevated: 'bg-amber-500/15 text-amber-300 border-amber-500/35',
  burnout_risk: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  inactive: 'bg-slate-700/40 text-slate-300 border-slate-600/40',
};

function ACWRTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const pt = payload[0]?.payload;
  if (!pt) return null;
  return (
    <div className="bg-slate-950/95 border border-white/15 rounded-2xl p-3.5 shadow-2xl text-xs min-w-[200px]">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-white/10 pb-1 mb-2">
        {pt.label}
      </p>
      <div className="space-y-1 font-mono">
        <div className="flex justify-between gap-4"><span className="text-emerald-300">ACWR:</span><span className="font-black text-white">{pt.acwr.toFixed(2)}×</span></div>
        <div className="flex justify-between gap-4"><span className="text-sky-300">Aguda (7d):</span><span>{pt.acuteHours}h</span></div>
        <div className="flex justify-between gap-4"><span className="text-slate-400">Crônica (média/sem):</span><span>{pt.chronicHours}h</span></div>
        <div className="flex justify-between gap-4"><span className="text-indigo-300">Dia:</span><span>{pt.hoursToday}h</span></div>
        {pt.avgEnergy !== null && (
          <div className="flex justify-between gap-4 text-amber-300"><span>Energia:</span><span>{pt.avgEnergy}/5</span></div>
        )}
      </div>
    </div>
  );
}

export const WorkloadACWRChart = React.memo(function WorkloadACWRChart({ studyLogs = [], dayTick }) {
  const data = useMemo(() => {
    void dayTick;
    return computeACWR(studyLogs);
  }, [studyLogs, dayTick]);
  const badgeCls = ZONE_STYLE[data.zone] || ZONE_STYLE.optimal;
  // B5 FIX: domínio dinâmico para não cortar picos reais de burnout (> 2.2x até 3.0x)
  const maxSeriesAcwr = data.series.reduce((mx, p) => Math.max(mx, Number(p?.acwr) || 0), 2.0);
  const yDomainMax = Math.min(3.0, Math.max(2.2, Math.ceil((maxSeriesAcwr + 0.2) * 2) / 2));

  return (
    <div className="glass p-5 sm:p-6 rounded-3xl border border-white/10 shadow-2xl bg-slate-900/45 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-300 shrink-0">
            <HeartPulse size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-black text-white uppercase tracking-widest leading-none">
                Monitor de Carga & Burnout (ACWR)
              </h2>
              <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase ${badgeCls}`}>
                {data.zoneLabel}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">{data.advice}</p>
          </div>
        </div>
      </div>

      {data.totalValidLogs === 0 ? (
        <div className="min-h-[160px] flex flex-col items-center justify-center gap-2 rounded-2xl border border-white/5 bg-slate-950/50 p-6 text-center">
          <p className="text-sm font-bold text-slate-300">
            Ainda sem sessões de estudo registradas
          </p>
          <p className="text-xs text-slate-500 max-w-md">
            Conclua sessões no Pomodoro ou registre horas de estudo para ativar o monitor de carga aguda vs. crônica (ACWR) e a recomendação adaptativa de blocos.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl bg-slate-950/60 border border-white/5 p-3">
              <p className="text-[9px] uppercase text-slate-500 font-bold">Razão ACWR</p>
              <p className="text-lg font-black font-mono text-white">{data.acwr.toFixed(2)}×</p>
              <p className="text-[10px] text-slate-500">Zona ótima: 0.8–1.3×</p>
            </div>
            <div className="rounded-xl bg-slate-950/60 border border-white/5 p-3">
              <p className="text-[9px] uppercase text-slate-500 font-bold">Aguda (7d) vs Crônica</p>
              <p className="text-lg font-black font-mono text-sky-300">{data.acuteHours}h <span className="text-xs text-slate-500">/ {data.chronicHours}h</span></p>
            </div>
            <div className="rounded-xl bg-slate-950/60 border border-white/5 p-3">
              <p className="text-[9px] uppercase text-slate-500 font-bold flex items-center gap-1"><Flame size={10} className="text-amber-400" /> Fadiga Adaptativa</p>
              <p className="text-lg font-black font-mono text-amber-300">{data.adaptiveFatigue}/100</p>
            </div>
            <div className="rounded-xl bg-slate-950/60 border border-white/5 p-3">
              <p className="text-[9px] uppercase text-slate-500 font-bold">Pomodoro Sugerido</p>
              <p className="text-lg font-black font-mono text-emerald-300">{data.recommendedBlockMinutes} min</p>
              <p className="text-[10px] text-slate-500">{data.recentAvgEnergy ? `Energia ${data.recentAvgEnergy}/5` : 'Baseado na carga'}</p>
            </div>
          </div>

          <ChartFrame minHeight={240} label="Calculando carga aguda vs crônica">
            <div className="h-[240px] w-full" role="img" aria-label="Gráfico ACWR de carga aguda versus crônica">
              <ResponsiveContainer width="100%" height="100%" minHeight={210} minWidth={1}>
                <ComposedChart data={data.series} margin={{ top: 10, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <ReferenceArea yAxisId="left" y1={0.8} y2={1.3} fill="#10b981" fillOpacity={0.09} />
                  <ReferenceArea yAxisId="left" y1={1.5} y2={yDomainMax} fill="#f43f5e" fillOpacity={0.07} />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={10} />
                  <YAxis yAxisId="left" domain={[0, yDomainMax]} stroke="#34d399" fontSize={10} tickFormatter={(v) => `${v}×`} />
                  <YAxis yAxisId="right" orientation="right" stroke="#6366f1" fontSize={10} tickFormatter={(v) => `${v}h`} />
                  <Tooltip content={<ACWRTooltip />} />
                  <ReferenceLine yAxisId="left" y={1.5} stroke="#f43f5e" strokeDasharray="4 4" />
                  <Bar yAxisId="right" dataKey="hoursToday" name="Horas no Dia" fill="#6366f1" fillOpacity={0.45} radius={[4, 4, 0, 0]} barSize={14} />
                  <Line yAxisId="left" type="monotone" dataKey="acwr" name="ACWR (7d/28d)" stroke="#34d399" strokeWidth={2.5} dot={{ r: 2.5 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </ChartFrame>
        </>
      )}
    </div>
  );
});

export default WorkloadACWRChart;
