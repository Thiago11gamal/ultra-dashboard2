import React from 'react';

export function KpiCard({ value, label, color, icon, sub }) {
    return (
        <div className="relative flex flex-col justify-between rounded-2xl border border-slate-800/60 bg-slate-900/60 p-3 sm:p-5 group hover:border-slate-700 transition-all duration-300 hover:shadow-lg"
            style={{ '--glow': color }}>

            <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full blur-2xl opacity-10 group-hover:opacity-20 transition-opacity"
                    style={{ backgroundColor: color }} />
            </div>

            <div className="relative z-10 flex items-center justify-between mb-2 sm:mb-3">
                <span className="text-xl sm:text-2xl">{icon}</span>
                {sub != null && Number.isFinite(sub) && (
                    <span className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full ${sub === 0 ? 'bg-slate-500/10 text-slate-400' : sub > 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                        {sub === 0 ? '=' : sub > 0 ? `+${sub.toFixed(1)}` : sub.toFixed(1)}
                    </span>
                )}
            </div>
            <div className="relative z-10">
                <p className="text-xl sm:text-3xl font-black tracking-tight truncate break-words" style={{ color }}>{value}</p>
                <p className="text-[9px] sm:text-[11px] text-slate-500 mt-0.5 sm:mt-1.5 font-medium leading-normal block">{label}</p>
            </div>
        </div>
    );
}
