import React, { useId, useCallback } from 'react';
import {
    ComposedChart,
    Bar,
    Line,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import { getDateKey, formatDuration, formatWeekdayShortPtBR } from '../../../utils/dateHelper.js';
import { parseNoonLocal, addDaysNoon } from '../../../utils/parseNoonLocal.js';
import { getSafeScore, getSyntheticTotal, formatValue, extractTopicsTotals, resolveEffectiveCorrect } from '../../../utils/scoreHelper.js';
import { pointsToRatio, ratioToPoints } from '../../../utils/scoreHelper.conversions.js';
import { getHistoryDate } from '../../../utils/evolutionGuards.js';
import { isSubjectMatch } from '../../../utils/normalization.js';

const isStrictNum = (v) =>
    v !== null && v !== undefined && typeof v !== 'boolean' && String(v).trim() !== '' && Number.isFinite(Number(v));

const WeeklyPerformanceChart = React.memo(function WeeklyPerformanceChart({
    categories = [],
    studyLogs = [],
    showOnlyFocus = false,
    focusSubjectId = null,
    maxScore = 100,
    minScore = 0,
    unit = '%'
}) {
    const safeMaxScore = isStrictNum(maxScore) && Number(maxScore) > 0 ? Number(maxScore) : 100;
    const safeMinScore = isStrictNum(minScore) ? Number(minScore) : 0;
    const trimmedUnit = typeof unit === 'string' ? unit.trim() : '';
    const safeUnit = trimmedUnit.length > 0 && trimmedUnit.length <= 12 ? trimmedUnit : '%';
    const instanceId = useId().replace(/:/g, "");
    const barGradId = `wp_barGrad_${instanceId}`;

    const chartData = React.useMemo(() => {
        const safeCats = (Array.isArray(categories) ? categories : Object.values(categories || {})).filter(Boolean);
        const safeLogs = (Array.isArray(studyLogs) ? studyLogs : Object.values(studyLogs || {})).filter(Boolean);
        const days = [];
        const todayKey = getDateKey(new Date());
        const todayNoon = (todayKey ? parseNoonLocal(todayKey) : null) || new Date();
        const focusCategory = focusSubjectId ? safeCats.find(c => String(c?.id) === String(focusSubjectId)) : null;
        const focusName = focusCategory?.name || '';

        for (let i = 6; i >= 0; i--) {
            const d = addDaysNoon(todayNoon, -i) || todayNoon;
            const dateKey = getDateKey(d);

            const dow = formatWeekdayShortPtBR(d);

            const dailyLogs = safeLogs.filter(log => {
                if (!log || log.type === 'flashcard') return false;
                const rawDate = getHistoryDate(log);
                if (!rawDate) return false;
                const logDate = getDateKey(rawDate);
                if (logDate !== dateKey) return false;
                if (showOnlyFocus && focusSubjectId) {
                    const logCatId = log.categoryId ?? log.subjectId;
                    if (logCatId != null && String(logCatId) !== '') {
                        return String(logCatId) === String(focusSubjectId);
                    }
                    const logSubj = log.subject || log.categoryName || log.materia || '';
                    return Boolean(focusName && logSubj && isSubjectMatch(logSubj, focusName));
                }
                return true;
            });
            const totalMinutes = dailyLogs.reduce((acc, log) => {
                const rawMin = Number(log.minutes ?? log.minutos);
                const rawDur = Number(log.duration);
                const m = (Number.isFinite(rawMin) && rawMin > 0) ? rawMin : (Number.isFinite(rawDur) && rawDur > 0 ? rawDur : 0);
                return acc + Math.min(720, Math.max(0, m));
            }, 0);

            let correctTotal = 0;
            let questionsTotal = 0;

            safeCats.forEach(cat => {
                if (!cat || (showOnlyFocus && focusSubjectId && String(cat.id) !== String(focusSubjectId))) return;

                const catMax = isStrictNum(cat?.maxScore) && Number(cat.maxScore) > 0 ? Number(cat.maxScore) : safeMaxScore;
                const catMin = isStrictNum(cat?.minScore) ? Math.min(Number(cat.minScore), catMax) : safeMinScore;
                const catRange = Math.max(1e-9, catMax - catMin);
                const history = Array.isArray(cat.simuladoStats?.history) ? cat.simuladoStats.history : Object.values(cat.simuladoStats?.history || {});
                history.forEach(h => {
                    if (!h || h.valid === false || h.validated === false) return;
                    const hDate = getDateKey(getHistoryDate(h));
                    if (hDate === dateKey) {
                        let q = Math.max(0, Number(h.total ?? h.questoes ?? h.totalQuestoes ?? h.questions) || 0);
                        let corr = NaN;
                        let resolvedFromTopics = false;
                        if (q === 0 && h.topics != null) {
                            const tf = extractTopicsTotals(h, catMax, catMin);
                            if (tf.total > 0) {
                                q = tf.total;
                                corr = tf.correct;
                                resolvedFromTopics = true;
                            } else if (tf.hasTopicsScore && Number.isFinite(tf.score)) {
                                q = getSyntheticTotal(catMax);
                                corr = Math.max(0, Math.min(1, (tf.score - catMin) / catRange)) * q;
                                resolvedFromTopics = true;
                            }
                        }
                        if (!resolvedFromTopics) {
                            const hasCorrect = isStrictNum(h.correct) || isStrictNum(h.acertos) || isStrictNum(h.correctCount);
                            const rawC = Number(h.correct ?? h.acertos ?? h.correctCount);
                            const score = getSafeScore(h, catMax, catMin);
                            if (q > 0) {
                                if (!hasCorrect && !Number.isFinite(score)) return;
                                corr = resolveEffectiveCorrect(h, score, q, hasCorrect && Number.isFinite(rawC), rawC, catMax, catMin);
                            } else if (Number.isFinite(score)) {
                                q = getSyntheticTotal(catMax);
                                corr = pointsToRatio(score, catMax, catMin) * q;
                            } else {
                                return;
                            }
                        }
                        if (!Number.isFinite(corr) || q < 1) return;
                        correctTotal += corr;
                        questionsTotal += q;
                    }
                });
            });

            const acertosRaw = questionsTotal > 0 ? ratioToPoints(correctTotal / questionsTotal, safeMaxScore, safeMinScore) : null;
            const safeAcertosRaw = Number.isFinite(acertosRaw) ? acertosRaw : safeMinScore;
            const acertos = acertosRaw == null
                ? null
                : Number(Math.max(safeMinScore, Math.min(safeMaxScore, safeAcertosRaw)).toFixed(2));

            days.push({
                data: i === 0 ? "HOJE" : dow,
                fullDate: dateKey,
                minutos: totalMinutes / 60,
                acertos
            });
        }
        return days;
    }, [categories, studyLogs, showOnlyFocus, focusSubjectId, safeMaxScore, safeMinScore]);


    const renderTooltip = useCallback(({ active, payload, label }) => {
        if (!(active && payload && payload.length)) return null;

        const uniquePayload = payload
            .filter((v) => !String(v.name || '').startsWith('_'))
            .filter((v, i, a) => a.findIndex(t => t.name === v.name) === i);

        return (
            <div className="bg-slate-950/80 border border-white/10 p-3 sm:p-4 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-white/10 pb-2">
                    {label === "HOJE" ? "Hoje" : label}
                </p>
                <div className="flex flex-col gap-2">
                    {uniquePayload.map((entry, index) => (
                        <div key={index} className="flex items-center justify-between gap-6 py-0.5">
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${entry.name === 'acertos' ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-indigo-400 shadow-[0_0_8px_#818cf8]'}`} />
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    {entry.name === 'acertos' ? 'Acertos' : 'Horas'}
                                </span>
                            </div>
                            <span className={`text-sm sm:text-base font-black ${entry.name === 'acertos' ? 'text-emerald-400' : 'text-indigo-300'}`}>
                                {entry.value != null && Number.isFinite(Number(entry.value))
                                    ? (entry.name === 'acertos' ? `${formatValue(entry.value)}${safeUnit}` : formatDuration(entry.value))
                                    : 'N/A'}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }, [safeUnit]);

    const hasAnyData = chartData.some(
      d => d.minutos > 0 || d.acertos != null
    );

    if (!hasAnyData) {
      return (
        <div className="w-full h-full min-h-[320px] flex flex-col items-center justify-center text-slate-500 text-sm gap-2">
          <span className="text-3xl">📭</span>
          Sem atividade nos últimos 7 dias.
        </div>
      );
    }

    return (
        <div className="w-full h-full min-h-[320px] flex flex-col">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 px-1 gap-2 shrink-0">
                <div>
                    <h3 className="text-white font-black text-sm sm:text-base flex items-center gap-2">
                        📈 {showOnlyFocus ? 'Foco: Últimos 7 Dias' : 'Desempenho: Últimos 7 Dias'}
                    </h3>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-0.5">
                        Horas de Estudo vs. Taxa de Acerto
                    </p>
                </div>
                <div className="flex items-center gap-4 bg-slate-900/80 p-2 rounded-xl border border-white/10 shadow-sm backdrop-blur-sm">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_8px_#818cf8]" />
                        <span className="text-[10px] font-bold text-slate-300 capitalize">Horas</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                        <span className="text-[10px] font-bold text-slate-300 capitalize">Acertos</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%" minHeight={240} minWidth={1}>
                    <ComposedChart
                        data={chartData}
                        margin={{ top: 10, right: 10, left: 2, bottom: 20 }}
                    >
                        <defs>
                            <linearGradient id={barGradId} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#818cf8" stopOpacity={0.9} />
                                <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.25} />
                            </linearGradient>
                            <linearGradient id={`areaGrad_${instanceId}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#34d399" stopOpacity={0.3} />
                                <stop offset="100%" stopColor="#34d399" stopOpacity={0.01} />
                            </linearGradient>
                        </defs>

                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="rgba(255,255,255,0.06)"
                            vertical={false}
                        />

                        <XAxis
                            dataKey="data"
                            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                            dy={10}
                        />

                        <YAxis
                            yAxisId="left"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                            tickFormatter={(v) => v === 0 ? '0h' : formatDuration(v)}
                            domain={[0, 'auto']}
                            allowDecimals={true}
                            width={50}
                            dx={-2}
                        />

                        <YAxis
                            yAxisId="right"
                            orientation="right"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                            tickFormatter={(v) => `${formatValue(v)}${safeUnit}`}
                            domain={[safeMinScore, safeMaxScore]}
                            allowDataOverflow={true}
                            width={48}
                            dx={2}
                        />

                        <Tooltip
                            cursor={{ fill: 'rgba(99, 102, 241, 0.06)' }}
                            content={renderTooltip}
                        />

                        <Bar
                            yAxisId="left"
                            dataKey="minutos"
                            name="Horas"
                            fill={`url(#${barGradId})`}
                            radius={[6, 6, 0, 0]}
                            barSize={24}
                            animationDuration={1200}
                        />

                        <Area
                            yAxisId="right"
                            type="monotoneX"
                            dataKey="acertos"
                            name="_acertos_area"
                            stroke="none"
                            fill={`url(#areaGrad_${instanceId})`}
                            animationDuration={1200}
                            connectNulls={true}
                            legendType="none"
                            tooltipType="none"
                        />

                        <Line
                            yAxisId="right"
                            type="monotoneX"
                            dataKey="acertos"
                            name="_acertos_glow"
                            stroke="#34d399"
                            strokeWidth={6}
                            strokeOpacity={0.25}
                            dot={false}
                            activeDot={false}
                            strokeLinecap="round"
                            animationDuration={1200}
                            connectNulls={true}
                            legendType="none"
                            tooltipType="none"
                        />
                        <Line
                            yAxisId="right"
                            type="monotoneX"
                            dataKey="acertos"
                            name="acertos"
                            stroke="#34d399"
                            strokeWidth={3}
                            dot={{ r: 3.5, fill: '#34d399', strokeWidth: 2, stroke: '#0f172a' }}
                            activeDot={{ r: 6, strokeWidth: 0, fill: '#10b981', className: "animate-pulse shadow-lg" }}
                            strokeLinecap="round"
                            animationDuration={1200}
                            connectNulls={true}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
});

export default WeeklyPerformanceChart;
