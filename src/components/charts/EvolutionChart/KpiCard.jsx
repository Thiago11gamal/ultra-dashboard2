import React from 'react';
import { formatValue } from '../../../utils/scoreHelper';

export const KpiCard = React.memo(function KpiCard({ value, label, color, icon, sub }) {
    const rawSub = sub != null ? Number(sub) : Number.NaN;
    const safeSub = Number.isFinite(rawSub) ? Number(rawSub.toFixed(2)) : Number.NaN;
    return (
        <div className="flex flex-col justify-between rounded-2xl border border-slate-700/60 bg-slate-900/60 backdrop-blur-sm p-4 sm:p-5 group hover:border-slate-600 transition-all duration-300">
            <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800 text-xl sm:text-2xl">
                    {icon}
                </div>
                {Number.isFinite(safeSub) && (
                    <span className={`text-[10px] sm:text-xs font-mono font-bold px-2 py-0.5 rounded-lg border ${safeSub === 0 ? 'bg-slate-800/50 text-slate-400 border-slate-700' : safeSub > 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'}`}>
                        {safeSub === 0 ? '—' : safeSub > 0 ? `+${formatValue(safeSub)}` : formatValue(safeSub)}
                    </span>
                )}
            </div>
            <div>
                <p className="text-xl sm:text-3xl md:text-4xl font-mono font-black tracking-tighter min-w-0 break-all" style={{ color }}>{value}</p>
                <p className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-[0.15em] mt-1 font-semibold">{label}</p>
            </div>
        </div>
    );
});

