import React from 'react';

export function DisciplinaCard({ cat, level, target, isFocused, onClick }) {
    const pct = Math.min(100, level || 0);
    const ok = pct >= target;
    const mid = pct >= target * 0.75;
    const statusColor = ok ? '#22c55e' : mid ? '#eab308' : '#ef4444';
    
    return (
        <button onClick={onClick}
            className={`relative text-left w-full rounded-2xl border p-3 sm:p-5 transition-all duration-300 group min-h-[82px] sm:min-h-[100px] ${isFocused ? 'border-opacity-60 shadow-[0_0_20px_rgba(0,0,0,0.4)]' : 'border-slate-800/70 hover:border-slate-700 hover:shadow-md'}`}
            style={{ borderColor: isFocused ? `${cat.color}60` : undefined, backgroundColor: isFocused ? `${cat.color}08` : 'rgba(15,23,42,0.4)' }}>

            <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                <div className="absolute bottom-0 left-0 h-1 transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: statusColor, opacity: 0.7 }} />
            </div>

            <div className="relative z-10 flex items-center justify-between mb-1.5 sm:mb-3">
                <span className="text-base sm:text-lg leading-none">{cat.icon}</span>
                <div className="w-2 h-2 rounded-full shadow-[0_0_8px_var(--dot-glow)]"
                    style={{ backgroundColor: statusColor, '--dot-glow': statusColor }} />
            </div>
            <div className="relative z-10">
                <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wide break-words leading-[1.3] sm:leading-snug pb-0.5 sm:pb-1 line-clamp-2" title={cat.name}>{cat.name}</p>
                <p className="text-base sm:text-xl font-black leading-none pt-0.5 sm:pt-1" style={{ color: isFocused ? cat.color : '#f1f5f9' }}>
                    {pct.toFixed(1)}%
                </p>
            </div>
        </button>
    );
}
