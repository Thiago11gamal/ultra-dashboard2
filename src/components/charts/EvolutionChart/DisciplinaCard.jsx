import React from 'react';
import { formatValue, getSafeScore, getSyntheticTotal } from '../../../utils/scoreHelper';
import { pointsToPct, pointsToRatio, ratioToPoints } from '../../../utils/scoreHelper.conversions';
import { toDateMs, getDateKey } from '../../../utils/dateHelper';

const hasValidNumber = (v) =>
    v !== null && v !== undefined && typeof v !== 'boolean' && String(v).trim() !== '' && Number.isFinite(Number(v));

export const DisciplinaCard = React.memo(function DisciplinaCard({ cat, level, metrics, target, isFocused, onClick, unit = '%', maxScore = 100, minScore = 0 }) {
    const globalMin = hasValidNumber(minScore) ? Number(minScore) : 0;
    const globalMax = hasValidNumber(maxScore) && Number(maxScore) > globalMin ? Number(maxScore) : Math.max(100, globalMin + 100);
    const catMax = hasValidNumber(cat?.maxScore) && Number(cat.maxScore) > 0 ? Number(cat.maxScore) : globalMax;
    const catMin = hasValidNumber(cat?.minScore) ? Math.min(Number(cat.minScore), catMax) : globalMin;
    const safeMax = catMax;
    const safeMin = catMin;
    const safeRange = Math.max(1e-9, safeMax - safeMin);
    const hasLevel = hasValidNumber(level);
    const val = hasLevel ? Number(level) : null;
    const effectiveTarget = hasValidNumber(cat?.minCutoff)
        ? Number(cat.minCutoff)
        : (hasValidNumber(target)
            ? (Number(target) <= safeMax && Number(target) >= safeMin && safeMax === globalMax && safeMin === globalMin
                ? Number(target)
                : safeMin + ((Number(target) - globalMin) / (globalMax - globalMin)) * safeRange)
            : safeMin + safeRange * 0.8);
    const ok = (val ?? safeMin) >= effectiveTarget;
    const midThreshold = safeMin + (effectiveTarget - safeMin) * 0.75;
    const mid = (val ?? safeMin) >= midThreshold;
    const statusColor = ok ? '#22c55e' : mid ? '#f59e0b' : '#ef4444';
    const progressWidth = val != null ? Math.max(0, Math.min(100, pointsToPct(val, safeMax, safeMin))) : 0;

    let rawVal = metrics ? metrics[`raw_${cat.id}`] : null;
    if (!hasValidNumber(rawVal)) {
        const historyRaw = cat?.simuladoStats?.history;
        const history = Array.isArray(historyRaw) ? historyRaw : Object.values(historyRaw || {});
        if (history.length > 0) {
            let latestDayKey = null;
            let latestMs = -Infinity;
            for (let i = 0; i < history.length; i++) {
                const h = history[i];
                const rawDate = h?.date || h?.createdAt || h?.timestamp;
                const ms = toDateMs(rawDate);
                if (Number.isFinite(ms) && ms >= latestMs) {
                    latestMs = ms;
                    latestDayKey = getDateKey(rawDate);
                }
            }
            if (latestDayKey) {
                let dayTotal = 0;
                let dayCorrect = 0;
                for (let i = 0; i < history.length; i++) {
                    const h = history[i];
                    if (getDateKey(h?.date || h?.createdAt || h?.timestamp) !== latestDayKey) continue;
                    const s = getSafeScore(h, safeMax, safeMin);
                    if (!Number.isFinite(s)) continue;
                    const q = Number(h?.total ?? h?.questoes ?? h?.totalQuestoes ?? h?.questions) > 0 ? Number(h?.total ?? h?.questoes ?? h?.totalQuestoes ?? h?.questions) : getSyntheticTotal(safeMax);
                    dayTotal += q;
                    dayCorrect += pointsToRatio(s, safeMax, safeMin) * q;
                }
                if (dayTotal > 0) {
                    rawVal = ratioToPoints(dayCorrect / dayTotal, safeMax, safeMin);
                }
            }
        }
    }

    let statsVal = metrics ? metrics[`stats_${cat.id}`] : null;
    if (!hasValidNumber(statsVal) && hasValidNumber(cat?.simuladoStats?.average)) {
        statsVal = Number(cat.simuladoStats.average);
    }

    let bayVal = metrics ? metrics[`bay_${cat.id}`] : null;
    if (!hasValidNumber(bayVal) && hasValidNumber(cat?.bayesianStats?.mean)) {
        bayVal = Number(cat.bayesianStats.mean);
    }

    return (
        <button onClick={onClick}
            aria-pressed={isFocused}
            aria-label={`Focar na disciplina ${cat.name}`}
            className={`relative text-left w-full h-full rounded-2xl border overflow-hidden transition-all duration-300 group flex flex-col justify-between ${
                isFocused 
                    ? 'z-20 border-white/20 bg-slate-900/90 shadow-[0_10px_30px_-5px_rgba(0,0,0,0.5)]' 
                    : 'border-slate-800/80 bg-slate-900/60 hover:border-slate-700/80 hover:bg-slate-800/80 hover:-translate-y-0.5 shadow-lg backdrop-blur-md'
            }`}
            style={{
                padding: '0.875rem 1rem',
                backgroundColor: isFocused ? `${cat.color}18` : 'rgba(15,23,42,0.65)',
                borderColor: isFocused ? `${cat.color}60` : undefined,
                boxShadow: isFocused ? `0 0 25px -8px ${cat.color}40` : undefined
            }}>

            {/* Fundo radiante no estado focado */}
            {isFocused && (
                <div className="absolute inset-0 opacity-20 bg-gradient-to-br from-transparent to-current mix-blend-overlay pointer-events-none" style={{ color: cat.color }} />
            )}

            <div className="relative z-10 flex items-start justify-between gap-1.5 mb-1.5 w-full min-h-[2.4rem]">
                <p className={`text-[10px] sm:text-[11px] font-black uppercase tracking-wider transition-colors line-clamp-2 pr-1 drop-shadow-sm leading-snug ${isFocused ? 'text-white' : 'text-slate-300 group-hover:text-slate-200'}`} title={cat.name}>
                    {cat.name}
                </p>
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 mt-0.5 transition-all shadow-sm ${isFocused ? 'scale-125 ring-2 ring-offset-2 ring-offset-slate-900' : 'opacity-80 group-hover:opacity-100'}`} style={{ backgroundColor: statusColor, '--tw-ring-color': statusColor }} />
            </div>

            <div className="relative z-10 flex flex-col justify-end w-full">
                <div className="flex items-baseline gap-1 mt-0.5">
                    <span className={`text-xl sm:text-2xl md:text-3xl font-black tracking-tighter transition-all drop-shadow-md ${isFocused ? 'text-white' : 'text-slate-100 group-hover:text-white'}`}>
                        {val != null && Number.isFinite(Number(val)) ? formatValue(val) : '—'}
                    </span>
                    {val != null && Number.isFinite(Number(val)) && (
                        <span className={`text-[10px] sm:text-xs font-bold ${isFocused ? 'text-white/70' : 'text-slate-500'}`}>{unit}</span>
                    )}
                </div>
            </div>

            {/* Extra Metrics Breakdown */}
            <div className="relative z-10 w-full mt-2.5">
                <div className="flex flex-col gap-1.5 pt-2 border-t border-white/10">
                    <div className="flex flex-col gap-1">
                        <div className="flex justify-between items-center text-[9px] text-slate-400 uppercase tracking-widest font-black">
                            <span>Bruta</span>
                            <span className="text-orange-400 font-mono">{rawVal != null && Number.isFinite(Number(rawVal)) ? `${formatValue(rawVal)}${unit}` : '—'}</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-950/60 rounded-full overflow-hidden border border-white/5">
                            <div className="h-full bg-orange-400 rounded-full" style={{ width: `${rawVal != null && Number.isFinite(Number(rawVal)) ? Math.min(100, Math.max(0, ((Number(rawVal) - safeMin) / safeRange) * 100)) : 0}%` }} />
                        </div>
                    </div>
                    <div className="flex flex-col gap-1">
                        <div className="flex justify-between items-center text-[9px] text-slate-400 uppercase tracking-widest font-black">
                            <span>Histórica</span>
                            <span className="text-blue-400 font-mono">{statsVal != null && Number.isFinite(Number(statsVal)) ? `${formatValue(statsVal)}${unit}` : '—'}</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-950/60 rounded-full overflow-hidden border border-white/5">
                            <div className="h-full bg-blue-400 rounded-full" style={{ width: `${statsVal != null && Number.isFinite(Number(statsVal)) ? Math.min(100, Math.max(0, ((Number(statsVal) - safeMin) / safeRange) * 100)) : 0}%` }} />
                        </div>
                    </div>
                    <div className="flex flex-col gap-1">
                        <div className="flex justify-between items-center text-[9px] text-slate-400 uppercase tracking-widest font-black">
                            <span>Real</span>
                            <span className="text-emerald-400 font-mono">{bayVal != null && Number.isFinite(Number(bayVal)) ? `${formatValue(bayVal)}${unit}` : '—'}</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-950/60 rounded-full overflow-hidden border border-white/5">
                            <div className="h-full bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.5)]" style={{ width: `${bayVal != null && Number.isFinite(Number(bayVal)) ? Math.min(100, Math.max(0, ((Number(bayVal) - safeMin) / safeRange) * 100)) : 0}%` }} />
                        </div>
                    </div>
                </div>
            </div>

        </button>

    );
});

