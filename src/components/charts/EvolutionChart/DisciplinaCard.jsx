import React from 'react';

export function DisciplinaCard({ cat, level, target, isFocused, onClick }) {
    const pct = Math.min(100, level || 0);
    const ok = pct >= target;
    const mid = pct >= target * 0.75;
    const statusColor = ok ? '#22c55e' : mid ? '#f59e0b' : '#ef4444';
    
    return (
        <button onClick={onClick}
            className={`relative text-left w-full rounded-2xl border p-3 sm:p-4 transition-all duration-500 group min-h-[82px] sm:min-h-[105px] overflow-hidden ${isFocused ? 'ring-2 ring-offset-2 ring-offset-slate-950 shadow-2xl scale-[1.02] z-20' : 'border-slate-800/40 hover:border-slate-700/60 hover:bg-slate-800/30 active:scale-95'}`}
            style={{ 
                borderColor: isFocused ? `${cat.color}80` : undefined, 
                backgroundColor: isFocused ? `${cat.color}15` : 'rgba(15,23,42,0.4)',
                ringColor: isFocused ? `${cat.color}40` : 'transparent'
            }}>

            {/* Background Glow when focused */}
            {isFocused && (
                <div className="absolute -top-10 -right-10 w-24 h-24 blur-[40px] rounded-full pointer-events-none opacity-40 animate-pulse" 
                     style={{ backgroundColor: cat.color }} />
            )}

            {/* Progress Bar (Bottom) */}
            <div className="absolute inset-x-0 bottom-0 h-1 bg-slate-800/50 overflow-hidden">
                <div className="h-full transition-all duration-1000 ease-out"
                    style={{ 
                        width: `${pct}%`, 
                        backgroundColor: statusColor,
                        boxShadow: `0 0 10px ${statusColor}80` 
                    }} />
            </div>

            <div className="relative z-10 flex items-center justify-between mb-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg transition-transform duration-500 group-hover:scale-110 ${isFocused ? 'bg-white/10 shadow-lg' : 'bg-slate-800/50'}`}>
                    {cat.icon}
                </div>
                <div className={`w-2 h-2 rounded-full transition-all duration-500 ${isFocused ? 'scale-125' : ''}`}
                    style={{ 
                        backgroundColor: statusColor, 
                        boxShadow: `0 0 12px ${statusColor}` 
                    }} />
            </div>

            <div className="relative z-10 flex flex-col justify-end">
                <p className={`text-[9px] sm:text-[10px] font-black uppercase tracking-[0.1em] transition-colors duration-300 line-clamp-1 ${isFocused ? 'text-white' : 'text-slate-500'}`} title={cat.name}>
                    {cat.name}
                </p>
                <div className="flex items-baseline gap-1 mt-0.5">
                    <span className={`text-lg sm:text-xl font-black tracking-tighter transition-colors duration-500 ${isFocused ? 'text-white' : 'text-slate-200'}`}>
                        {pct.toFixed(1)}
                    </span>
                    <span className={`text-[10px] font-bold ${isFocused ? 'opacity-80' : 'opacity-40'}`}>%</span>
                </div>
            </div>
        </button>
    );
}
