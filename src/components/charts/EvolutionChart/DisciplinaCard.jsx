import React from 'react';
import { formatValue } from '../../../utils/scoreHelper';

export function DisciplinaCard({ cat, level, metrics, target, isFocused, onClick, unit = '%', maxScore = 100 }) {
    const val = level || 0;
    const ok = val >= target;
    const mid = val >= target * 0.75;
    const statusColor = ok ? '#22c55e' : mid ? '#f59e0b' : '#ef4444';

    const rawVal = metrics ? metrics[`raw_${cat.id}`] : null;
    const statsVal = metrics ? metrics[`stats_${cat.id}`] : null;
    const bayVal = metrics ? metrics[`bay_${cat.id}`] : null;

    return (
        <button onClick={onClick}
            className={`relative text-left w-full rounded-none border p-3 sm:p-4 transition-all duration-500 group min-h-[82px] sm:min-h-[105px] overflow-hidden flex flex-col justify-between ${isFocused ? 'shadow-[0_0_30px_-5px_rgba(0,0,0,0.6)] z-20 border-transparent bg-white/[0.03]' : 'border-slate-800/40 hover:border-slate-700/60 hover:bg-slate-800/30 active:scale-95'}`}
            style={{
                backgroundColor: isFocused ? `${cat.color}35` : 'rgba(15,23,42,0.4)',
            }}>

            {/* Neon Border Glow (Focused State) */}
            {isFocused && (
                <div className="absolute inset-0 rounded-none pointer-events-none" style={{
                    border: `2px solid ${cat.color}`,
                    boxShadow: `inset 0 0 15px ${cat.color}40, 0 0 15px ${cat.color}60`,
                    filter: 'brightness(1.2)'
                }} />
            )}

            {/* Tech Corner Accent */}
            {isFocused && (
                <div className="absolute top-0 right-0 w-8 h-8 pointer-events-none opacity-60" style={{
                    background: `linear-gradient(45deg, transparent 50%, ${cat.color} 50%)`,
                    clipPath: 'polygon(100% 0, 100% 100%, 0 0)'
                }} />
            )}

            {/* Background Glow */}
            <div className={`absolute -top-10 -right-10 w-24 h-24 blur-[40px] rounded-full pointer-events-none transition-opacity duration-700 ${isFocused ? 'opacity-40 animate-pulse' : 'opacity-0'}`}
                style={{ backgroundColor: cat.color }} />

            {/* Progress Bar (Bottom) */}
            <div className="absolute inset-x-0 bottom-0 h-1 bg-slate-800/50 overflow-hidden">
                <div className="h-full transition-all duration-1000 ease-out"
                    style={{
                        width: `${(val / maxScore) * 100}%`,
                        backgroundColor: statusColor,
                        boxShadow: `0 0 10px ${statusColor}80`
                    }} />
            </div>

            {/* Glass Reflection Effect */}
            {isFocused && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-none">
                    <div className="absolute top-[-100%] left-[-100%] w-[300%] h-[300%] bg-gradient-to-br from-white/10 via-transparent to-transparent rotate-12 transition-transform duration-1000" />
                </div>
            )}

            <div className="relative z-10 flex items-center justify-end mb-2 w-full">
                <div className={`w-2.5 h-2.5 rounded-none transition-all duration-500 ${isFocused ? 'scale-125' : ''}`}
                    style={{
                        backgroundColor: statusColor,
                        boxShadow: `0 0 12px ${statusColor}`
                    }} />
            </div>

            <div className="relative z-10 flex flex-col justify-end w-full">
                <p className={`text-[9px] sm:text-[10px] font-black uppercase tracking-[0.1em] transition-colors duration-300 line-clamp-1 ${isFocused ? 'text-white' : 'text-slate-500'}`} title={cat.name}>
                    {cat.name}
                </p>
                <div className="flex items-baseline gap-1 mt-0.5">
                    <span className={`text-base sm:text-2xl font-black tracking-normal transition-all duration-500 ${isFocused ? 'text-white scale-105' : 'text-slate-200'}`}>
                        {formatValue(val)}
                    </span>
                    <span className={`text-[8px] sm:text-[10px] font-bold ${isFocused ? 'opacity-100 text-white' : 'opacity-40'}`}>{unit}</span>
                </div>
            </div>

            {/* Extra Metrics Breakdown */}
            <div className="relative z-10 w-full mt-3">
                <div className="flex flex-col gap-2 pt-3 border-t border-slate-700/50">
                    <div className="flex flex-col gap-0.5">
                        <div className="flex justify-between items-center text-[8px] text-slate-300 uppercase tracking-widest font-black">
                            <span>Bruta</span>
                            <span className="text-orange-400 font-mono">{rawVal != null && Number.isFinite(Number(rawVal)) ? formatValue(rawVal) : '—'}{unit}</span>
                        </div>
                        <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-orange-400" style={{ width: `${rawVal != null && Number.isFinite(Number(rawVal)) ? Math.min(100, Math.max(0, rawVal)) : 0}%` }} />
                        </div>
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <div className="flex justify-between items-center text-[8px] text-slate-300 uppercase tracking-widest font-black">
                            <span>Histórica</span>
                            <span className="text-blue-400 font-mono">{statsVal != null && Number.isFinite(Number(statsVal)) ? formatValue(statsVal) : '—'}{unit}</span>
                        </div>
                        <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-400" style={{ width: `${statsVal != null && Number.isFinite(Number(statsVal)) ? Math.min(100, Math.max(0, statsVal)) : 0}%` }} />
                        </div>
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <div className="flex justify-between items-center text-[8px] text-slate-300 uppercase tracking-widest font-black">
                            <span>Real</span>
                            <span className="text-emerald-400 font-mono">{bayVal != null && Number.isFinite(Number(bayVal)) ? formatValue(bayVal) : '—'}{unit}</span>
                        </div>
                        <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-400" style={{ width: `${bayVal != null && Number.isFinite(Number(bayVal)) ? Math.min(100, Math.max(0, bayVal)) : 0}%` }} />
                        </div>
                    </div>
                </div>
            </div>

        </button>

    );
}
