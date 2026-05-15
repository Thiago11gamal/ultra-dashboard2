import React, { useMemo, useState } from 'react';
import { aggregateHeatmap } from '../../utils/heatmapAggregation.js';

export const EvolutionHeatmap = ({ heatmapData, targetScore = 70, unit = '%', showOnlyFocus, focusSubjectId }) => {
    const { dates = [], rows = [] } = heatmapData || {};
    
    // 🎯 FILTRO DE FOCO: Aplica o filtro de "Todas as Matérias" vs "Apenas Foco"
    const filteredRowsByFocus = useMemo(() => {
        if (!showOnlyFocus) return rows;
        return rows.filter(row => row.cat?.id === focusSubjectId);
    }, [rows, showOnlyFocus, focusSubjectId]);

    const [windowSize, setWindowSize] = useState('all');
    const [granularity, setGranularity] = useState('daily');

    const filtered = useMemo(() => {
        if (!Array.isArray(dates) || !Array.isArray(filteredRowsByFocus)) return { dates: [], rows: [] };
        const size = windowSize === 'all' ? dates.length : Number(windowSize);
        const safeSize = Number.isFinite(size) ? Math.max(1, size) : dates.length;
        const start = Math.max(0, dates.length - safeSize);

        return {
            dates: dates.slice(start),
            rows: filteredRowsByFocus.map((row) => ({
                ...row,
                cells: Array.isArray(row.cells) ? row.cells.slice(start) : []
            }))
        };
    }, [dates, filteredRowsByFocus, windowSize]);

    // Requisito de teste: aggregateHeatmap(filtered, granularity)
    const aggregated = useMemo(() => aggregateHeatmap(filtered, granularity, targetScore), [filtered, granularity, targetScore]);

    const filteredDates = aggregated.dates;
    const filteredRows = aggregated.rows;

    const totals = filteredRows
        .flatMap((row) => (Array.isArray(row?.cells) ? row.cells : []))
        .map((cell) => Number(cell?.total) || 0);
    const maxCellTotal = totals.length > 0 ? totals.reduce((m, v) => Math.max(m, v), 1) : 1;

    const cellColor = (pct, total = 0) => {
        if (pct == null) return { bg: 'rgba(255,255,255,0.02)', text: '#64748b', border: '#1e293b', density: 0 };
        const density = Math.min(1, (Number(total) || 0) / maxCellTotal);
        if (pct >= targetScore) return { bg: 'rgba(34,197,94,0.45)', text: '#4ade80', border: 'rgba(34,197,94,0.6)', density };
        if (pct >= targetScore * 0.8) return { bg: 'rgba(251,191,36,0.4)', text: '#fcd34d', border: 'rgba(251,191,36,0.6)', density };
        if (pct >= targetScore * 0.6) return { bg: 'rgba(251,146,60,0.4)', text: '#fb923c', border: 'rgba(251,146,60,0.6)', density };
        return { bg: 'rgba(239,68,68,0.4)', text: '#f87171', border: 'rgba(239,68,68,0.6)', density };
    };

    const formatPct = (value) => {
        if (!Number.isFinite(value)) return '—';
        const rounded = Number(value.toFixed(2));
        return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(2)}${unit}`;
    };

    if (!filteredDates.length) return (
        <div className="h-48 flex items-center justify-center text-slate-500 text-sm">
            Nenhum dado encontrado.
        </div>
    );

    return (
        <div className="w-full overflow-x-auto overflow-y-visible custom-scrollbar pb-8 sm:pb-10 px-1 rounded-none border border-slate-800/80 bg-gradient-to-b from-slate-950/95 to-slate-900/90 shadow-[0_18px_45px_rgba(2,6,23,0.5)]">
            <div className="flex flex-wrap items-center gap-3.5 mb-5 text-[11px] text-slate-300">
                <div className="flex items-center gap-1 bg-slate-950/75 border border-slate-700/80 rounded-none p-1.5 mr-2 shadow-sm">
                    {[{ label: '4 sem', value: '28' }, { label: '8 sem', value: '56' }, { label: '12 sem', value: '84' }, { label: 'Tudo', value: 'all' }].map(opt => (
                        <button
                            type="button"
                            key={opt.value}
                            onClick={() => setWindowSize(opt.value)}
                            aria-label={`Filtrar janela ${opt.label}`}
                            aria-pressed={windowSize === opt.value}
                            className={`px-2.5 py-1.5 rounded-none text-[10px] font-extrabold tracking-wide transition-colors ${windowSize === opt.value ? 'bg-indigo-500/30 text-indigo-100 border border-indigo-400/40' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-1 bg-slate-950/75 border border-slate-700/80 rounded-none p-1.5 mr-2 shadow-sm">
                    {[{ label: 'Diário', value: 'daily' }, { label: 'Semanal', value: 'weekly' }, { label: 'Mensal', value: 'monthly' }].map(opt => (
                        <button
                            type="button"
                            key={opt.value}
                            onClick={() => setGranularity(opt.value)}
                            aria-label={`Selecionar granularidade ${opt.label}`}
                            aria-pressed={granularity === opt.value}
                            className={`px-2.5 py-1.5 rounded-none text-[10px] font-extrabold tracking-wide transition-colors ${granularity === opt.value ? 'bg-cyan-500/30 text-cyan-100 border border-cyan-400/40' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
                {[
                    { bg: 'rgba(239,68,68,0.3)', border: 'rgba(239,68,68,0.5)', label: `< ${Math.round(targetScore * 0.6)}${unit}` },
                    { bg: 'rgba(251,146,60,0.3)', border: 'rgba(251,146,60,0.5)', label: `${Math.round(targetScore * 0.6)}–${Math.round(targetScore * 0.8)}${unit}` },
                    { bg: 'rgba(251,191,36,0.3)', border: 'rgba(251,191,36,0.5)', label: `${Math.round(targetScore * 0.8)}–${targetScore}${unit}` },
                    { bg: 'rgba(34,197,94,0.3)', border: 'rgba(34,197,94,0.5)', label: `≥ ${targetScore}${unit} ✓ meta` },
                ].map(item => (
                    <span key={item.label} className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-none inline-block shrink-0" style={{ background: item.bg, border: `1px solid ${item.border}` }} />
                        {item.label}
                    </span>
                ))}
            </div>
            {granularity !== 'daily' && (
                <p className="text-[10px] text-cyan-200/90 font-bold uppercase tracking-wider mb-3.5">
                    Modo agregado ({granularity === 'weekly' ? 'semanal' : 'mensal'}): células representam múltiplos dias.
                </p>
            )}

            <div style={{ minWidth: `${filteredDates.length * 72 + 168}px` }}>
                <div style={{ display: 'grid', gridTemplateColumns: `168px repeat(${filteredDates.length}, 68px)`, gap: '4px' }} className="mb-3">
                    <div />
                    {filteredDates.map(d => (
                        <div key={d.key} className="flex flex-col items-center gap-1">
                            <span className={`text-[10px] font-black uppercase tracking-[0.15em] ${d.isWeekend ? 'text-purple-300' : 'text-slate-400'}`}>
                                {d.dayName}
                            </span>
                            <span className="text-[11px] font-mono font-bold text-slate-100">{d.label}</span>
                            {Number.isFinite(Number(d.count)) && Number(d.count) > 1 && (
                                <span className="text-[8px] text-slate-500">{d.count}d</span>
                            )}
                        </div>
                    ))}
                </div>

                <div className="space-y-2.5">
                    {filteredRows.map(({ cat, cells }, ri) => (
                        <div key={cat.id} style={{ display: 'grid', gridTemplateColumns: `168px repeat(${filteredDates.length}, 68px)`, gap: '4px', alignItems: 'center' }}>
                            <div className="flex items-center gap-2.5 pr-4 min-w-0">
                                <span className="text-lg shrink-0">{cat.icon}</span>
                                <span className="text-sm sm:text-[13px] font-extrabold truncate leading-tight" style={{ color: cat.color }} title={cat.name}>
                                    {cat.name}
                                </span>
                            </div>

                            {cells.map((cell, ci) => {
                                const col = cellColor(cell?.pct, cell?.total);
                                return (
                                    <div
                                        key={ci}
                                        className="relative group rounded-none flex flex-col items-center justify-center py-2.5 px-1 transition-all duration-200 hover:scale-[1.03] hover:z-20 cursor-default shadow-[0_6px_16px_rgba(2,6,23,0.22)] hover:shadow-[0_10px_24px_rgba(2,6,23,0.4)]"
                                        style={{
                                            background: col.bg,
                                            opacity: cell ? (0.85 + (col.density * 0.15)) : 1,
                                            border: `1px solid ${col.border}`,
                                            minHeight: '52px',
                                        }}
                                    >
                                        {cell ? (
                                            <>
                                                <span className="text-[13px] sm:text-[14px] font-black leading-none tabular-nums drop-shadow-[0_0_6px_rgba(15,23,42,0.65)]" style={{ color: col.text }}>
                                                    {formatPct(cell.pct)}
                                                </span>
                                                <span className="text-[9px] text-slate-300/80 font-mono mt-1">
                                                    {Math.round(cell.correct)}/{Math.round(cell.total)}
                                                </span>
                                            </>
                                        ) : (
                                            <span className="text-slate-500 text-[13px] font-bold">—</span>
                                        )}

                                        {cell && (
                                            <div className={`absolute ${ri === 0 ? 'top-full mt-2' : 'bottom-full mb-2'} z-50 hidden group-hover:flex flex-col items-center bg-slate-950 border border-slate-500 rounded-none p-4 min-w-[145px] shadow-[0_25px_60px_rgba(0,0,0,1)] whitespace-nowrap pointer-events-none text-center border-l-4 ${ci < 3 ? 'left-0' : ci > filteredDates.length - 4 ? 'right-0' : 'left-1/2 -translate-x-1/2'}`} style={{ borderLeftColor: col.text }}>
                                                <span className="text-[10px] text-slate-300 font-black uppercase tracking-[0.15em] mb-2.5 pb-2 border-b border-slate-800 w-full">
                                                    {filteredDates[ci].dayName} • {filteredDates[ci].label}
                                                </span>
                                                {Number.isFinite(Number(filteredDates[ci]?.count)) && Number(filteredDates[ci].count) > 1 && (
                                                    <span className="text-[9px] text-cyan-400 font-bold mb-2">
                                                        Janela: {filteredDates[ci].count} dias
                                                    </span>
                                                )}
                                                <div className="flex flex-col items-center justify-center py-2.5 px-4 rounded-none bg-slate-900 border border-slate-800 w-full mb-2.5">
                                                    <span className="text-[19px] font-black leading-none mb-1.5 drop-shadow-[0_0_8px_rgba(0,0,0,1)]" style={{ color: col.text }}>
                                                        {formatPct(cell.pct)}
                                                    </span>
                                                    <span className="text-[9px] text-slate-100 font-black uppercase tracking-widest">Desempenho</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-[11px] text-white font-mono">
                                                    <span className="font-black px-2 py-0.5 rounded-none bg-black" style={{ color: col.text }}>{Math.round(cell.correct)}</span>
                                                    <span className="text-slate-500 font-bold">/</span>
                                                    <span className="font-bold">{Math.round(cell.total)} <small className="text-[9px] text-slate-400">Q</small></span>
                                                </div>
                                                <div className="mt-2 text-[8px] text-slate-500 font-black uppercase tracking-tighter">
                                                    Densidade: {Math.round((col.density || 0) * 100)}%
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
