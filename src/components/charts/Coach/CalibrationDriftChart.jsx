import React, { useMemo, useState } from 'react';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  Legend,
} from 'recharts';
import { ChartFrame } from '../ChartFrame';
import { buildCalibrationSeriesData } from '../../../utils/advancedChartHelpers';
import { normalize } from '../../../utils/normalization';

function CalibrationTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const pt = payload[0]?.payload;
  if (!pt) return null;

  return (
    <div className="bg-slate-950/95 border border-white/15 rounded-2xl p-3.5 shadow-2xl text-xs min-w-[190px]">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-white/10 pb-1 mb-2">
        {pt.dateLabel} {pt.label ? `• ${pt.label}` : ''}
      </p>
      <div className="space-y-1 font-mono">
        {pt.brier !== null && (
          <div className="flex justify-between gap-4">
            <span className="text-rose-300">Brier Score:</span>
            <span className="font-black text-white">{pt.brier.toFixed(3)}</span>
          </div>
        )}
        {pt.ece !== null && (
          <div className="flex justify-between gap-4">
            <span className="text-cyan-300">ECE:</span>
            <span className="font-black text-white">{pt.ece.toFixed(3)}</span>
          </div>
        )}
      </div>
      <p className="text-[10px] text-slate-500 mt-1.5">Quanto menor, mais calibrado o motor.</p>
    </div>
  );
}

export const CalibrationDriftChart = React.memo(function CalibrationDriftChart({
  series = null,
  auditLogs = [],
  historyByCategory = {},
  healthSnapshots = [],
  categories = [],
  categoryFilter = 'all',
  height = 240,
}) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const effectiveFilter = categoryFilter !== 'all' ? categoryFilter : selectedCategory;

  const availableCategories = useMemo(() => {
    if (Array.isArray(series) && series.length > 0) return [];
    const safeCats = Array.isArray(categories) ? categories : Object.values(categories || {});
    const nameMap = new Map();
    safeCats.forEach((c) => {
      if (!c?.name) return;
      const nk = normalize(c.name);
      if (nk) nameMap.set(nk, c.name);
      if (c.id != null) {
        const ik = normalize(String(c.id));
        if (ik) nameMap.set(ik, c.name);
      }
    });
    const found = new Map();
    const logs = Array.isArray(auditLogs) ? auditLogs : Object.values(auditLogs || {});
    logs.forEach((log) => {
      if (!log) return;
      const raw = String(log.categoryName || log.categoryId || '').trim();
      const nk = normalize(raw);
      if (!nk) return;
      const resolved = nameMap.get(nk) || (nameMap.size === 0 ? raw : null);
      if (resolved) found.set(normalize(resolved), resolved);
    });
    if (historyByCategory && typeof historyByCategory === 'object') {
      Object.entries(historyByCategory).forEach(([k, arr]) => {
        const list = Array.isArray(arr) ? arr : Object.values(arr || {});
        if (list.length === 0) return;
        const nk = normalize(k);
        const resolved = nameMap.get(nk) || (nameMap.size === 0 ? k : null);
        if (resolved) found.set(normalize(resolved), resolved);
      });
    }
    return Array.from(found.values()).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [series, auditLogs, historyByCategory, categories]);

  const activeCategoryValue = useMemo(() => {
    if (effectiveFilter === 'all') return 'all';
    const match = availableCategories.find((c) => normalize(c) === normalize(effectiveFilter));
    return match || (categoryFilter !== 'all' ? categoryFilter : 'all');
  }, [effectiveFilter, availableCategories, categoryFilter]);

  const data = useMemo(() => {
    if (Array.isArray(series) && series.length > 0) {
      return series.map((pt, idx) => {
        const d = pt.ts > 0 ? new Date(pt.ts) : null;
        return {
          ...pt,
          dateLabel: d && !Number.isNaN(d.getTime())
            ? `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
            : `#${idx + 1}`,
          brier: pt.brier != null && Number.isFinite(Number(pt.brier)) ? Number(Number(pt.brier).toFixed(4)) : null,
          ece: pt.ece != null && Number.isFinite(Number(pt.ece)) ? Number(Number(pt.ece).toFixed(4)) : null,
        };
      });
    }
    return buildCalibrationSeriesData(auditLogs, historyByCategory, healthSnapshots, {
      categoryFilter: activeCategoryValue,
      categories,
    });
  }, [series, auditLogs, historyByCategory, healthSnapshots, activeCategoryValue, categories]);

  if (!data.length) {
    return (
      <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-6 text-center text-xs text-slate-400">
        Sem histórico temporal de Brier Score / ECE ainda. As curvas aparecerão após as auditorias de calibração.
      </div>
    );
  }

  const maxMetric = Math.max(
    0.35,
    ...data.map((d) => Math.max(d.brier || 0, d.ece || 0))
  );
  const yMax = Math.min(1, Number((maxMetric * 1.15).toFixed(2)));

  return (
    <div className="space-y-3">
      {categoryFilter === 'all' && availableCategories.length > 1 && (
        <div className="flex justify-end">
          <select
            aria-label="Filtrar evolução de calibração por disciplina"
            value={activeCategoryValue}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 outline-none focus:border-cyan-400"
          >
            <option value="all">Todas (Média Diária)</option>
            {availableCategories.map((catName) => (
              <option key={catName} value={catName}>
                {catName}
              </option>
            ))}
          </select>
        </div>
      )}
      <ChartFrame minHeight={height} label="Traçando drift de calibração">
        <div style={{ height }} className="w-full" role="img" aria-label="Evolução temporal do Brier Score e ECE">
          <ResponsiveContainer width="100%" height={height} minHeight={200} minWidth={1}>
          <ComposedChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
            <ReferenceArea y1={0} y2={0.18} fill="#10b981" fillOpacity={0.05} />
            <ReferenceArea y1={0.25} y2={yMax} fill="#f43f5e" fillOpacity={0.06} />
            <XAxis dataKey="dateLabel" stroke="#64748b" fontSize={10} />
            <YAxis domain={[0, yMax]} stroke="#64748b" fontSize={10} tickFormatter={(v) => Number(v).toFixed(2)} />
            <Tooltip content={<CalibrationTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <ReferenceLine y={0.25} stroke="#f43f5e" strokeDasharray="4 4" label={{ value: 'Crítico (0.25)', position: 'insideTopRight', fill: '#fb7185', fontSize: 9 }} />
            <ReferenceLine y={0.12} stroke="#22d3ee" strokeDasharray="3 3" label={{ value: 'Alvo ECE (0.12)', position: 'insideTopLeft', fill: '#67e8f9', fontSize: 9 }} />
            <Line
              type="monotone"
              dataKey="brier"
              name="Brier Score (erro)"
              stroke="#fb7185"
              strokeWidth={2.5}
              dot={{ r: 3.5, fill: '#fb7185' }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="ece"
              name="ECE (calibração)"
              stroke="#22d3ee"
              strokeWidth={2.5}
              dot={{ r: 3.5, fill: '#22d3ee' }}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
    </div>
  );
});

export default CalibrationDriftChart;
