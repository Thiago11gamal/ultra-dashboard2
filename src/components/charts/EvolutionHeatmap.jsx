import React from 'react';

export const EvolutionHeatmap = ({ heatmapData, targetScore }) => {
    const { dates, rows } = heatmapData;

    const cellColor = (pct) => {
        if (pct == null) return { bg: 'rgba(255,255,255,0.02)', text: '#64748b', border: '#1e293b' };
        if (pct >= targetScore) return { bg: 'rgba(34,197,94,0.2)', text: '#4ade80', border: 'rgba(34,197,94,0.4)' };
        if (pct >= targetScore * 0.8) return { bg: 'rgba(251,191,36,0.15)', text: '#fcd34d', border: 'rgba(251,191,36,0.4)' };
        if (pct >= targetScore * 0.6) return { bg: 'rgba(251,146,60,0.15)', text: '#fb923c', border: 'rgba(251,146,60,0.4)' };
        return { bg: 'rgba(239,68,68,0.15)', text: '#f87171', border: 'rgba(239,68,68,0.4)' };
    };

    if (!dates.length) return (
        <div className="h-48 flex items-center justify-center text-slate-500 text-sm">
            Nenhum dado encontrado.
        </div>
    );

    return (
        <div className="w-full overflow-x-auto custom-scrollbar pb-2">
            <div className="flex flex-wrap items-center gap-3 mb-4 text-[10px] text-slate-400">
                {[
                    { bg: 'rgba(239,68,68,0.3)', border: 'rgba(239,68,68,0.5)', label: `< ${Math.round(targetScore * 0.6)}%` },
                    { bg: 'rgba(251,146,60,0.3)', border: 'rgba(251,146,60,0.5)', label: `${Math.round(targetScore * 0.6)}–${Math.round(targetScore * 0.8)}%` },
                    { bg: 'rgba(251,191,36,0.3)', border: 'rgba(251,191,36,0.5)', label: `${Math.round(targetScore * 0.8)}–${targetScore}%` },
                    { bg: 'rgba(34,197,94,0.3)', border: 'rgba(34,197,94,0.5)', label: `≥ ${targetScore}% ✓ meta` },
                ].map(item => (
                    <span key={item.label} className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-sm inline-block shrink-0" style={{ background: item.bg, border: `1px solid ${item.border}` }} />
                        {item.label}
                    </span>
                ))}
            </div>

            <div style={{ minWidth: `${dates.length * 72 + 168}px` }}>
                <div style={{ display: 'grid', gridTemplateColumns: `168px repeat(${dates.length}, 68px)`, gap: '4px' }} className="mb-2">
                    <div />
                    {dates.map(d => (
                        <div key={d.key} className="flex flex-col items-center gap-0.5">
                            <span className={`text-[9px] font-black uppercase tracking-widest ${d.isWeekend ? 'text-purple-400' : 'text-slate-500'}`}>
                                {d.dayName}
                            </span>
                            <span className="text-[10px] font-mono font-bold text-slate-300">{d.label}</span>
                        </div>
                    ))}
                </div>

                <div className="space-y-2">
                    {rows.map(({ cat, cells }, ri) => (
                        <div key={cat.id} style={{ display: 'grid', gridTemplateColumns: `168px repeat(${dates.length}, 68px)`, gap: '4px', alignItems: 'center' }}>
                            <div className="flex items-center gap-2 pr-3 min-w-0">
                                <span className="text-lg shrink-0">{cat.icon}</span>
                                <span className="text-xs font-bold truncate" style={{ color: cat.color }} title={cat.name}>
                                    {cat.name}
                                </span>
                            </div>

                            {cells.map((cell, ci) => {
                                const col = cellColor(cell?.pct);
                                return (
                                    <div
                                        key={ci}
                                        className="relative group rounded-lg flex flex-col items-center justify-center py-2 transition-all hover:scale-105 hover:z-20 cursor-default"
                                        style={{
                                            background: col.bg,
                                            border: `1px solid ${col.border}`,
                                            minHeight: '48px',
                                        }}
                                    >
                                        {cell ? (
                                            <>
                                                <span className="text-[12px] font-black leading-none" style={{ color: col.text }}>
                                                    {Number.isFinite(cell.pct) ? `${cell.pct.toFixed(0)}%` : '—'}
                                                </span>
                                                <span className="text-[8px] text-slate-500 font-mono mt-0.5">
                                                    {cell.correct}/{cell.total}
                                                </span>
                                            </>
                                        ) : (
                                            <span className="text-slate-700 text-[11px]">—</span>
                                        )}

                                        {cell && (
                                            <div className={`absolute ${ri < 3 ? 'top-[80%] mt-2' : 'bottom-full mb-2'} z-50 hidden group-hover:flex flex-col items-center bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-2xl p-3 min-w-[120px] shadow-2xl whitespace-nowrap pointer-events-none text-center border-l-4 ${ci < 3 ? 'left-0' : ci > dates.length - 4 ? 'right-0' : 'left-1/2 -translate-x-1/2'}`} style={{ borderLeftColor: col.text }}>
                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2 pb-1.5 border-b border-white/5 w-full">
                                                    {dates[ci].dayName} • {dates[ci].label}
                                                </span>
                                                <div className="flex flex-col items-center justify-center py-2 px-3 rounded-xl bg-white/5 w-full mb-2">
                                                    <span className="text-[16px] font-black leading-none mb-1" style={{ color: col.text }}>
                                                        {Number.isFinite(cell.pct) ? `${cell.pct.toFixed(1)}%` : '—'}
                                                    </span>
                                                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">Desempenho</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                                                    <span className="font-bold" style={{ color: col.text }}>{cell.correct}</span>
                                                    <span className="text-slate-600">/</span>
                                                    <span>{cell.total} <small className="text-[8px] opacity-70">Q</small></span>
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
