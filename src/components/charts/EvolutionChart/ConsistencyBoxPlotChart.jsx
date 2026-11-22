import React, { useMemo, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { buildConsistencyBoxPlotData } from '../../../utils/advancedChartHelpers';
import { formatValue } from '../../../utils/scoreHelper';

const STABILITY_STYLE = {
  Estável: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  Moderada: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  Volátil: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  'Poucos dados': 'bg-slate-700/40 text-slate-400 border-slate-600/40',
};

export const ConsistencyBoxPlotChart = React.memo(function ConsistencyBoxPlotChart({
  categories = [],
  showOnlyFocus = false,
  focusSubjectId = null,
  timeWindow = 'all',
  targetScore = 80,
  minScore = 0,
  maxScore = 100,
  unit = '%',
}) {
  const [hoveredRow, setHoveredRow] = useState(null);
  const [pinnedRowId, setPinnedRowId] = useState(null);

  const data = useMemo(
    () =>
      buildConsistencyBoxPlotData(categories, {
        showOnlyFocus,
        focusSubjectId,
        timeWindow,
        minScore,
        maxScore,
      }),
    [categories, showOnlyFocus, focusSubjectId, timeWindow, minScore, maxScore]
  );

  const activeRow = useMemo(() => {
    if (hoveredRow) return hoveredRow;
    if (pinnedRowId) return data.rows.find((r) => r.id === pinnedRowId) || null;
    return null;
  }, [hoveredRow, pinnedRowId, data.rows]);

  const domainRange = Math.max(1e-6, data.domainMax - data.domainMin);
  const toPct = (v) => Math.max(0, Math.min(100, ((v - data.domainMin) / domainRange) * 100));
  const fmt = (v) => (unit === '%' ? `${Number(v).toFixed(1)}%` : `${formatValue(v)} ${unit}`);
  const targetLeftPct = toPct(targetScore);

  const ticks = useMemo(() => {
    return [0, 0.25, 0.5, 0.75, 1].map((t) => {
      const val = data.domainMin + t * domainRange;
      const formatted = formatValue(val, domainRange <= 10 ? 2 : 1);
      return {
        pct: t * 100,
        label: unit === '%' ? `${formatted}%` : formatted,
      };
    });
  }, [data.domainMin, domainRange, unit]);

  if (data.rows.length === 0) {
    return (
      <div className="min-h-[280px] flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/5 bg-slate-950/50 p-8 text-center">
        <BarChart3 size={34} className="text-indigo-400/50" />
        <p className="text-sm font-bold text-slate-300">Sem histórico suficiente para Box Plot de Consistência</p>
        <p className="text-xs text-slate-500">Registre simulados nas disciplinas para visualizar amplitude (Mín–Q1–Mediana–Q3–Máx).</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4" role="img" aria-label="Box Plot de Consistência por Matéria">
      {/* Legenda */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-5 h-2.5 rounded-sm bg-indigo-500/40 border border-indigo-400" />
            Caixa Q1–Q3 (50% central)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-0.5 h-3.5 bg-white" />
            Mediana
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rotate-45 bg-amber-300" />
            Média
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 border-t border-dashed border-emerald-400" />
            Meta ({fmt(targetScore)})
          </span>
          {data.hasCutoffs && (
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-0.5 h-3.5 bg-rose-400" />
              Corte mínimo
            </span>
          )}
        </div>
        <span className="text-[10px] text-slate-500">
          Estável: IQR ≤ 10% · Moderada: 10–18% · Volátil: &gt; 18% · Clique para fixar detalhes
        </span>
      </div>

      {/* Linhas por matéria */}
      <div className="space-y-2.5">
        {data.rows.map((row) => {
          const minP = toPct(row.min);
          const q1P = toPct(row.q1);
          const medP = toPct(row.median);
          const q3P = toPct(row.q3);
          const maxP = toPct(row.max);
          const meanP = toPct(row.mean);
          const cutoffP = row.minCutoff !== null ? toPct(row.minCutoff) : null;
          const isHovered = activeRow?.id === row.id;
          const badgeClass = STABILITY_STYLE[row.stability] || STABILITY_STYLE['Poucos dados'];

          return (
            <div
              key={row.id}
              tabIndex={0}
              onClick={() => setPinnedRowId((prev) => (prev === row.id ? null : row.id))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setPinnedRowId((prev) => (prev === row.id ? null : row.id));
                }
              }}
              onMouseEnter={() => setHoveredRow(row)}
              onMouseLeave={() => setHoveredRow(null)}
              onFocus={() => setHoveredRow(row)}
              onBlur={() => setHoveredRow(null)}
              className={`rounded-xl border px-3.5 py-3 transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
                isHovered
                  ? 'bg-slate-800/80 border-white/20 shadow-lg'
                  : 'bg-slate-950/50 border-white/5 hover:border-white/15'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <div className="sm:w-48 shrink-0 flex items-center justify-between sm:justify-start gap-2 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: row.color }} />
                    <span className="text-xs font-bold text-slate-200 truncate" title={row.name}>
                      {row.name}
                    </span>
                  </div>
                  <span className={`shrink-0 px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase ${badgeClass}`}>
                    {row.stability}
                  </span>
                </div>

                {/* Plot horizontal */}
                <div className="flex-1 relative h-8 select-none">
                  {/* Trilho base */}
                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 rounded-full bg-slate-800/90" />

                  {/* Linha vertical de meta */}
                  <div
                    className="absolute top-0 bottom-0 border-l border-dashed border-emerald-400/60 pointer-events-none"
                    style={{ left: `${targetLeftPct}%` }}
                  />

                  {/* Marcador de corte mínimo específico da matéria */}
                  {cutoffP !== null && (
                    <div
                      className="absolute top-0.5 bottom-0.5 w-0.5 bg-rose-400/80 pointer-events-none"
                      style={{ left: `${cutoffP}%` }}
                      title={`Corte mínimo: ${fmt(row.minCutoff)}`}
                    />
                  )}

                  {/* Whisker (Mínimo a Máximo) */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 h-0.5"
                    style={{
                      left: `${minP}%`,
                      width: `${Math.max(0.5, maxP - minP)}%`,
                      backgroundColor: row.color,
                      opacity: 0.75,
                    }}
                  />
                  {/* Caps do Whisker */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3 rounded"
                    style={{ left: `${minP}%`, backgroundColor: row.color }}
                  />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3 rounded"
                    style={{ left: `${maxP}%`, backgroundColor: row.color }}
                  />

                  {/* Caixa IQR (Q1 a Q3) */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 h-5 rounded-md border"
                    style={{
                      left: `${q1P}%`,
                      width: `${Math.max(1.5, q3P - q1P)}%`,
                      backgroundColor: `${row.color}38`,
                      borderColor: row.color,
                    }}
                  />

                  {/* Mediana */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-0.5 h-6 bg-white rounded shadow"
                    style={{ left: `${medP}%` }}
                  />

                  {/* Média (losango) */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rotate-45 bg-amber-300 border border-slate-950"
                    style={{ left: `${meanP}%` }}
                  />
                </div>

                {/* Números rápidos */}
                <div className="sm:w-36 shrink-0 flex items-center justify-between sm:justify-end gap-3 text-[11px] font-mono tabular-nums">
                  <span className="text-slate-400" title="Número de simulados">n={row.count}</span>
                  <span className="font-black text-white" title="Mediana">Med {fmt(row.median)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Eixo X inferior perfeitamente alinhado ao trilho do Box Plot */}
      <div className="px-3.5 sm:pl-[222px] sm:pr-[174px]">
        <div className="relative h-5 w-full">
          {ticks.map((t) => (
            <span
              key={t.pct}
              className="absolute -translate-x-1/2 text-[10px] font-mono text-slate-500"
              style={{ left: `${t.pct}%` }}
            >
              {t.label}
            </span>
          ))}
        </div>
      </div>

      {/* Painel de detalhe da linha selecionada/hovered */}
      {activeRow && (
        <div className="rounded-xl border border-white/10 bg-slate-950/90 p-3.5 space-y-2 text-xs">
          <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-white/10">
            <span className="font-black text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: activeRow.color }} />
              {activeRow.name}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {activeRow.count} simulados · {activeRow.stability}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
            <div>
              <p className="text-[9px] uppercase text-slate-500 font-bold">Mínimo</p>
              <p className="font-mono font-bold text-rose-300">{fmt(activeRow.min)}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase text-slate-500 font-bold">Q1 (25%)</p>
              <p className="font-mono font-bold text-slate-200">{fmt(activeRow.q1)}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase text-slate-500 font-bold">Mediana</p>
              <p className="font-mono font-black text-white">{fmt(activeRow.median)}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase text-slate-500 font-bold">Q3 (75%)</p>
              <p className="font-mono font-bold text-slate-200">{fmt(activeRow.q3)}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase text-slate-500 font-bold">Máximo</p>
              <p className="font-mono font-bold text-emerald-300">{fmt(activeRow.max)}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase text-slate-500 font-bold">IQR / Desvio</p>
              <p className="font-mono font-bold text-amber-300">
                {activeRow.iqr.toFixed(1)}{unit === '%' ? ' pp' : ` ${unit}`} / ±{activeRow.std.toFixed(1)}{unit === '%' ? ' pp' : ` ${unit}`}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default ConsistencyBoxPlotChart;
