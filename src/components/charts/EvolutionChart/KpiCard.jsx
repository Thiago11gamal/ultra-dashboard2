import React from 'react';
import { formatValue } from '../../../utils/scoreHelper';

export function KpiCard({ value, label, color, icon, sub }) {
    return (
        <div className="relative flex flex-col justify-between rounded-xl border border-slate-700/50 bg-slate-900/40 backdrop-blur-sm p-4 sm:p-5 group hover:border-slate-600/80 hover:bg-slate-800/50 transition-all duration-500 overflow-hidden"
            style={{ '--glow': color }}>

            {/* Glowing orb behind the card */}
            <div className="absolute -inset-4 z-0 opacity-0 group-hover:opacity-20 transition-opacity duration-700 blur-2xl rounded-full"
                style={{ background: `radial-gradient(circle, ${color} 0%, transparent 70%)` }} />

            <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full blur-2xl opacity-10 group-hover:opacity-30 transition-opacity duration-500"
                style={{ backgroundColor: color }} />

            <div className="relative z-10 flex items-center justify-between mb-2 sm:mb-3">
                <div className="p-2 rounded-lg bg-slate-950/50 shadow-inner border border-slate-800/60 text-xl sm:text-2xl group-hover:scale-110 transition-transform duration-300">
                    {icon}
                </div>
                {sub != null && Number.isFinite(sub) && (
                    <span className={`text-[10px] sm:text-xs font-mono font-bold px-2.5 py-1 rounded-md shadow-sm border ${sub === 0 ? 'bg-slate-800/40 text-slate-400 border-slate-700' : sub > 0 ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800/50' : 'bg-rose-900/30 text-rose-400 border-rose-800/50'}`}>
                        {sub === 0 ? '=' : sub > 0 ? `+${formatValue(sub)}` : formatValue(sub)}
                    </span>
                )}
            </div>
            <div className="relative z-10 mt-1">
                <p className="text-2xl sm:text-4xl font-mono font-black tracking-tight truncate break-words group-hover:translate-x-1 transition-transform duration-300" style={{ color, textShadow: `0 0 15px ${color}40` }}>{value}</p>
                <p className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-widest mt-1 font-bold block group-hover:text-slate-300 transition-colors duration-300">{label}</p>
            </div>
        </div>
    );
}
