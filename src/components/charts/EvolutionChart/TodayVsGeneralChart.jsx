import React, { useMemo, useState, useEffect, useId, useCallback } from 'react';
import { 
    ResponsiveContainer, PieChart, Pie, Cell, 
    ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid, LabelList
} from 'recharts';
import { getDateKey, toDateMs } from '../../../utils/dateHelper';
import { getSafeScore, getSyntheticTotal, formatValue, extractTopicsTotals } from '../../../utils/scoreHelper';
import { ratioToPoints, pointsToRatio } from '../../../utils/scoreHelper.conversions';
import { normalize } from '../../../utils/normalization';
import { Target, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const hasValidNumber = (v) =>
    v !== null && v !== undefined && typeof v !== 'boolean' && String(v).trim() !== '' && Number.isFinite(Number(v));

const COLORS = {
    gaugeBg: 'rgba(255, 255, 255, 0.05)',
    gaugeFillValid: '#a855f7',
    gaugeFillDanger: '#f43f5e',
    gaugeFillSuccess: '#10b981',
    reference: '#94a3b8',
    neonLine: '#c084fc',
};

const CustomTooltipTimeline = ({ active, payload, unit }) => {
    const safeFix = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0).toFixed(1);
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-slate-950/90 border border-white/15 p-3.5 rounded-2xl shadow-[0_12px_36px_rgba(0,0,0,0.6)] backdrop-blur-xl">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 font-mono">{data.displayDate}</p>
                <div className="space-y-1.5">
                    <p className="text-white text-xs font-black flex items-center justify-between gap-3">
                        <span className="flex items-center gap-1.5 text-slate-300 font-semibold">
                            <span className="w-2 h-2 rounded-full shadow-[0_0_8px_#c084fc]" style={{ backgroundColor: COLORS.neonLine }}></span>
                            Média diária:
                        </span>
                        <span className="font-mono text-purple-300">{safeFix(data.accuracy)}{unit}</span>
                    </p>
                    {data.lastTestAcc != null && (
                        <p className="text-white text-xs font-black flex items-center justify-between gap-3">
                            <span className="flex items-center gap-1.5 text-slate-300 font-semibold">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: data.lastTestColor || COLORS.gaugeFillValid }}></span>
                                Último teste:
                            </span>
                            <span className="font-mono" style={{ color: data.lastTestColor || COLORS.gaugeFillValid }}>{safeFix(data.lastTestAcc)}{unit}</span>
                        </p>
                    )}
                </div>
                <p className="text-slate-500 text-[9px] mt-2.5 pt-1.5 border-t border-white/5 uppercase tracking-wider font-semibold">{data.total} questões resolvidas</p>
            </div>
        );
    }
    return null;
};

const CustomTooltipPie = ({ active, payload, unit }) => {
    const safeFix = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0).toFixed(1);
    if (active && payload && payload.length) {
        const item = payload[0].payload;
        if (item.trueValue == null) return null;
        return (
            <div className="bg-slate-950/95 border border-white/15 p-2.5 rounded-xl shadow-2xl backdrop-blur-xl">
                <p className="text-slate-400 text-[9px] uppercase font-bold tracking-wider mb-0.5">{String(item.name ?? '').replace(' (Restante)', '')}</p>
                <p className="text-white text-xs font-black flex items-center gap-1.5 font-mono">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.baseColor, boxShadow: `0 0 8px ${item.baseColor}` }}></span>
                    {safeFix(item.trueValue)}{unit}
                </p>
            </div>
        );
    }
    return null;
};

export const TodayVsGeneralChart = React.memo(function TodayVsGeneralChart({ 
    activeCategories: propActiveCategories, 
    categories = [],
    focusCategory = null,
    globalMetrics = {}, 
    targetScore = 80,
    maxScore = 100, 
    minScore = 0,
    unit = '%',
    simuladoRows = []
}) {
    const neonGradInstanceId = useId().replace(/:/g, '');
    const rawCategories = (Array.isArray(propActiveCategories) && propActiveCategories.length > 0)
        ? propActiveCategories
        : (propActiveCategories && !Array.isArray(propActiveCategories) && Object.keys(propActiveCategories).length > 0 ? propActiveCategories : categories);
    const activeCategories = useMemo(() => {
        if (focusCategory) return [focusCategory];
        if (Array.isArray(rawCategories)) return rawCategories.filter(Boolean);
        if (rawCategories && typeof rawCategories === 'object') return Object.values(rawCategories).filter(Boolean);
        return [];
    }, [rawCategories, focusCategory]);

    const globalMax = Math.max(1, Number(maxScore) || 100);
    const globalMin = hasValidNumber(minScore) ? Math.min(Number(minScore), globalMax) : 0;
    const globalRange = Math.max(1e-9, globalMax - globalMin);
    const safeMax = (focusCategory && hasValidNumber(focusCategory?.maxScore) && Number(focusCategory.maxScore) > 0)
        ? Number(focusCategory.maxScore)
        : globalMax;
    const safeMin = (focusCategory && hasValidNumber(focusCategory?.minScore))
        ? Math.min(Number(focusCategory.minScore), safeMax)
        : Math.min(globalMin, safeMax);
    const safeRange = Math.max(1e-9, safeMax - safeMin);
    const effectiveTargetScore = (focusCategory && hasValidNumber(focusCategory?.minCutoff))
        ? Math.max(safeMin, Math.min(safeMax, Number(focusCategory.minCutoff)))
        : (hasValidNumber(targetScore)
            ? (safeMax === globalMax && safeMin === globalMin
                ? Number(targetScore)
                : safeMin + ((Number(targetScore) - globalMin) / globalRange) * safeRange)
            : safeMin + safeRange * 0.8);

    const resolveEntryQuestionStats = (h, catMax, catMin) => {
        let tot = Math.max(0, Number(h.total ?? h.questoes ?? h.totalQuestoes ?? h.questions) || 0);
        let corr = 0;
        const rawCorrVal = h.correct ?? h.acertos ?? h.correctCount;
        const hasExplicitC = rawCorrVal !== undefined && rawCorrVal !== null && String(rawCorrVal).trim() !== '' && !h.isPercentage;
        if (tot <= 0 && h?.topics != null) {
            const tf = extractTopicsTotals(h, catMax, catMin);
            if (tf.total > 0) {
                return { tot: tf.total, corr: tf.correct, isSynthetic: false };
            }
            if (tf.hasTopicsScore && Number.isFinite(tf.score)) {
                const synthTot = getSyntheticTotal(catMax);
                return { tot: synthTot, corr: pointsToRatio(tf.score, catMax, catMin) * synthTot, isSynthetic: true };
            }
        }
        if (hasExplicitC) {
            const rawC = Math.max(0, Number(rawCorrVal) || 0);
            if (tot === 0) tot = rawC > 0 ? rawC : getSyntheticTotal(catMax);
            corr = Math.min(tot, Number.isFinite(rawC) ? rawC : 0);
            return { tot, corr, isSynthetic: false };
        }
        const rawScore = getSafeScore(h, catMax, catMin);
        if (!Number.isFinite(rawScore) && tot <= 0) return { tot: 0, corr: 0, isSynthetic: false };
        const score = Number.isFinite(rawScore) ? rawScore : catMin;
        const isSynthetic = tot === 0;
        if (tot === 0 && (h.isPercentage || h.score != null || h.scorePoints != null || h.scorePct != null)) {
            tot = getSyntheticTotal(catMax);
        }
        if (tot <= 0) return { tot: 0, corr: 0, isSynthetic: false };
        corr = isSynthetic
            ? pointsToRatio(score, catMax, catMin) * tot
            : Math.round(pointsToRatio(score, catMax, catMin) * tot);
        return { tot, corr: Math.max(0, Math.min(tot, corr)), isSynthetic };
    };

    const generalAccuracy = useMemo(() => {
        if (focusCategory) {
            const catMax = hasValidNumber(focusCategory?.maxScore) && Number(focusCategory.maxScore) > 0 ? Number(focusCategory.maxScore) : safeMax;
            const catMin = hasValidNumber(focusCategory?.minScore) ? Math.min(Number(focusCategory.minScore), catMax) : safeMin;
            const history = Object.values(focusCategory.simuladoStats?.history || {}).filter(h => h && h.valid !== false);
            let totalQ = 0;
            let totalC = 0;
            history.forEach(h => {
                const { tot, corr } = resolveEntryQuestionStats(h, catMax, catMin);
                if (tot <= 0) return;
                totalQ += tot;
                totalC += corr;
            });
            if (totalQ > 0) {
                return Math.max(safeMin, Math.min(safeMax, ratioToPoints(totalC / totalQ, safeMax, safeMin)));
            }
        }
        const pct = Number(globalMetrics?.globalAccuracy);
        const safePct = Number.isFinite(pct) ? pct : 0;
        return Math.max(safeMin, Math.min(safeMax, ratioToPoints(safePct / 100, safeMax, safeMin)));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [focusCategory, globalMetrics?.globalAccuracy, safeMax, safeMin]);

    const scale = safeRange / 100;
    const stabilityMargin = Math.max(0.5, safeRange * 0.02);

    const [todayKey, setTodayKey] = useState(() => getDateKey(new Date()));

    useEffect(() => {
        const updateTime = () => {
            if (document.hidden) return;
            const nextKey = getDateKey(new Date());
            setTodayKey(prev => (prev === nextKey ? prev : nextKey));
        };
        const interval = setInterval(updateTime, 60000);
        const handleVisibility = () => {
            if (!document.hidden) updateTime();
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, []);

    const { dailyData, lastActiveEntry } = useMemo(() => {
        const dayMap = {};
        const safeMaxScore = safeMax;
        const safeMinScore = safeMin;
        const baseNowMs = toDateMs(todayKey) || 0;
        const localNext = getDateKey(new Date(baseNowMs + 86400000));
        const utcNext = new Date(baseNowMs + 86400000).toISOString().split('T')[0];
        const maxAllowedDateKey = localNext > utcNext ? localNext : utcNext;
        activeCategories.forEach(cat => {
            const catMax = hasValidNumber(cat?.maxScore) && Number(cat.maxScore) > 0 ? Number(cat.maxScore) : safeMaxScore;
            const catMin = hasValidNumber(cat?.minScore) ? Math.min(Number(cat.minScore), catMax) : safeMinScore;
            const history = Object.values(cat.simuladoStats?.history || {}).filter(h => h && h.valid !== false);
            history.forEach(h => {
                const dKey = getDateKey(h.date || h.createdAt);
                if (!dKey || dKey > maxAllowedDateKey) return;
                const { tot, corr } = resolveEntryQuestionStats(h, catMax, catMin);
                if (tot <= 0) return;
                if (!dayMap[dKey]) dayMap[dKey] = { correct: 0, total: 0 };
                dayMap[dKey].correct += corr;
                dayMap[dKey].total += tot;
            });
        });
        const sortedDates = Object.keys(dayMap).sort();
        const result = sortedDates.slice(-14).map(date => {
            const d = dayMap[date];
            const acc = d.total > 0 ? ratioToPoints(d.correct / d.total, safeMaxScore, safeMinScore) : safeMinScore;
            const [, month, day] = date.split('-');
            const shortDate = `${day}/${month}`;
            return {
                date,
                displayDate: shortDate,
                accuracy: acc,
                total: Math.round(d.total)
            };
        });
        const lastEntry = result.length > 0 ? result[result.length - 1] : null;
        return { dailyData: result, lastActiveEntry: lastEntry };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeCategories, safeMax, safeMin, todayKey]);

    const temporalMetrics = useMemo(() => {
        const ms1Week = 7 * 86400000;
        const ms1Month = 30 * 86400000;
        const ms3Months = 90 * 86400000;
        const ms6Months = 180 * 86400000;
        const todayNoonMs = toDateMs(todayKey) || 0;
        const utcTodayKey = new Date(todayNoonMs).toISOString().split('T')[0];
        const localNext = getDateKey(new Date(todayNoonMs + 86400000));
        const utcNext = new Date(todayNoonMs + 86400000).toISOString().split('T')[0];
        const maxAllowedDateKey = localNext > utcNext ? localNext : utcNext;

        const buckets = {
            today: { correct: 0, total: 0 },
            week: { correct: 0, total: 0 },
            month: { correct: 0, total: 0 },
            month3: { correct: 0, total: 0 },
            month6: { correct: 0, total: 0 }
        };

        const safeMaxScore = safeMax;
        const safeMinScore = safeMin;

        activeCategories.forEach(cat => {
            const catMax = hasValidNumber(cat?.maxScore) && Number(cat.maxScore) > 0 ? Number(cat.maxScore) : safeMaxScore;
            const catMin = hasValidNumber(cat?.minScore) ? Math.min(Number(cat.minScore), catMax) : safeMinScore;
            const history = Object.values(cat.simuladoStats?.history || {}).filter(h => h && h.valid !== false);
            history.forEach(h => {
                const hDateKey = getDateKey(h.date || h.createdAt);
                if (!hDateKey || hDateKey > maxAllowedDateKey) return;
                const time = toDateMs(h.date || h.createdAt);
                if (time === null || Number.isNaN(time) || !Number.isFinite(time)) return;
                const { tot, corr } = resolveEntryQuestionStats(h, catMax, catMin);
                if (tot <= 0) return;

                const isTodayDate = hDateKey === todayKey || hDateKey === utcTodayKey;
                if (isTodayDate) { buckets.today.correct += corr; buckets.today.total += tot; }
                const dayMs = toDateMs(hDateKey) || time;
                const ageMs = Math.max(0, todayNoonMs - dayMs);
                if (isTodayDate || ageMs <= ms1Week) { buckets.week.correct += corr; buckets.week.total += tot; }
                if (isTodayDate || ageMs <= ms1Month) { buckets.month.correct += corr; buckets.month.total += tot; }
                if (isTodayDate || ageMs <= ms3Months) { buckets.month3.correct += corr; buckets.month3.total += tot; }
                if (isTodayDate || ageMs <= ms6Months) { buckets.month6.correct += corr; buckets.month6.total += tot; }
            });
        });

        let latestAcc = null;
        let latestTimestamp = -Infinity;
        let hasRowMatch = false;
        if (Array.isArray(simuladoRows) && simuladoRows.length > 0) {
            const activeCategoryMap = new Set(activeCategories.map(c => normalize(c.name)));
            const activeCategoryIdMap = new Set(activeCategories.map(c => c.id).filter(Boolean));
            const sortedRows = [...simuladoRows]
                .filter(r => {
                  if (!r || r.valid === false) return false;
                  const rDateKey = getDateKey(r.date || r.createdAt);
                  if (!rDateKey || rDateKey > maxAllowedDateKey) return false;
                  const rSubj = normalize(r.subject || r.categoryName || r.materia);
                  const subjMatches = rSubj ? activeCategoryMap.has(rSubj) : false;
                  const idMatches = r.categoryId && activeCategoryIdMap.has(r.categoryId);
                
                  return subjMatches || idMatches;
                })
                .sort((a, b) => {
                    const timeA = toDateMs(a.createdAt || a.date);
                    const timeB = toDateMs(b.createdAt || b.date);
                    return (Number.isFinite(timeB) ? timeB : -Infinity) - (Number.isFinite(timeA) ? timeA : -Infinity);
                });
            if (sortedRows.length > 0) {
                const latestRow = sortedRows[0];
                const rSubj = normalize(latestRow.subject || latestRow.categoryName || latestRow.materia);
                const matchedCat = activeCategories.find(c => (c.name && normalize(c.name) === rSubj) || (c.id && c.id === latestRow.categoryId));
                const lMax = hasValidNumber(matchedCat?.maxScore) && Number(matchedCat.maxScore) > 0 ? Number(matchedCat.maxScore) : safeMaxScore;
                const lMin = hasValidNumber(matchedCat?.minScore) ? Math.min(Number(matchedCat.minScore), lMax) : safeMinScore;
                const rawLatest = getSafeScore(latestRow, lMax, lMin);
                latestAcc = Number.isFinite(rawLatest) ? ratioToPoints(pointsToRatio(rawLatest, lMax, lMin), safeMaxScore, safeMinScore) : null;
                latestTimestamp = toDateMs(latestRow.createdAt || latestRow.date) || -Infinity;
                hasRowMatch = true;
            }
        }

        activeCategories.forEach(cat => {
            const catMax = hasValidNumber(cat?.maxScore) && Number(cat.maxScore) > 0 ? Number(cat.maxScore) : safeMaxScore;
            const catMin = hasValidNumber(cat?.minScore) ? Math.min(Number(cat.minScore), catMax) : safeMinScore;
            const history = Object.values(cat.simuladoStats?.history || {}).filter(h => h && h.valid !== false);
            history.forEach(h => {
                const hDateKey = getDateKey(h?.date || h?.createdAt);
                if (!hDateKey || hDateKey > maxAllowedDateKey) return;
                const ms = toDateMs(h?.createdAt || h?.date);
                const latestDayKey = Number.isFinite(latestTimestamp) ? getDateKey(new Date(latestTimestamp)) : '';
                const isNewer = hasRowMatch
                    ? (Number.isFinite(ms) && (ms > latestTimestamp || hDateKey > latestDayKey))
                    : (Number.isFinite(ms) && ms >= latestTimestamp);
                if (isNewer) {
                    const rawScore = getSafeScore(h, catMax, catMin);
                    if (Number.isFinite(rawScore)) {
                        latestTimestamp = ms;
                        latestAcc = ratioToPoints(pointsToRatio(rawScore, catMax, catMin), safeMaxScore, safeMinScore);
                    }
                }
            });
        });

        const getAcc = (b) => b.total > 0 ? ratioToPoints(b.correct / b.total, safeMaxScore, safeMinScore) : null;
        return [
            { id: 'month6', label: 'Últimos 180 dias', val: getAcc(buckets.month6), rIn: 72, rOut: 79 },
            { id: 'month3', label: 'Últimos 90 dias', val: getAcc(buckets.month3), rIn: 80, rOut: 87 },
            { id: 'month', label: 'Últimos 30 dias', val: getAcc(buckets.month), rIn: 88, rOut: 95 },
            { id: 'week', label: 'Últimos 7 dias', val: getAcc(buckets.week), rIn: 96, rOut: 103 },
            { id: 'today', label: 'Hoje', val: getAcc(buckets.today), rIn: 104, rOut: 111 },
            { id: 'last', label: 'Último Teste', val: latestAcc, rIn: 112, rOut: 119 }
        ];
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeCategories, safeMax, safeMin, todayKey, simuladoRows]);

    const lastMetric = temporalMetrics.find(t => t.id === 'last');
    const latestAcc = hasValidNumber(lastMetric?.val) ? Number(lastMetric.val) : null;

    const chartData = useMemo(() => {
        if (!dailyData || dailyData.length === 0) return [];
        const data = dailyData.map(d => ({ ...d }));
        if (latestAcc !== null) {
            const lastIdx = data.length - 1;
            const prevAcc = data.length > 1 ? data[lastIdx - 1].accuracy : data[0].accuracy;
            data[lastIdx].lastTestAcc = latestAcc;
            const marginLine = stabilityMargin;
            if (latestAcc < prevAcc - marginLine) {
                data[lastIdx].lastTestColor = COLORS.gaugeFillDanger;
            } else if (latestAcc > prevAcc + marginLine) {
                data[lastIdx].lastTestColor = COLORS.gaugeFillValid;
            } else {
                data[lastIdx].lastTestColor = '#eab308';
            }
        }
        return data;
    }, [dailyData, latestAcc, stabilityMargin]);

    const renderAccuracyLabel = useCallback((props) => {
        const { x, y, value, index } = props;
        if (value == null || !Number.isFinite(Number(value))) return null;
        const entry = chartData[index];
        const hasCloseBar = entry?.lastTestAcc != null && Math.abs(Number(entry.lastTestAcc) - Number(value)) <= stabilityMargin * 2;
        if (hasCloseBar) return null;
        return (
            <text x={x} y={Math.max(12, (y ?? 20) - 10)} fill="#94a3b8" fontSize={10} fontWeight={700} textAnchor="middle">
                {`${formatValue(value)}${unit}`}
            </text>
        );
    }, [chartData, stabilityMargin, unit]);

    if (!dailyData || dailyData.length === 0) {
        return (
            <div className="min-h-[400px] flex flex-col items-center justify-center gap-4 rounded-3xl border border-slate-700/50 bg-slate-950/40 shadow-inner">
                <span className="text-4xl opacity-50">⚖️</span>
                <p className="text-slate-400 font-bold text-sm">Dados insuficientes para comparação diária.</p>
            </div>
        );
    }

    const focusAccuracy = lastActiveEntry ? lastActiveEntry.accuracy : safeMin;
    const delta = focusAccuracy - generalAccuracy;
    const deltaAbs = Math.abs(delta);
    const marginDelta = stabilityMargin;
    let deltaStatus = 'stable';
    if (delta > marginDelta) deltaStatus = 'positive';
    else if (delta < -marginDelta) deltaStatus = 'negative';

    const todayMetric = temporalMetrics.find(t => t.id === 'today');
    const todayAcc = todayMetric?.val ?? null;
    const deltaLastVsToday = (latestAcc != null && todayAcc != null) ? latestAcc - todayAcc : null;
    let lastVsTodayStatus = 'stable';
    if (deltaLastVsToday !== null) {
        if (deltaLastVsToday > marginDelta) lastVsTodayStatus = 'positive';
        else if (deltaLastVsToday < -marginDelta) lastVsTodayStatus = 'negative';
    }

    const getColor = (val) => {
        if (val == null) return 'transparent';
        if (val >= effectiveTargetScore) return COLORS.gaugeFillSuccess;
        if (val < effectiveTargetScore - (15 * scale)) return COLORS.gaugeFillDanger;
        return '#facc15';
    };

    const safeFix = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0).toFixed(1);

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full min-h-[400px]">
            <div className="w-full lg:w-1/3 min-w-[280px] bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 sm:p-6 flex flex-col items-center justify-between relative shadow-xl backdrop-blur-md overflow-hidden group">
                <div className="w-full flex flex-col gap-2.5 z-10">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="p-1.5 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 shrink-0">
                            <Target size={14} />
                        </div>
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-wider truncate">
                            {todayAcc != null ? 'Sessão de hoje' : `Último dia ativo (${lastActiveEntry?.displayDate || 'sem data'})`}
                        </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 w-full bg-slate-950/40 rounded-xl p-2.5 border border-white/5">
                        {temporalMetrics.slice().reverse().map(metric => {
                            if (metric.val == null) {
                                return (
                                    <div key={metric.id} className="flex items-center justify-between gap-1 opacity-35 min-w-0">
                                        <span className="text-[8px] text-slate-500 uppercase tracking-wider font-bold truncate">{metric.label}</span>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <span className="text-[9px] font-bold font-mono text-slate-600">--{unit}</span>
                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-700"></div>
                                        </div>
                                    </div>
                                );
                            }
                            const c = getColor(metric.val);
                            return (
                                <div key={metric.id} className="flex items-center justify-between gap-1 opacity-90 hover:opacity-100 transition-opacity min-w-0">
                                    <span className="text-[8px] text-slate-400 uppercase tracking-wider font-bold truncate">{metric.label}</span>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <span className="text-[9px] font-black font-mono" style={{ color: c }}>
                                            {safeFix(metric.val)}{unit}
                                        </span>
                                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c, boxShadow: `0 0 6px ${c}` }}></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div className="relative w-[260px] h-[142px] mt-4 flex justify-center">
                    <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                        <PieChart>
                            {temporalMetrics.map((metric) => {
                                const isNull = metric.val == null;
                                const safeMinVal = safeMin;
                                const val = isNull ? safeMinVal : Math.max(safeMinVal, Math.min(metric.val, safeMax));
                                const arcColor = isNull ? 'transparent' : getColor(metric.val);
                                const scaleRange = Math.max(1e-9, safeMax - safeMinVal);
                                const arcVal = isNull ? 0 : Math.max(0, val - safeMinVal);
                                const arcData = [
                                    { name: metric.label, value: arcVal, trueValue: metric.val, baseColor: arcColor },
                                    { name: `${metric.label} (Restante)`, value: Math.max(0, scaleRange - arcVal), trueValue: null, baseColor: arcColor }
                                ];
                                return (
                                    <Pie
                                        key={metric.id}
                                        data={arcData}
                                        cx="50%"
                                        cy="100%"
                                        startAngle={180}
                                        endAngle={0}
                                        innerRadius={metric.rIn}
                                        outerRadius={metric.rOut}
                                        paddingAngle={0}
                                        dataKey="value"
                                        stroke="none"
                                        isAnimationActive={false}
                                    >
                                        <Cell key={`cell-${metric.id}-0`} fill={arcColor} style={{ filter: isNull ? 'none' : `drop-shadow(0 0 6px ${arcColor}60)` }} />
                                        <Cell key={`cell-${metric.id}-1`} fill={COLORS.gaugeBg} />
                                    </Pie>
                                );
                            })}
                            <Tooltip content={<CustomTooltipPie unit={unit} />} cursor={false} offset={0} isAnimationActive={false} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center justify-end pb-0.5 pointer-events-none">
                        <div className="text-2xl sm:text-3xl leading-none font-black text-white drop-shadow-md tabular-nums font-mono tracking-tight">
                            {safeFix(focusAccuracy)}<span className="text-sm text-slate-400 ml-0.5 font-sans">{unit}</span>
                        </div>
                        <span className="text-[9px] leading-tight text-slate-400 uppercase font-bold tracking-wider mt-1">
                            {todayAcc != null ? `Acertos de hoje (${unit})` : `Último dia ativo (${unit})`}
                        </span>
                    </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-3 w-full">
                    <div className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 border shadow-sm backdrop-blur-sm ${
                        deltaStatus === 'positive' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                        deltaStatus === 'negative' ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' :
                        'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                    }`}>
                        {deltaStatus === 'positive' ? <TrendingUp size={14} /> : 
                         deltaStatus === 'negative' ? <TrendingDown size={14} /> : 
                         <Minus size={14} />}
                        <div className="flex flex-col">
                            <span className="text-sm font-black font-mono">
                                {delta > 0 ? '+' : delta < 0 ? '−' : ''}{safeFix(deltaAbs)}{unit}
                            </span>
                            <span className="text-[7px] uppercase tracking-wider opacity-70">Geral</span>
                        </div>
                    </div>
                    {deltaLastVsToday !== null && (
                        <div className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 border shadow-sm backdrop-blur-sm ${
                            lastVsTodayStatus === 'positive' ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' :
                            lastVsTodayStatus === 'negative' ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' :
                            'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                        }`}>
                            {lastVsTodayStatus === 'positive' ? <TrendingUp size={14} /> : 
                             lastVsTodayStatus === 'negative' ? <TrendingDown size={14} /> : 
                             <Minus size={14} />}
                            <div className="flex flex-col">
                                <span className="text-xs font-black font-mono">
                                    {deltaLastVsToday > 0 ? '+' : deltaLastVsToday < 0 ? '−' : ''}{safeFix(Math.abs(deltaLastVsToday))}{unit}
                                </span>
                                <span className="text-[7px] uppercase tracking-wider opacity-70">Ritmo (Hoje)</span>
                            </div>
                        </div>
                    )}
                </div>
                <div className="w-full flex justify-between items-center mt-4 pt-3.5 border-t border-white/5 px-2">
                    <div className="flex flex-col">
                        <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Média Geral</span>
                        <span className="text-sm font-bold font-mono text-slate-300">{safeFix(generalAccuracy)}{unit}</span>
                    </div>
                    <div className="flex flex-col text-right">
                        <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Meta</span>
                        <span className="text-sm font-bold font-mono text-emerald-400">{formatValue(effectiveTargetScore)}{unit}</span>
                    </div>
                </div>
            </div>
            <div className="w-full lg:w-2/3 flex-1 bg-slate-900/60 border border-slate-800/80 rounded-3xl p-4 sm:p-6 flex flex-col relative backdrop-blur-md shadow-xl">
                <div className="flex justify-between items-start mb-6">
                    <div className="flex flex-col">
                        <h4 className="text-sm font-black text-slate-100 uppercase tracking-wider mb-1 flex items-center gap-2">
                            Histórico Recente (14 dias)
                        </h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            Compare suas variações diárias com a linha base
                        </p>
                    </div>
                </div>
                <div className="flex-1 w-full min-h-[220px]">
                    <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={220}>
                        <ComposedChart data={chartData} margin={{ top: 25, right: 25, left: 0, bottom: 10 }}>
                            <defs>
                                <linearGradient id={`neonGradient_${neonGradInstanceId}`} x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" stopColor="#c084fc" stopOpacity={0.4} />
                                    <stop offset="100%" stopColor="#a855f7" stopOpacity={1} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                            <XAxis 
                                dataKey="displayDate" 
                                stroke="#64748b" 
                                fontSize={10} 
                                tickLine={false} 
                                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} 
                                dy={10}
                                fontWeight={600}
                            />
                            <YAxis 
                                domain={[safeMin, safeMax]} 
                                stroke="#64748b" 
                                fontSize={10} 
                                tickLine={false} 
                                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} 
                                tickFormatter={(v) => `${formatValue(v)}${unit}`} 
                                fontWeight={600}
                            />
                            <Tooltip content={<CustomTooltipTimeline unit={unit} />} cursor={{ stroke: 'rgba(255,255,255,0.15)', strokeWidth: 1.5, strokeDasharray: '4 4' }} />
                            <ReferenceLine 
                                y={generalAccuracy} 
                                stroke={COLORS.reference} 
                                strokeDasharray="4 4" 
                                strokeWidth={1.5} 
                                opacity={0.7}
                                label={{ value: 'Média geral', fill: COLORS.reference, fontSize: 10, fontWeight: 700, position: 'insideTopLeft', dy: -4 }}
                            />
                            <Line 
                                type="monotoneX" 
                                dataKey="accuracy" 
                                stroke={`url(#neonGradient_${neonGradInstanceId})`} 
                                strokeWidth={3} 
                                dot={{ fill: '#0f172a', stroke: '#c084fc', strokeWidth: 2, r: 4 }}
                                activeDot={{ fill: '#c084fc', stroke: '#fff', strokeWidth: 2, r: 6 }}
                                isAnimationActive={true}
                                animationDuration={1000}
                            >
                                <LabelList 
                                    dataKey="accuracy" 
                                    content={renderAccuracyLabel}
                                />
                            </Line>
                            <Bar dataKey="lastTestAcc" barSize={18} radius={[6,6,0,0]} isAnimationActive={true} animationDuration={1000} fill={COLORS.gaugeFillValid}>
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.lastTestColor || COLORS.gaugeFillValid} style={{ filter: entry.lastTestColor ? `drop-shadow(0 0 6px ${entry.lastTestColor}80)` : 'none' }} />
                                ))}
                                <LabelList 
                                    dataKey="lastTestAcc" 
                                    position="top" 
                                    offset={6} 
                                    formatter={(v) => Number.isFinite(Number(v)) ? `${formatValue(v)}${unit}` : ''} 
                                    fill="#fff" 
                                    fontSize={10} 
                                    fontWeight={900}
                                />
                            </Bar>
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
});
