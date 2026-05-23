import React from 'react';
import { CHART_COLORS } from '../../utils/chartConfig';
import { formatValue } from '../../utils/scoreHelper';

export const ChartTooltip = ({ active, payload, label, isCompare = false, chartData = [], unit = '%' }) => {
    if (!active || !payload?.length) return null;

    const currentData = chartData.find(d => d.displayDate === label || d.date === label);

    return (
        <div className="bg-slate-900/90 border border-white/10 p-4 rounded-xl shadow-2xl text-sm min-w-[280px] z-50 backdrop-blur-xl">
            <p className="text-slate-300 mb-3 font-bold border-b border-white/10 pb-2 flex items-center justify-between">
                <span>📅 {label}</span>
            </p>
            <div className="space-y-3">
                {payload
                    .filter(p => !p.name?.startsWith('_') && !['Bay CI High', 'Bay CI Low', 'Cenário Range', 'Banda Bayesiana', 'Ganho Estimado'].includes(p.name))
                    .sort((a, b) => (Number(b.value) || -Infinity) - (Number(a.value) || -Infinity))
                    .map((p, i) => {
                    if (isCompare) {
                        const val = Number(p.value);
                        return (
                            <div key={i} className="flex justify-between items-center gap-4">
                                <span style={{ color: p.color }} className="font-medium text-xs">
                                    {p.name}
                                </span>
                                <span style={{ color: p.color }} className="font-bold">
                                    {Number.isFinite(val) ? `${formatValue(val)}${unit}` : '—'}
                                </span>
                            </div>
                        );
                    }

                    const dataKey = p.dataKey;
                    if (typeof dataKey !== 'string') return null;

                    const catId = dataKey.replace(/^(raw|bay|bay_ci_low|bay_ci_high|stats|trend|trend_status)_/, '');
                    const subjName = p.name;

                    const rawCorrect = currentData ? currentData[`raw_correct_${catId}`] : null;
                    const rawTotal = currentData ? currentData[`raw_total_${catId}`] : null;
                    const rawVal = currentData ? currentData[`raw_${catId}`] : null;
                    const bayVal = currentData ? currentData[`bay_${catId}`] : null;
                    const statsVal = currentData ? currentData[`stats_${catId}`] : null;
                    const trendVal = currentData ? currentData[`trend_${catId}`] : null;
                    const trendStatus = currentData ? currentData[`trend_status_${catId}`] : 'stable';

                    return (
                        <div key={i} className="flex flex-col bg-slate-800/30 p-3 rounded-lg border border-white/5 shadow-inner">
                            <div className="flex justify-between items-center mb-3">
                                <span style={{ color: p.color }} className="font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.3)]" style={{ backgroundColor: p.color, boxShadow: `0 0 8px ${p.color}80` }} />
                                    {subjName}
                                </span>
                            </div>
                            <div className="grid grid-cols-4 gap-2 text-center">
                                <div className="flex flex-col bg-slate-900/40 p-1.5 rounded-md border border-white/5">
                                    <span className="text-[9px] text-slate-400 font-bold uppercase">Bruta</span>
                                    <span className="text-xs font-mono text-orange-400 font-bold">
                                        {rawVal != null && Number.isFinite(Number(rawVal)) ? formatValue(rawVal) : '—'}{unit}
                                    </span>
                                </div>
                                <div className="flex flex-col bg-slate-900/40 p-1.5 rounded-md border border-white/5">
                                    <span className="text-[9px] text-slate-400 font-bold uppercase">Histórica</span>
                                    <span className="text-xs font-mono text-blue-400 font-bold">
                                        {statsVal != null && Number.isFinite(Number(statsVal)) ? formatValue(statsVal) : '—'}{unit}
                                    </span>
                                </div>
                                <div className="flex flex-col bg-slate-900/40 p-1.5 rounded-md border border-white/5">
                                    <span className="text-[9px] text-slate-400 font-bold uppercase">Nível Real</span>
                                    <span className="text-xs font-mono text-emerald-400 font-bold">
                                        {bayVal != null && Number.isFinite(Number(bayVal)) ? formatValue(bayVal) : '—'}{unit}
                                    </span>
                                </div>
                                <div className="flex flex-col bg-slate-900/40 p-1.5 rounded-md border border-white/5">
                                    <span className="text-[9px] text-slate-400 font-bold uppercase">Tendência</span>
                                    <span className={`text-xs font-mono font-bold flex items-center justify-center gap-0.5 ${trendStatus === 'up' ? 'text-emerald-400' : trendStatus === 'down' ? 'text-rose-400' : 'text-slate-400'}`}>
                                        {trendVal != null && Number.isFinite(Number(trendVal)) ? (
                                            <>
                                                {trendVal > 0 ? '↑' : trendVal < 0 ? '↓' : ''}
                                                <span>{trendVal > 0 ? `+${formatValue(trendVal)}` : formatValue(trendVal)}</span>
                                            </>
                                        ) : '—'}
                                    </span>
                                </div>
                            </div>
                            {rawTotal > 0 && (() => {
                                const errs = rawTotal - rawCorrect;
                                const errPct = Math.round((errs / rawTotal) * 100);
                                const correctPct = 100 - errPct;
                                return (
                                    <div className="mt-3 flex flex-col gap-1.5 px-1">
                                        <div className="text-[10px] text-slate-400 flex justify-between items-center">
                                            <span>Último Simulado:</span>
                                            <span>
                                                <strong className="text-rose-400">{errs} erros</strong> ({errPct}%)
                                            </span>
                                        </div>
                                        <div className="w-full h-1.5 bg-slate-700/50 rounded-full overflow-hidden flex shadow-inner">
                                            <div className="h-full bg-emerald-500/80 transition-all duration-500" style={{ width: `${correctPct}%` }}></div>
                                            <div className="h-full bg-rose-500/80 transition-all duration-500" style={{ width: `${errPct}%` }}></div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
