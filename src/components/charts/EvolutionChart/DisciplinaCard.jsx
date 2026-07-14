import React from 'react';
import { formatValue } from '../../../utils/scoreHelper';

export const DisciplinaCard = React.memo(function DisciplinaCard({ cat, level, metrics, target, isFocused, onClick, unit = '%', maxScore = 100 }) {
    const val = level || 0;
    const ok = val >= target;
    const mid = val >= target * 0.75;
    const statusColor = ok ? '#22c55e' : mid ? '#f59e0b' : '#ef4444';

    const rawVal = metrics ? metrics[`raw_${cat.id}`] : null;
    const statsVal = metrics ? metrics[`stats_${cat.id}`] : null;
    const bayVal = metrics ? metrics[`bay_${cat.id}`] : null;

    return (
        <button onClick={onClick}
            className={`relative text-left w-full rounded-2xl border p-3 sm:p-4 transition-all duration-200 group min-h-[82px] sm:min-h-[105px] flex flex-col justify-between ${isFocused ? 'z-20 border-transparent bg-slate-900/80 shadow-sm' : 'border-slate-800/50 hover:border-slate-700 hover:bg-slate-800/40'}`}
            style={{
                backgroundColor: isFocused ? `${cat.color}10` : 'rgba(15,23,42,0.5)',
                borderColor: isFocused ? cat.color : undefined,
            }}>

            {/* Progress Bar (Bottom) */}
            <div className="absolute inset-x-0 bottom-0 h-1 bg-slate-800/60 overflow-hidden">
                <div className="h-full transition-all duration-700" style={{ width: `${(val / maxScore) * 100}%`, backgroundColor: statusColor }} />
            </div>

            <div className="relative z-10 flex items-center justify-end mb-2 w-full">
                <div className={`w-2 h-2 rounded-full transition-all ${isFocused ? 'scale-110' : ''}`} style={{ backgroundColor: statusColor }} />
            </div>

            <div className="relative z-10 flex flex-col justify-end w-full">
                <p className={`text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] transition-colors line-clamp-1 ${isFocused ? 'text-white' : 'text-slate-400'}`} title={cat.name}>
                    {cat.name}
                </p>
                <div className="flex items-baseline gap-1 mt-0.5">
                    <span className={`text-xl sm:text-3xl font-black tracking-tight transition-all ${isFocused ? 'text-white' : 'text-slate-100'}`}>
                        {formatValue(val)}
                    </span>
                    <span className={`text-[8px] sm:text-[10px] font-bold ${isFocused ? 'text-white/70' : 'text-slate-500'}`}>{unit}</span>
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
});
