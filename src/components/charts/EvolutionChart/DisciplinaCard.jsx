import React from 'react';
import { formatValue } from '../../../utils/scoreHelper';
import { pointsToPct } from '../../../utils/scoreHelper.conversions';

export const DisciplinaCard = React.memo(function DisciplinaCard({ cat, level, metrics, target, isFocused, onClick, unit = '%', maxScore = 100, minScore = 0 }) {
    const safeMax = Math.max(1, Number(maxScore) || 100);   // ✅ LOTE-03
    const safeMin = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
    const safeRange = Math.max(1e-9, safeMax - safeMin);
    const val = level || 0;
    const ok = val >= target;
    const midThreshold = safeMin + (target - safeMin) * 0.75;
    const mid = val >= midThreshold;
    const statusColor = ok ? '#22c55e' : mid ? '#f59e0b' : '#ef4444';
    const progressWidth = Math.max(0, Math.min(100, pointsToPct(val, safeMax, safeMin)));

    const rawVal = metrics ? metrics[`raw_${cat.id}`] : null;
    const statsVal = metrics ? metrics[`stats_${cat.id}`] : null;
    const bayVal = metrics ? metrics[`bay_${cat.id}`] : null;

    return (
        <button onClick={onClick}
            aria-pressed={isFocused}
            aria-label={`Focar na disciplina ${cat.name}`}
            className={`relative text-left w-full rounded-3xl border p-4 sm:p-5 overflow-hidden transition-all duration-300 group min-h-[90px] sm:min-h-[115px] flex flex-col justify-between ${isFocused ? 'z-20 border-white/20 bg-slate-900/80 shadow-[0_8px_30px_rgb(0,0,0,0.12)]' : 'border-white/5 hover:border-white/10 hover:bg-slate-800/60 hover:-translate-y-1 backdrop-blur-sm'}`}
            style={{
                backgroundColor: isFocused ? `${cat.color}15` : 'rgba(15,23,42,0.4)',
                borderColor: isFocused ? `${cat.color}50` : undefined,
                boxShadow: isFocused ? `0 0 40px -10px ${cat.color}30` : undefined
            }}>

            {/* Fundo radiante no estado focado */}
            {isFocused && (
                <div className="absolute inset-0 opacity-20 bg-gradient-to-br from-transparent to-current mix-blend-overlay pointer-events-none" style={{ color: cat.color }} />
            )}

            {/* Progress Bar (Bottom) */}
            <div className="absolute inset-x-0 bottom-0 h-1.5 bg-slate-800/80 overflow-hidden">
                <div className="h-full transition-all duration-1000 ease-out relative" style={{ width: `${progressWidth}%`, backgroundColor: statusColor }}>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/30" />
                </div>
            </div>

            <div className="relative z-10 flex items-center justify-between mb-2 w-full pl-1">
                <p className={`text-[10px] sm:text-[11px] font-black uppercase tracking-widest transition-colors line-clamp-2 pr-2 drop-shadow-sm ${isFocused ? 'text-white' : 'text-slate-300 group-hover:text-slate-200'}`} title={cat.name}>
                    {cat.name}
                </p>
                <div className={`w-2.5 h-2.5 rounded-full transition-all shadow-sm ${isFocused ? 'scale-125 ring-2 ring-offset-2 ring-offset-slate-900' : 'opacity-80 group-hover:opacity-100'}`} style={{ backgroundColor: statusColor, '--tw-ring-color': statusColor }} />
            </div>

            <div className="relative z-10 flex flex-col justify-end w-full pl-1">
                <div className="flex items-baseline gap-1 mt-0.5">
                    <span className={`text-2xl sm:text-4xl font-black tracking-tighter transition-all drop-shadow-md ${isFocused ? 'text-white' : 'text-slate-100 group-hover:text-white'}`}>
                        {formatValue(val)}
                    </span>
                    <span className={`text-[10px] sm:text-xs font-bold ${isFocused ? 'text-white/70' : 'text-slate-500'}`}>{unit}</span>
                </div>
            </div>

            {/* Extra Metrics Breakdown */}
            <div className="relative z-10 w-full mt-4 pl-1">
                <div className="flex flex-col gap-2.5 pt-3 border-t border-white/10">
                    <div className="flex flex-col gap-1">
                        <div className="flex justify-between items-center text-[9px] text-slate-300 uppercase tracking-widest font-black">
                            <span>Bruta</span>
                            <span className="text-orange-400 font-mono">{rawVal != null && Number.isFinite(Number(rawVal)) ? formatValue(rawVal) : '—'}{unit}</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-950/50 rounded-full overflow-hidden border border-white/5">
                            <div className="h-full bg-orange-400 rounded-full" style={{ width: `${rawVal != null && Number.isFinite(Number(rawVal)) ? Math.min(100, Math.max(0, ((Number(rawVal) - safeMin) / safeRange) * 100)) : 0}%` }} />
                        </div>
                    </div>
                    <div className="flex flex-col gap-1">
                        <div className="flex justify-between items-center text-[9px] text-slate-300 uppercase tracking-widest font-black">
                            <span>Histórica</span>
                            <span className="text-blue-400 font-mono">{statsVal != null && Number.isFinite(Number(statsVal)) ? formatValue(statsVal) : '—'}{unit}</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-950/50 rounded-full overflow-hidden border border-white/5">
                            <div className="h-full bg-blue-400 rounded-full" style={{ width: `${statsVal != null && Number.isFinite(Number(statsVal)) ? Math.min(100, Math.max(0, ((Number(statsVal) - safeMin) / safeRange) * 100)) : 0}%` }} />
                        </div>
                    </div>
                    <div className="flex flex-col gap-1">
                        <div className="flex justify-between items-center text-[9px] text-slate-300 uppercase tracking-widest font-black">
                            <span>Real</span>
                            <span className="text-emerald-400 font-mono">{bayVal != null && Number.isFinite(Number(bayVal)) ? formatValue(bayVal) : '—'}{unit}</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-950/50 rounded-full overflow-hidden border border-white/5">
                            <div className="h-full bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.5)]" style={{ width: `${bayVal != null && Number.isFinite(Number(bayVal)) ? Math.min(100, Math.max(0, ((Number(bayVal) - safeMin) / safeRange) * 100)) : 0}%` }} />
                        </div>
                    </div>
                </div>
            </div>

        </button>

    );
});

