import React from 'react';
import { formatValue } from '../../../utils/scoreHelper';

export const KpiCard = React.memo(function KpiCard({ value, label, color, icon, sub }) {
    const rawSub = sub != null ? Number(sub) : Number.NaN;
    const safeSub = Number.isFinite(rawSub) ? Number(rawSub.toFixed(2)) : Number.NaN;
    return (
        <div 
            className="relative flex flex-col justify-between rounded-3xl border border-white/5 bg-slate-900/40 backdrop-blur-xl p-5 sm:p-6 group hover:border-white/10 hover:bg-slate-800/60 hover:-translate-y-1 transition-all duration-300 overflow-hidden"
            style={{ boxShadow: `0 8px 30px -15px ${color}30` }}
        >
            <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 rounded-full opacity-20 blur-3xl group-hover:opacity-40 transition-opacity duration-500 pointer-events-none" style={{ backgroundColor: color }} />
            
            <div className="relative z-10 flex items-center justify-between mb-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/5 text-2xl group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300" style={{ color }}>
                    {icon}
                </div>
                {Number.isFinite(safeSub) && (
                    <span className={`text-[10px] sm:text-xs font-mono font-bold px-2.5 py-1 rounded-xl border ${safeSub === 0 ? 'bg-slate-800/50 text-slate-400 border-slate-700' : safeSub > 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'}`}>
                        {safeSub === 0 ? '—' : safeSub > 0 ? `+${formatValue(safeSub)}` : formatValue(safeSub)}
                    </span>
                )}
            </div>
            <div className="relative z-10">
                <p className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight min-w-0 truncate drop-shadow-md leading-none pb-1" style={{ color }}>{value}</p>
                <p className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-widest mt-1.5 font-bold group-hover:text-slate-300 transition-colors">{label}</p>
            </div>
        </div>
    );
});

