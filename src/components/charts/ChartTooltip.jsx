import React from 'react';
import { Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import { formatValue } from '../../utils/scoreHelper';
import { formatDatePtBR } from '../../utils/dateHelper';

const HIDDEN_NAMES = new Set([
    'Bay CI High',
    'Bay CI Low',
    'Cenário Range',
    'Banda Bayesiana',
    'Ganho Estimado'
]);

const toStrictNum = (v) => {
    if (v === null || v === undefined || typeof v === 'boolean' || String(v).trim() === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
};

export const ChartTooltip = ({
    active,
    payload,
    label,
    isCompare = false,
    chartData = [],
    unit = '%',
    maxScore = 100,
    minScore = 0,
    targetScore = null
}) => {
    const safeMin = toStrictNum(minScore) ?? 0;
    const rawMax = toStrictNum(maxScore);
    const safeMax = rawMax !== null && rawMax > safeMin ? rawMax : Math.max(safeMin + 1, 100);
    const scaleRange = Math.max(1e-9, safeMax - safeMin);
    const safeTarget = toStrictNum(targetScore);
    const gapUnit = unit === '%' ? 'pp' : ` ${unit}`;

    const displayHeaderDate = React.useMemo(() => {
        if (!label) return '';
        if (typeof label === 'string' && /^\d{4}-\d{2}-\d{2}/.test(label)) {
            const formatted = formatDatePtBR(label);
            return formatted !== '--/--/----' ? formatted : label;
        }
        return String(label);
    }, [label]);

    if (!active || !payload?.length) return null;

    const currentData =
        payload?.[0]?.payload ||
        (Array.isArray(chartData) ? chartData.find((d) => d.displayDate === label || d.date === label) : null);

    const visibleItems = payload
        .filter((p) => !p.name?.startsWith('_') && !HIDDEN_NAMES.has(p.name))
        .filter((p, index, self) => self.findIndex((t) => t.name === p.name) === index)
        .sort((a, b) => {
            const rawA = Array.isArray(a?.value) ? a.value[0] : a?.value;
            const rawB = Array.isArray(b?.value) ? b.value[0] : b?.value;
            const valA = rawA !== null && rawA !== undefined && rawA !== '' && Number.isFinite(Number(rawA)) ? Number(rawA) : -Infinity;
            const valB = rawB !== null && rawB !== undefined && rawB !== '' && Number.isFinite(Number(rawB)) ? Number(rawB) : -Infinity;
            return valB - valA;
        });

    if (!visibleItems.length) return null;

    const isCompactMulti = !isCompare && visibleItems.length > 2;

    return (
        <div
            className={`bg-slate-950/95 border border-white/[0.12] p-3.5 rounded-2xl shadow-[0_18px_48px_rgba(0,0,0,0.75)] text-sm z-50 backdrop-blur-xl pointer-events-none overflow-hidden ${
                isCompactMulti ? 'w-[300px] sm:w-[340px]' : 'w-[86vw] sm:w-[350px]'
            } max-w-[calc(100vw-2rem)]`}
        >
            <div className="text-slate-200 mb-2.5 font-bold border-b border-white/[0.08] pb-2 flex items-center justify-between gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5">
                    <Calendar size={13} className="text-indigo-400" aria-hidden="true" />
                    <span>{displayHeaderDate}</span>
                    {isCompare && currentData?.__future && (
                        <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-500/20 border border-purple-400/35 text-purple-200">
                            Projeção MC
                        </span>
                    )}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                    {safeTarget != null && (
                        <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-500/12 border border-emerald-500/25 px-1.5 py-0.5 rounded-md tabular-nums">
                            Meta {formatValue(safeTarget)}{unit}
                        </span>
                    )}
                    {isCompactMulti && (
                        <span className="text-[11px] font-semibold text-slate-400 tabular-nums">
                            {visibleItems.length} disciplinas
                        </span>
                    )}
                </div>
            </div>

            {isCompactMulti ? (
                <div className="space-y-1.5">
                    {visibleItems.map((p, i) => {
                        const dataKey = p.dataKey;
                        if (typeof dataKey !== 'string') return null;
                        const catId = dataKey.replace(/^(bay_ci_low|bay_ci_high|trend_status|raw_correct|raw_total|raw_blanks|raw|bay|stats|trend)_/, '');
                        const mainVal = toStrictNum(Array.isArray(p.value) ? p.value[0] : p.value);
                        const rawCorrect = currentData ? currentData[`raw_correct_${catId}`] : null;
                        const rawTotal = currentData ? currentData[`raw_total_${catId}`] : null;
                        const trendVal = currentData ? currentData[`trend_${catId}`] : null;
                        const trendStatus = currentData ? currentData[`trend_status_${catId}`] : 'stable';
                        const hasMain = mainVal !== null;

                        return (
                            <div
                                key={i}
                                className="flex items-center justify-between gap-2.5 px-2.5 py-1.5 rounded-xl bg-slate-900/75 border border-white/[0.05]"
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <span
                                        className="w-2.5 h-2.5 rounded-full shrink-0"
                                        style={{ backgroundColor: p.color, boxShadow: `0 0 8px ${p.color}70` }}
                                    />
                                    <span className="text-xs font-bold text-slate-200 truncate" title={p.name}>
                                        {p.name}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 font-mono tabular-nums">
                                    {rawCorrect != null && rawTotal > 0 && (
                                        <span className="text-[11px] text-slate-400">
                                            {rawCorrect}/{rawTotal}
                                        </span>
                                    )}
                                    <span className="text-xs font-black text-white">
                                        {hasMain ? `${formatValue(mainVal)}${unit}` : '—'}
                                    </span>
                                    {hasMain && safeTarget != null && (() => {
                                        const diff = mainVal - safeTarget;
                                        return (
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${diff >= 0 ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}>
                                                {diff >= 0 ? `+${formatValue(diff)}${gapUnit}` : `${formatValue(diff)}${gapUnit}`}
                                            </span>
                                        );
                                    })()}
                                    {trendVal != null && Number.isFinite(Number(trendVal)) && Number(trendVal) !== 0 && (
                                        <span
                                            className={`inline-flex items-center gap-0.5 text-[11px] font-bold ${
                                                trendStatus === 'up'
                                                    ? 'text-emerald-400'
                                                    : trendStatus === 'down'
                                                        ? 'text-rose-400'
                                                        : 'text-slate-400'
                                            }`}
                                        >
                                            {trendVal > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                                            {trendVal > 0 ? `+${formatValue(trendVal)}` : formatValue(trendVal)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="space-y-2.5">
                    {visibleItems.map((p, i) => {
                        if (isCompare) {
                            const val = Number(p.value);
                            const diff = (Number.isFinite(val) && safeTarget != null) ? (val - safeTarget) : null;
                            return (
                                <div key={i} className="flex justify-between items-center gap-3 px-2 py-1 rounded-lg bg-slate-900/60">
                                    <span className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                                        {p.name}
                                    </span>
                                    <div className="flex items-center gap-1.5 font-mono tabular-nums">
                                        <span style={{ color: p.color }} className="font-black text-xs">
                                            {Number.isFinite(val) ? `${formatValue(val)}${unit}` : '—'}
                                        </span>
                                        {diff != null && (
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${diff >= 0 ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}>
                                                {diff >= 0 ? `+${formatValue(diff)}${gapUnit}` : `${formatValue(diff)}${gapUnit}`}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        }

                        const dataKey = p.dataKey;
                        if (typeof dataKey !== 'string') return null;

                        const catId = dataKey.replace(/^(bay_ci_low|bay_ci_high|trend_status|raw_correct|raw_total|raw_blanks|raw|bay|stats|trend)_/, '');
                        const subjName = p.name;

                        const activeSeriesVal = toStrictNum(Array.isArray(p.value) ? p.value[0] : p.value);
                        const rawCorrect = currentData ? currentData[`raw_correct_${catId}`] : null;
                        const rawTotal = currentData ? currentData[`raw_total_${catId}`] : null;
                        const rawBlanks = currentData ? (toStrictNum(currentData[`raw_blanks_${catId}`]) ?? 0) : 0;
                        const rawVal = currentData ? currentData[`raw_${catId}`] : null;
                        const bayVal = currentData ? currentData[`bay_${catId}`] : null;
                        const statsVal = currentData ? currentData[`stats_${catId}`] : null;
                        const trendVal = currentData ? currentData[`trend_${catId}`] : null;
                        const trendStatus = currentData ? currentData[`trend_status_${catId}`] : 'stable';

                        return (
                            <div key={i} className="flex flex-col bg-slate-900/65 p-3 rounded-xl border border-white/[0.06]">
                                <div className="flex justify-between items-center mb-2.5 gap-2">
                                    <span style={{ color: p.color }} className="font-bold text-xs uppercase tracking-wider flex items-center gap-2 truncate">
                                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color, boxShadow: `0 0 8px ${p.color}80` }} />
                                        <span className="truncate">{subjName}</span>
                                    </span>
                                    {safeTarget != null && (() => {
                                        // Alinha o badge à série efetivamente plotada no gráfico ativo (raw, stats ou bay) sem coerção Number(null)===0
                                        const refVal = activeSeriesVal ?? toStrictNum(bayVal) ?? toStrictNum(rawVal) ?? toStrictNum(statsVal);
                                        if (refVal == null) return null;
                                        const diff = refVal - safeTarget;
                                        return (
                                            <span className={`shrink-0 text-[10px] font-mono font-bold tabular-nums px-1.5 py-0.5 rounded-md border ${diff >= 0 ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/15 border-rose-500/30 text-rose-300'}`}>
                                                {diff >= 0 ? `+${formatValue(diff)}${gapUnit} meta` : `${formatValue(diff)}${gapUnit} meta`}
                                            </span>
                                        );
                                    })()}
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-center">
                                    <div className="flex flex-col bg-slate-950/60 p-2 rounded-lg border border-white/[0.05] relative overflow-hidden pb-2.5">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase mb-1">Bruta</span>
                                        <div className="flex flex-col items-center justify-center min-h-[26px] z-10">
                                            <span className="text-xs font-mono tabular-nums text-orange-400 font-bold leading-none">
                                                {rawVal != null && Number.isFinite(Number(rawVal)) ? `${formatValue(rawVal)}${unit}` : '—'}
                                            </span>
                                            {rawCorrect != null && rawTotal > 0 && (
                                                <span className="text-[10px] text-slate-400 font-mono mt-1 leading-none">
                                                    {rawCorrect}/{rawTotal}
                                                </span>
                                            )}
                                        </div>
                                        <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-800/80">
                                            <div className="h-full bg-orange-500" style={{ width: `${rawVal != null && Number.isFinite(Number(rawVal)) ? Math.min(100, Math.max(0, ((rawVal - safeMin) / scaleRange) * 100)) : 0}%` }} />
                                        </div>
                                    </div>
                                    <div className="flex flex-col bg-slate-950/60 p-2 rounded-lg border border-white/[0.05] relative overflow-hidden pb-2.5">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase mb-1">Histórica</span>
                                        <div className="flex flex-col items-center justify-center min-h-[26px] z-10">
                                            <span className="text-xs font-mono tabular-nums text-sky-400 font-bold leading-none">
                                                {statsVal != null && Number.isFinite(Number(statsVal)) ? `${formatValue(statsVal)}${unit}` : '—'}
                                            </span>
                                        </div>
                                        <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-800/80">
                                            <div className="h-full bg-sky-500" style={{ width: `${statsVal != null && Number.isFinite(Number(statsVal)) ? Math.min(100, Math.max(0, ((statsVal - safeMin) / scaleRange) * 100)) : 0}%` }} />
                                        </div>
                                    </div>
                                    <div className="flex flex-col bg-slate-950/60 p-2 rounded-lg border border-white/[0.05] relative overflow-hidden pb-2.5">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase mb-1">Real</span>
                                        <div className="flex flex-col items-center justify-center min-h-[26px] z-10">
                                            <span className="text-xs font-mono tabular-nums text-emerald-400 font-bold leading-none">
                                                {bayVal != null && Number.isFinite(Number(bayVal)) ? `${formatValue(bayVal)}${unit}` : '—'}
                                            </span>
                                        </div>
                                        <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-800/80">
                                            <div className="h-full bg-emerald-500" style={{ width: `${bayVal != null && Number.isFinite(Number(bayVal)) ? Math.min(100, Math.max(0, ((bayVal - safeMin) / scaleRange) * 100)) : 0}%` }} />
                                        </div>
                                    </div>
                                    <div className="flex flex-col bg-slate-950/60 p-2 rounded-lg border border-white/[0.05] relative overflow-hidden pb-2.5">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase mb-1">Tend.</span>
                                        <div className="flex flex-col items-center justify-center min-h-[26px] z-10">
                                            <span className={`text-xs font-mono tabular-nums font-bold flex items-center justify-center gap-0.5 leading-none ${trendStatus === 'up' ? 'text-emerald-400' : trendStatus === 'down' ? 'text-rose-400' : 'text-slate-400'}`}>
                                                {trendVal != null && Number.isFinite(Number(trendVal)) ? (
                                                    <>
                                                        {trendVal > 0 ? '↑' : trendVal < 0 ? '↓' : ''}
                                                        <span>{trendVal > 0 ? `+${formatValue(trendVal)}${unit}` : `${formatValue(trendVal)}${unit}`}</span>
                                                    </>
                                                ) : '—'}
                                            </span>
                                        </div>
                                        <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-800/80">
                                            <div className={`h-full ${trendStatus === 'up' ? 'bg-emerald-500 w-full' : trendStatus === 'down' ? 'bg-rose-500 w-full' : 'bg-slate-500 w-full'}`} style={{ opacity: trendVal != null && Number.isFinite(Number(trendVal)) ? 1 : 0 }} />
                                        </div>
                                    </div>
                                </div>
                                {rawCorrect != null && rawTotal > 0 && (() => {
                                    const safeCorr = Math.max(0, Math.min(rawTotal, Number(rawCorrect) || 0));
                                    const safeBlanks = Math.max(0, Math.min(rawTotal - safeCorr, rawBlanks));
                                    const errs = Math.max(0, rawTotal - safeCorr - safeBlanks);
                                    const errPct = Math.round((errs / rawTotal) * 100);
                                    const blankPct = Math.round((safeBlanks / rawTotal) * 100);
                                    const correctPct = Math.max(0, 100 - errPct - blankPct);
                                    return (
                                        <div className="mt-2.5 flex flex-col gap-1.5 px-0.5">
                                            <div className="text-[11px] text-slate-400 flex justify-between items-center gap-2">
                                                <span>Simulado deste dia:</span>
                                                <span className="tabular-nums">
                                                    <strong className="text-rose-400">{errs} {errs === 1 ? 'erro' : 'erros'}</strong> ({errPct}%)
                                                    {safeBlanks > 0 && (
                                                        <span className="text-slate-400 ml-1.5">· {safeBlanks} br.</span>
                                                    )}
                                                </span>
                                            </div>
                                            <div className="w-full h-1.5 bg-slate-800/70 rounded-full overflow-hidden flex">
                                                <div className="h-full bg-emerald-500/85 transition-all duration-300" style={{ width: `${correctPct}%` }} />
                                                {blankPct > 0 && (
                                                    <div className="h-full bg-slate-500/80 transition-all duration-300" style={{ width: `${blankPct}%` }} />
                                                )}
                                                <div className="h-full bg-rose-500/85 transition-all duration-300" style={{ width: `${errPct}%` }} />
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        );
                    })}
                    {isCompare && (() => {
                        const band = currentData?.__future
                            ? currentData?.['Cenário Range']
                            : (currentData?.['Banda Bayesiana'] || currentData?.['Cenário Range']);
                        if (!Array.isArray(band) || band.length < 2) return null;
                        const bLow = toStrictNum(band[0]);
                        const bHigh = toStrictNum(band[1]);
                        if (bLow === null || bHigh === null || bHigh <= bLow) return null;
                        return (
                            <div className="flex justify-between items-center gap-2 px-2 py-1 rounded-lg bg-slate-900/50 border border-white/[0.05] text-[10px] font-mono tabular-nums text-slate-400">
                                <span>{currentData?.__future ? 'Cone MC (IC 95%):' : 'Faixa Bayesiana (IC 95%):'}</span>
                                <span className="text-slate-200 font-bold">
                                    {formatValue(bLow)}{unit} – {formatValue(bHigh)}{unit}
                                </span>
                            </div>
                        );
                    })()}
                </div>
            )}
        </div>
    );
};
