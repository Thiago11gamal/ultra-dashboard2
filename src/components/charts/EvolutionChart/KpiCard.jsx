import React from 'react';
import { formatValue } from '../../../utils/scoreHelper';

export const KpiCard = React.memo(function KpiCard({ value, label, color, icon, sub }) {
    const rawSub = sub != null ? Number(sub) : Number.NaN;
    const safeSub = Number.isFinite(rawSub) ? Number(rawSub.toFixed(2)) : Number.NaN;
    return (
        <div 
            className="relative flex flex-col justify-between rounded-2xl border border-white/5 bg-slate-900/40 backdrop-blur-xl group hover:border-white/10 hover:bg-slate-800/60 hover:-translate-y-0.5 transition-all duration-300 overflow-hidden"
            style={{ padding: '0.75rem 0.875rem', boxShadow: `0 4px 20px -10px ${color}30` }}
        >
            <div className="absolute top-0 right-0 -mt-6 -mr-6 w-20 h-20 rounded-full opacity-20 blur-2xl group-hover:opacity-35 transition-opacity duration-500 pointer-events-none" style={{ backgroundColor: color }} />
            
            <div className="relative z-10 flex items-center justify-between mb-1.5">
                <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/[0.04] border border-white/5 text-sm sm:text-base group-hover:scale-105 transition-transform duration-300 shrink-0" style={{ color }}>
                    {icon}
                </div>
                {Number.isFinite(safeSub) && (
                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md border ${safeSub === 0 ? 'bg-slate-800/50 text-slate-400 border-slate-700' : safeSub > 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'}`}>
                        {safeSub === 0 ? '—' : safeSub > 0 ? `+${formatValue(safeSub)}` : formatValue(safeSub)}
                    </span>
                )}
            </div>
            <div className="relative z-10 min-w-0">
                <p className="text-lg sm:text-xl md:text-2xl font-black tracking-tight min-w-0 truncate drop-shadow-md leading-tight" style={{ color }}>{value}</p>
                <p className="text-[9px] sm:text-[10px] text-slate-400 uppercase tracking-wider mt-0.5 font-bold group-hover:text-slate-300 transition-colors truncate">{label}</p>
            </div>
        </div>
    );
});

