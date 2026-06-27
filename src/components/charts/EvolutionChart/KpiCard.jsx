import React from 'react';
import { formatValue } from '../../../utils/scoreHelper';

export const KpiCard = React.memo(function KpiCard({ value, label, color, icon, sub }) {
    return (
        <div className="flex flex-col justify-between rounded-2xl border border-slate-700/60 bg-slate-900/60 backdrop-blur-sm p-4 sm:p-5 group hover:border-slate-600 transition-all duration-300 overflow-hidden">
            <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800 text-xl sm:text-2xl">
                    {icon}
                </div>
                {sub != null && Number.isFinite(sub) && (
                    <span className={`text-[10px] sm:text-xs font-mono font-bold px-2 py-0.5 rounded-lg border ${sub === 0 ? 'bg-slate-800/50 text-slate-400 border-slate-700' : sub > 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'}`}>
                        {sub === 0 ? '—' : sub > 0 ? `+${formatValue(sub)}` : formatValue(sub)}
                    </span>
                )}
            </div>
            <div>
                <p className="text-2xl sm:text-4xl font-mono font-black tracking-tighter truncate" style={{ color }}>{value}</p>
                <p className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-[0.15em] mt-1 font-semibold">{label}</p>
            </div>
        </div>
    );
});
