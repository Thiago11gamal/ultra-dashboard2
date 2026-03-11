import React from 'react';
import { createPortal } from 'react-dom';
import { CHART_COLORS } from '../../utils/chartConfig';

export const ChartTooltip = ({ active, payload, label, isCompare = false, chartData = [] }) => {
    if (!active || !payload?.length) return null;

    const currentData = chartData.find(d => d.displayDate === label);
    const target = document.getElementById('evolution-chart-header');

    const content = (
        <div className="absolute bottom-[calc(100%+0.5rem)] left-0 w-full px-1 z-50 pointer-events-none flex justify-center">
            <div className="w-max max-w-full bg-slate-900/98 backdrop-blur-xl border border-slate-700 p-1.5 sm:p-2 rounded-xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)] pointer-events-auto">
                <p className="text-slate-200 mb-1 font-bold border-b border-slate-700/80 pb-0.5 flex items-center justify-between px-1 gap-10">
                    <span className="text-xs">📅 {label}</span>
                    <span className="text-[10px] text-indigo-400/80 font-normal">Análise do Simulado</span>
                </p>
                <div className={isCompare ? "flex flex-wrap gap-1.5 min-w-[280px]" : "grid grid-cols-2 md:grid-cols-4 gap-1.5"}>
                {payload.filter(p => !p.name?.startsWith('_') && !['Bay CI High', 'Bay CI Low', 'Cenário Range', 'Banda Bayesiana'].includes(p.name)).map((p, i) => {
                    if (isCompare) {
                        const val = Number(p.value);
                        return (
                            <div key={i} className="flex justify-between items-center gap-4 bg-slate-800/40 px-2 py-1 rounded">
                                <span style={{ color: p.color }} className="font-medium text-xs">
                                    {p.name}
                                </span>
                                <span style={{ color: p.color }} className="font-bold">
                                    {Number.isFinite(val) ? `${val.toFixed(1)}%` : '—'}
                                </span>
                            </div>
                        );
                    }

                    const subjName = p.name;
                    const rawCorrect = currentData ? currentData[`raw_correct_${subjName}`] : null;
                    const rawTotal = currentData ? currentData[`raw_total_${subjName}`] : null;
                    const rawVal = currentData ? currentData[`raw_${subjName}`] : null;
                    const bayVal = currentData ? currentData[`bay_${subjName}`] : null;
                    const statsVal = currentData ? currentData[`stats_${subjName}`] : null;
                    const trendVal = currentData ? currentData[`trend_${subjName}`] : null;
                    const trendStatus = currentData ? currentData[`trend_status_${subjName}`] : 'stable';

                    return (
                        <div key={i} className="flex flex-col bg-slate-800/40 p-1 rounded-lg border border-slate-700/50">
                            <div className="flex justify-between items-center mb-0.5">
                                <span style={{ color: p.color }} className="font-bold text-[10px] sm:text-xs uppercase tracking-wider flex items-center gap-1 line-clamp-1 truncate">
                                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                                    {subjName}
                                </span>
                            </div>
                            <div className="grid grid-cols-4 gap-0.5 text-center">
                                <div className="flex flex-col bg-slate-900/50 pt-0.5 pb-0.5 rounded border border-slate-700/30">
                                    <span className="text-[7px] text-slate-500 font-bold uppercase leading-none">Bruta</span>
                                    <span className="text-[11px] sm:text-xs font-mono text-orange-400 font-bold leading-none mt-1">
                                        {rawVal != null && Number.isFinite(Number(rawVal)) ? Number(rawVal).toFixed(1) : '—'}
                                    </span>
                                </div>
                                <div className="flex flex-col bg-slate-900/50 pt-0.5 pb-0.5 rounded border border-slate-700/30">
                                    <span className="text-[7px] text-slate-500 font-bold uppercase leading-none">Hist</span>
                                    <span className="text-[11px] sm:text-xs font-mono text-blue-400 font-bold leading-none mt-1">
                                        {statsVal != null && Number.isFinite(Number(statsVal)) ? Number(statsVal).toFixed(1) : '—'}
                                    </span>
                                </div>
                                <div className="flex flex-col bg-slate-900/50 pt-0.5 pb-0.5 rounded border border-slate-700/30">
                                    <span className="text-[7px] text-slate-500 font-bold uppercase leading-none">Real</span>
                                    <span className="text-[11px] sm:text-xs font-mono text-emerald-400 font-bold leading-none mt-1">
                                        {bayVal != null && Number.isFinite(Number(bayVal)) ? Number(bayVal).toFixed(1) : '—'}
                                    </span>
                                </div>
                                <div className="flex flex-col bg-slate-900/50 pt-0.5 pb-0.5 rounded border border-slate-700/30">
                                    <span className="text-[7px] text-slate-500 font-bold uppercase leading-none">Tend</span>
                                    <span className={`text-[11px] sm:text-xs font-mono font-bold leading-none mt-1 ${trendStatus === 'up' ? 'text-green-400' : trendStatus === 'down' ? 'text-red-400' : 'text-slate-400'}`}>
                                        {trendVal != null && Number.isFinite(Number(trendVal)) ? (trendVal > 0 ? `+${trendVal.toFixed(1)}` : trendVal.toFixed(1)) : '—'}
                                    </span>
                                </div>
                            </div>
                            {rawTotal > 0 && (() => {
                                const errs = rawTotal - rawCorrect;
                                const errPct = Math.round((errs / rawTotal) * 100);
                                return (
                                    <div className="text-[7px] text-slate-400 text-right mt-0.5 flex justify-between items-center px-0.5 leading-none">
                                        <span>Último Simulado:</span>
                                        <span>
                                            <strong className="text-red-400">{errs} erros</strong> ({errPct}%)
                                        </span>
                                    </div>
                                );
                            })()}
                        </div>
                    );
                })}
            </div>
            </div>
        </div>
    );

    if (target) {
        return createPortal(content, target);
    }
    return content;
};
