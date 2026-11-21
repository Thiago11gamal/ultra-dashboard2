import React, { useMemo, useState } from 'react';
import { Clock, Flame, Target } from 'lucide-react';
import { buildCircadianHeatmapData } from '../../../utils/advancedChartHelpers';
import { formatDuration } from '../../../utils/dateHelper';

function getStudyCellClass(minutes, maxMinutes) {
  if (!minutes || maxMinutes <= 0) return 'bg-slate-800/40 border-white/5 text-slate-600';
  const ratio = minutes / maxMinutes;
  if (ratio < 0.25) return 'bg-indigo-900/50 border-indigo-700/40 text-indigo-200';
  if (ratio < 0.5) return 'bg-indigo-600/55 border-indigo-500/50 text-white';
  if (ratio < 0.78) return 'bg-violet-500/75 border-violet-400/70 text-white shadow-[0_0_8px_rgba(139,92,246,0.3)]';
  return 'bg-fuchsia-500/85 border-fuchsia-300/80 text-white font-bold shadow-[0_0_12px_rgba(217,70,239,0.45)]';
}

function getAccuracyCellClass(accuracyPct) {
  if (accuracyPct === null || accuracyPct === undefined) return 'bg-slate-800/40 border-white/5 text-slate-600';
  if (accuracyPct < 55) return 'bg-rose-500/55 border-rose-400/60 text-rose-100';
  if (accuracyPct < 75) return 'bg-amber-500/55 border-amber-400/60 text-amber-100';
  if (accuracyPct < 88) return 'bg-emerald-600/65 border-emerald-400/70 text-emerald-50';
  return 'bg-emerald-400/85 border-emerald-200/80 text-emerald-950 font-black shadow-[0_0_12px_rgba(52,211,153,0.45)]';
}

export const CircadianHeatmapChart = React.memo(function CircadianHeatmapChart({
  studyLogs = [],
  studySessions = [],
  simuladoRows = [],
  categories = [],
  minScore = 0,
  maxScore = 100,
  dayTick,
}) {
  const [metric, setMetric] = useState('study');
  const [activeCell, setActiveCell] = useState(null);

  const data = useMemo(() => {
    void dayTick;
    return buildCircadianHeatmapData(studyLogs, studySessions, simuladoRows, { minScore, maxScore, categories });
  }, [studyLogs, studySessions, simuladoRows, categories, minScore, maxScore, dayTick]);

  const hasCurrentMetricData = metric === 'study' ? data.timedLogCount > 0 : data.timedSimCount > 0;

  return (
    <div className="glass p-5 sm:p-6 rounded-3xl border border-white/10 shadow-2xl bg-slate-900/50 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-fuchsia-500/15 border border-fuchsia-500/30 flex items-center justify-center text-fuchsia-300 shrink-0">
            <Clock size={20} />
          </div>
          <div>
            <h2 className="text-sm font-black text-white uppercase tracking-widest leading-none">
              Heatmap Circadiano
            </h2>
            <p className="text-[11px] text-slate-400 mt-1">
              Produtividade e precisão por dia da semana × faixa de horário (2h)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-slate-950/70 border border-white/10 p-1 rounded-xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setMetric('study')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
              metric === 'study' ? 'bg-indigo-500/25 text-indigo-200 border border-indigo-400/40' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Flame size={13} />
            Horas de Estudo
          </button>
          <button
            type="button"
            onClick={() => setMetric('accuracy')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
              metric === 'accuracy' ? 'bg-emerald-500/25 text-emerald-200 border border-emerald-400/40' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Target size={13} />
            Taxa de Acerto
          </button>
        </div>
      </div>

      {/* Destaques de cronotipo */}
      <div className="flex flex-wrap items-center gap-2.5 text-[11px]">
        {data.chronotype && (
          <span className="px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-200 font-bold">
            Cronotipo dominante: {data.chronotype}
          </span>
        )}
        {data.peakStudyCell && (
          <span className="px-3 py-1 rounded-full bg-fuchsia-500/15 border border-fuchsia-500/30 text-fuchsia-200 font-bold">
            Pico de foco: {data.peakStudyCell.dayLabel} {data.peakStudyCell.slotLabel} ({formatDuration(data.peakStudyCell.minutes / 60)})
          </span>
        )}
        {data.peakAccuracyCell && (
          <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 font-bold">
            Melhor acerto: {data.peakAccuracyCell.dayLabel} {data.peakAccuracyCell.slotLabel} ({data.peakAccuracyCell.accuracyPct}%)
          </span>
        )}
      </div>

      {!hasCurrentMetricData ? (
        <div className="min-h-[180px] flex flex-col items-center justify-center gap-2 rounded-2xl border border-white/5 bg-slate-950/50 p-6 text-center">
          <p className="text-sm font-bold text-slate-300">
            {metric === 'study'
              ? 'Ainda sem sessões com horário registrado'
              : 'Ainda sem simulados com horário registrado'}
          </p>
          <p className="text-xs text-slate-500 max-w-md">
            {data.untimedLogCount > 0 && metric === 'study'
              ? `${data.untimedLogCount} registro(s) antigos possuem apenas data sem hora. Novas sessões do Pomodoro ou registros manuais preencherão este mapa automaticamente.`
              : 'Conclua sessões de estudo ou simulados para mapear os horários em que você rende mais.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto pb-1">
          <div className="min-w-[560px] space-y-1.5" role="grid" aria-label="Mapa circadiano por dia da semana e faixa horária">
            {/* Cabeçalho de horários */}
            <div className="grid grid-cols-[44px_repeat(12,minmax(0,1fr))] gap-1.5 text-center">
              <span />
              {data.slotLabels.map((slot) => (
                <span key={slot} className="text-[10px] font-mono font-bold text-slate-500">
                  {slot}
                </span>
              ))}
            </div>

            {/* 7 linhas (Dom - Sáb) */}
            {data.rows.map((row, dayIdx) => (
              <div key={data.weekdayLabels[dayIdx]} className="grid grid-cols-[44px_repeat(12,minmax(0,1fr))] gap-1.5 items-center" role="row">
                <span className="text-[11px] font-bold text-slate-400 text-right pr-2">
                  {data.weekdayLabels[dayIdx]}
                </span>
                {row.map((cell) => {
                  const isStudy = metric === 'study';
                  const cellCls = isStudy
                    ? getStudyCellClass(cell.minutes, data.maxMinutes)
                    : getAccuracyCellClass(cell.accuracyPct);
                  const displayVal = isStudy
                    ? (cell.minutes > 0 ? `${cell.minutes}m` : '')
                    : (cell.accuracyPct !== null ? `${Math.round(cell.accuracyPct)}%` : '');

                  return (
                    <button
                      key={`${cell.dayIdx}-${cell.slotIdx}`}
                      type="button"
                      onMouseEnter={() => setActiveCell(cell)}
                      onMouseLeave={() => setActiveCell(null)}
                      onFocus={() => setActiveCell(cell)}
                      onBlur={() => setActiveCell(null)}
                      aria-label={`${cell.dayLabel} ${cell.slotLabel}: ${cell.minutes} min, acerto ${cell.accuracyPct ?? 'sem dados'}`}
                      className={`h-8 rounded-lg border text-[9px] font-mono transition-all duration-150 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${cellCls}`}
                    >
                      {displayVal}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rodapé informativo da célula ativa */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5 text-xs text-slate-400">
        {activeCell ? (
          <div className="flex flex-wrap items-center gap-3 font-mono">
            <span className="font-black text-white">{activeCell.dayLabel} • {activeCell.slotLabel}</span>
            <span className="text-indigo-300">{formatDuration(activeCell.minutes / 60)} ({activeCell.sessions} sessões)</span>
            {activeCell.accuracyPct !== null && (
              <span className="text-emerald-300">{activeCell.accuracyPct}% acerto ({activeCell.simCount} sim.)</span>
            )}
          </div>
        ) : (
          <span className="text-[11px] text-slate-500">Passe o mouse sobre um bloco para ver minutos, sessões e acurácia naquele horário.</span>
        )}
        {data.untimedLogCount > 0 && (
          <span className="text-[10px] text-slate-500">
            ({data.untimedLogCount} log(s) sem hora exata ignorados)
          </span>
        )}
      </div>
    </div>
  );
});

export default CircadianHeatmapChart;
