import React from 'react';
import { CHART_COLORS } from '../../utils/chartConfig';

export const ChartTooltip = ({ active, payload, label, isCompare = false, chartData = [] }) => {
    if (!active || !payload?.length) return null;

    const currentData = chartData.find(d => d.displayDate === label);

    return (
        <div className="bg-slate-900/95 border border-slate-700 p-4 rounded-xl shadow-2xl text-sm min-w-[280px] z-50 backdrop-blur-md">
            <p className="text-slate-300 mb-3 font-bold border-b border-slate-700/80 pb-2 flex items-center justify-between">
                <span>📅 {label}</span>
                {currentData?.weekLabel && (
                    <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">
                        {currentData.weekLabel}
                    </span>
                )}
            </p>
            <div className="space-y-3">
                {payload.map((p, i) => {
                    if (isCompare) {
                        return (
                            <div key={i} className="flex justify-between items-center gap-4">
                                <span style={{ color: p.color }} className="font-medium text-xs">
                                    {p.name}
                                </span>
                                <span style={{ color: p.color }} className="font-bold">
                                    {Number(p.value).toFixed(1)}%
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

                    return (
                        <div key={i} className="flex flex-col bg-slate-800/40 p-3 rounded-xl border border-slate-700/50">
                            <div className="flex justify-between items-center mb-2">
                                <span style={{ color: p.color }} className="font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                                    {subjName}
                                </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div className="flex flex-col bg-slate-900/50 p-1.5 rounded-lg border border-slate-700/30">
                                    <span className="text-[9px] text-slate-500 font-bold uppercase">Bruta</span>
                                    <span className="text-xs font-mono text-orange-400 font-bold">
                                        {rawVal ? rawVal.toFixed(1) : 0}%
                                    </span>
                                </div>
                                <div className="flex flex-col bg-slate-900/50 p-1.5 rounded-lg border border-slate-700/30">
                                    <span className="text-[9px] text-slate-500 font-bold uppercase">Histórica</span>
                                    <span className="text-xs font-mono text-blue-400 font-bold">
                                        {statsVal ? statsVal.toFixed(1) : 0}%
                                    </span>
                                </div>
                                <div className="flex flex-col bg-slate-900/50 p-1.5 rounded-lg border border-slate-700/30">
                                    <span className="text-[9px] text-slate-500 font-bold uppercase">Nível Real</span>
                                    <span className="text-xs font-mono text-emerald-400 font-bold">
                                        {bayVal ? bayVal.toFixed(1) : 0}%
                                    </span>
                                </div>
                            </div>
                            {rawTotal && (
                                <div className="text-[9px] text-slate-400 text-right mt-2 flex justify-between items-center px-1">
                                    <span>Último Simulado:</span>
                                    <span>
                                        <strong className="text-slate-200">{rawCorrect}</strong> / {rawTotal} questões
                                    </span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
