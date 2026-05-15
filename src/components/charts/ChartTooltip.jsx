import React from 'react';
import { CHART_COLORS } from '../../utils/chartConfig';
import { formatValue } from '../../utils/scoreHelper';

export const ChartTooltip = ({ active, payload, label, isCompare = false, chartData = [], unit = '%' }) => {
    if (!active || !payload?.length) return null;

    const currentData = chartData.find(d => d.displayDate === label || d.date === label);

    return (
        <div className="bg-slate-900/95 border border-slate-700 p-4 rounded-none shadow-2xl text-sm min-w-[280px] z-50 backdrop-blur-md">
            <p className="text-slate-300 mb-3 font-bold border-b border-slate-700/80 pb-2 flex items-center justify-between">
                <span>📅 {label}</span>
            </p>
            <div className="space-y-3">
                {payload.filter(p => !p.name?.startsWith('_') && !['Bay CI High', 'Bay CI Low', 'Cenário Range', 'Banda Bayesiana', 'Ganho Estimado'].includes(p.name)).map((p, i) => {
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
                        <div key={i} className="flex flex-col bg-slate-800/40 p-3 rounded-none border border-slate-700/50">
                            <div className="flex justify-between items-center mb-2">
                                <span style={{ color: p.color }} className="font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                                    {subjName}
                                </span>
                            </div>
                            <div className="grid grid-cols-4 gap-2 text-center">
                                <div className="flex flex-col bg-slate-900/50 p-1.5 rounded-none border border-slate-700/30">
                                    <span className="text-[9px] text-slate-500 font-bold uppercase">Bruta</span>
                                    <span className="text-xs font-mono text-orange-400 font-bold">
                                        {rawVal != null && Number.isFinite(Number(rawVal)) ? formatValue(rawVal) : '—'}{unit}
                                    </span>
                                </div>
                                <div className="flex flex-col bg-slate-900/50 p-1.5 rounded-none border border-slate-700/30">
                                    <span className="text-[9px] text-slate-500 font-bold uppercase">Histórica</span>
                                    <span className="text-xs font-mono text-blue-400 font-bold">
                                        {statsVal != null && Number.isFinite(Number(statsVal)) ? formatValue(statsVal) : '—'}{unit}
                                    </span>
                                </div>
                                <div className="flex flex-col bg-slate-900/50 p-1.5 rounded-none border border-slate-700/30">
                                    <span className="text-[9px] text-slate-500 font-bold uppercase">Nível Real</span>
                                    <span className="text-xs font-mono text-emerald-400 font-bold">
                                        {bayVal != null && Number.isFinite(Number(bayVal)) ? formatValue(bayVal) : '—'}{unit}
                                    </span>
                                </div>
                                <div className="flex flex-col bg-slate-900/50 p-1.5 rounded-none border border-slate-700/30">
                                    <span className="text-[9px] text-slate-500 font-bold uppercase">Tendência</span>
                                    <span className={`text-xs font-mono font-bold ${trendStatus === 'up' ? 'text-green-400' : trendStatus === 'down' ? 'text-red-400' : 'text-slate-400'}`}>
                                        {trendVal != null && Number.isFinite(Number(trendVal)) ? (trendVal > 0 ? `+${formatValue(trendVal)}` : formatValue(trendVal)) : '—'}
                                    </span>
                                </div>
                            </div>
                            {rawTotal > 0 && (() => {
                                const errs = rawTotal - rawCorrect;
                                const errPct = Math.round((errs / rawTotal) * 100);
                                return (
                                    <div className="text-[9px] text-slate-400 text-right mt-2 flex justify-between items-center px-1">
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
    );
};
