import React, { useMemo, useState } from 'react';

export const EvolutionHeatmap = ({ heatmapData, targetScore = 70, unit = '%' }) => {
    const { dates = [], rows = [] } = heatmapData || {};
    const [windowSize, setWindowSize] = useState('all');

    const filtered = useMemo(() => {
        if (!Array.isArray(dates) || !Array.isArray(rows)) return { dates: [], rows: [] };
        const size = windowSize === 'all' ? dates.length : Number(windowSize);
        const safeSize = Number.isFinite(size) ? Math.max(1, size) : dates.length;
        const start = Math.max(0, dates.length - safeSize);

        return {
            dates: dates.slice(start),
            rows: rows.map((row) => ({
                ...row,
                cells: Array.isArray(row.cells) ? row.cells.slice(start) : []
            }))
        };
    }, [dates, rows, windowSize]);

    const cellColor = (pct, total = 0) => {
        if (pct == null) return { bg: 'rgba(255,255,255,0.02)', text: '#64748b', border: '#1e293b', density: 0 };
        if (pct >= targetScore) return { bg: 'rgba(34,197,94,0.2)', text: '#4ade80', border: 'rgba(34,197,94,0.4)', density: Math.min(1, (Number(total) || 0) / maxCellTotal) };
        if (pct >= targetScore * 0.8) return { bg: 'rgba(251,191,36,0.15)', text: '#fcd34d', border: 'rgba(251,191,36,0.4)', density: Math.min(1, (Number(total) || 0) / maxCellTotal) };
        if (pct >= targetScore * 0.6) return { bg: 'rgba(251,146,60,0.15)', text: '#fb923c', border: 'rgba(251,146,60,0.4)', density: Math.min(1, (Number(total) || 0) / maxCellTotal) };
        return { bg: 'rgba(239,68,68,0.15)', text: '#f87171', border: 'rgba(239,68,68,0.4)', density: Math.min(1, (Number(total) || 0) / maxCellTotal) };
    };

    const filteredDates = filtered.dates;
    const filteredRows = filtered.rows;

    const maxCellTotal = useMemo(() => {
        const totals = filteredRows
            .flatMap((row) => (Array.isArray(row?.cells) ? row.cells : []))
            .map((cell) => Number(cell?.total) || 0);
        return Math.max(1, ...totals);
    }, [filteredRows]);

    if (!filteredDates.length) return (
        <div className="h-48 flex items-center justify-center text-slate-500 text-sm">
            Nenhum dado encontrado.
        </div>
    );

    return (
        <div className="w-full overflow-x-auto overflow-y-visible custom-scrollbar pb-8 sm:pb-10">
            <div className="flex flex-wrap items-center gap-3 mb-4 text-[10px] text-slate-400">
                <div className="flex items-center gap-1 bg-slate-950/60 border border-slate-800 rounded-lg p-1 mr-2">
                    {[{ label: '4 sem', value: '28' }, { label: '8 sem', value: '56' }, { label: '12 sem', value: '84' }, { label: 'Tudo', value: 'all' }].map(opt => (
                        <button
                            type="button"
                            key={opt.value}
                            onClick={() => setWindowSize(opt.value)}
                            className={`px-2 py-1 rounded text-[9px] font-bold ${windowSize === opt.value ? 'bg-indigo-600/25 text-indigo-300' : 'text-slate-500 hover:text-slate-300'}`}
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
                        <span className="w-3 h-3 rounded-sm inline-block shrink-0" style={{ background: item.bg, border: `1px solid ${item.border}` }} />
                        {item.label}
                    </span>
                ))}
            </div>

            <div style={{ minWidth: `${filteredDates.length * 72 + 168}px` }}>
                <div style={{ display: 'grid', gridTemplateColumns: `168px repeat(${filteredDates.length}, 68px)`, gap: '4px' }} className="mb-2">
                    <div />
                    {filteredDates.map(d => (
                        <div key={d.key} className="flex flex-col items-center gap-0.5">
                            <span className={`text-[9px] font-black uppercase tracking-widest ${d.isWeekend ? 'text-purple-400' : 'text-slate-500'}`}>
                                {d.dayName}
                            </span>
                            <span className="text-[10px] font-mono font-bold text-slate-300">{d.label}</span>
                        </div>
                    ))}
                </div>

                <div className="space-y-2">
                    {filteredRows.map(({ cat, cells }, ri) => (
                        <div key={cat.id} style={{ display: 'grid', gridTemplateColumns: `168px repeat(${filteredDates.length}, 68px)`, gap: '4px', alignItems: 'center' }}>
                            <div className="flex items-center gap-2 pr-3 min-w-0">
                                <span className="text-lg shrink-0">{cat.icon}</span>
                                <span className="text-xs font-bold truncate" style={{ color: cat.color }} title={cat.name}>
                                    {cat.name}
                                </span>
                            </div>

                            {cells.map((cell, ci) => {
                                const col = cellColor(cell?.pct, cell?.total);
                                return (
                                    <div
                                        key={ci}
                                        className="relative group rounded-lg flex flex-col items-center justify-center py-2 transition-all hover:scale-105 hover:z-20 cursor-default"
                                        style={{
                                            background: col.bg,
                                            opacity: cell ? (0.45 + (col.density * 0.55)) : 1,
                                            border: `1px solid ${col.border}`,
                                            minHeight: '48px',
                                        }}
                                    >
                                        {cell ? (
                                            <>
                                                <span className="text-[12px] font-black leading-none" style={{ color: col.text }}>
                                                    {Number.isFinite(cell.pct) ? `${cell.pct.toFixed(2)}${unit}` : '—'}
                                                </span>
                                                <span className="text-[8px] text-slate-500 font-mono mt-0.5">
                                                    {cell.correct}/{cell.total}
                                                </span>
                                            </>
                                        ) : (
                                            <span className="text-slate-700 text-[11px]">—</span>
                                        )}

                                        {cell && (
                                            <div className={`absolute ${ri === 0 ? 'top-[80%] mt-2' : 'bottom-full mb-2'} z-50 hidden group-hover:flex flex-col items-center bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-2xl p-3 min-w-[120px] shadow-2xl whitespace-nowrap pointer-events-none text-center border-l-4 ${ci < 3 ? 'left-0' : ci > filteredDates.length - 4 ? 'right-0' : 'left-1/2 -translate-x-1/2'}`} style={{ borderLeftColor: col.text }}>
                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2 pb-1.5 border-b border-white/5 w-full">
                                                    {filteredDates[ci].dayName} • {filteredDates[ci].label}
                                                </span>
                                                <div className="flex flex-col items-center justify-center py-2 px-3 rounded-xl bg-white/5 w-full mb-2">
                                                    <span className="text-[16px] font-black leading-none mb-1" style={{ color: col.text }}>
                                                        {Number.isFinite(cell.pct) ? `${cell.pct.toFixed(2)}${unit}` : '—'}
                                                    </span>
                                                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">Desempenho</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                                                    <span className="font-bold" style={{ color: col.text }}>{cell.correct}</span>
                                                    <span className="text-slate-600">/</span>
                                                    <span>{cell.total} <small className="text-[8px] opacity-70">Q</small></span>
                                                    <span className="text-[8px] text-slate-500">densidade {Math.round((col.density || 0) * 100)}%</span>
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
