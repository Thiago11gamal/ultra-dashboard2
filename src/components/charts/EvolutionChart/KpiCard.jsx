import React from 'react';
import { formatValue } from '../../../utils/scoreHelper';

export const KpiCard = React.memo(function KpiCard({
    value,
    label,
    color = '#818cf8',
    icon,
    sub,
    hint,
    statusText,
    progress,
    title,
    className = ''
}) {
    const hasSub = sub !== null && sub !== undefined && typeof sub !== 'boolean' && String(sub).trim() !== '';
    const rawSub = hasSub ? Number(sub) : Number.NaN;
    const safeSub = Number.isFinite(rawSub) ? Number(rawSub.toFixed(2)) : Number.NaN;
    const safeProgress = progress != null && Number.isFinite(Number(progress))
        ? Math.max(0, Math.min(100, Number(progress)))
        : null;

    return (
        <div
            title={title || hint || undefined}
            className={`relative flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-slate-900/65 backdrop-blur-xl group hover:border-white/[0.16] hover:bg-slate-900/85 hover:-translate-y-0.5 transition-all duration-200 overflow-hidden px-4 py-3.5 min-w-0 ${className}`}
            style={{ boxShadow: `0 8px 28px -18px ${color}55` }}
        >
            {/* Subtle top hairline accent */}
            <div
                className="absolute inset-x-0 top-0 h-[2px] opacity-65 group-hover:opacity-100 transition-opacity pointer-events-none"
                style={{ background: `linear-gradient(90deg, ${color}00, ${color}, ${color}00)` }}
            />
            <div
                className="absolute top-0 right-0 -mt-8 -mr-8 w-24 h-24 rounded-full opacity-[0.12] blur-2xl group-hover:opacity-[0.22] transition-opacity duration-300 pointer-events-none"
                style={{ backgroundColor: color }}
            />

            <div className="relative z-10 flex items-center justify-between gap-2 mb-2.5">
                <div
                    className="flex items-center justify-center w-8 h-8 rounded-xl border text-sm shrink-0 transition-transform duration-200 group-hover:scale-105"
                    style={{
                        color,
                        backgroundColor: `${color}16`,
                        borderColor: `${color}30`,
                    }}
                >
                    {icon}
                </div>
                {Number.isFinite(safeSub) ? (
                    <span
                        className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg border tabular-nums ${
                            safeSub === 0
                                ? 'bg-slate-800/60 text-slate-400 border-slate-700'
                                : safeSub > 0
                                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                    : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                        }`}
                    >
                        {safeSub === 0 ? '—' : safeSub > 0 ? `+${formatValue(safeSub)}` : formatValue(safeSub)}
                    </span>
                ) : statusText ? (
                    <span
                        className="text-[11px] font-bold px-2 py-0.5 rounded-lg border bg-slate-950/50 truncate max-w-[130px]"
                        style={{ color, borderColor: `${color}35` }}
                    >
                        {statusText}
                    </span>
                ) : null}
            </div>

            <div className="relative z-10 min-w-0">
                <p
                    className="text-2xl font-black font-mono tabular-nums tracking-tight truncate leading-none"
                    style={{ color }}
                >
                    {value}
                </p>
                <p className="text-[11px] text-slate-200 uppercase tracking-wider mt-1.5 font-bold truncate">
                    {label}
                </p>
                {hint && (
                    <p className="text-[11px] text-slate-400 mt-0.5 truncate leading-snug" title={hint}>
                        {hint}
                    </p>
                )}
                {safeProgress !== null && (
                    <div className="mt-2.5 h-1.5 w-full rounded-full bg-slate-950/80 border border-white/[0.05] overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${safeProgress}%`, backgroundColor: color }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
});
