import React, { useId, useCallback } from 'react';
import {
    ComposedChart,
    Bar,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import { getDateKey, formatDuration, formatWeekdayShortPtBR } from '../../../utils/dateHelper';
import { getSafeScore, getSyntheticTotal } from '../../../utils/scoreHelper';

const WeeklyPerformanceChart = ({
    categories = [],
    studyLogs = [],
    showOnlyFocus = false,
    focusSubjectId = null,
    maxScore = 100,
    unit = '%'
}) => {
    const safeMaxScore = Number.isFinite(Number(maxScore)) && Number(maxScore) > 0 ? Number(maxScore) : 100;
    const safeUnit = typeof unit === 'string' && unit.length <= 4 ? unit : '%';
    const instanceId = useId().replace(/:/g, "");
    const barGradId = `wp_barGrad_${instanceId}`;
    const neonShadowId = `wp_neonShadow_${instanceId}`;

    const chartData = React.useMemo(() => {
        const days = [];
        const today = new Date();
        today.setHours(12, 0, 0, 0);

        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const dateKey = getDateKey(d);

            // Get day label (dow)
            const dow = formatWeekdayShortPtBR(d);

            // Calculate Hours
            const dailyLogs = studyLogs.filter(log => {
                const logDate = getDateKey(log.date);
                if (logDate !== dateKey) return false;
                if (showOnlyFocus && focusSubjectId) {
                    return log.categoryId === focusSubjectId;
                }
                return true;
            });
            const minutes = dailyLogs.reduce((acc, log) => acc + (Number(log.minutes) || 0), 0);
            const horas = Number((minutes / 60).toFixed(2));

            // Calculate Accuracy
            let correctTotal = 0;
            let questionsTotal = 0;

            categories.forEach(cat => {
                if (showOnlyFocus && focusSubjectId && cat.id !== focusSubjectId) return;

                const history = cat.simuladoStats?.history || [];
                history.forEach(h => {
                    const hDate = getDateKey(h.date);
                    if (hDate === dateKey) {
                        let q = Number(h.total) || 0;
                        if (q === 0 && h.score != null) {
                            q = getSyntheticTotal(safeMaxScore);
                        }
                        if (q < 1) return; // Skip invalid entries

                        const score = getSafeScore(h, safeMaxScore);
                        correctTotal += (score / safeMaxScore) * q;
                        questionsTotal += q;
                    }
                });
            });

            const acertosRaw = questionsTotal > 0
                ? (correctTotal / questionsTotal) * safeMaxScore
                : null;
            const acertos = acertosRaw == null
                ? null
                : Number(Math.max(0, Math.min(safeMaxScore, acertosRaw)).toFixed(2));

            days.push({
                data: i === 0 ? "HOJE" : dow,
                fullDate: dateKey,
                horas,
                acertos
            });
        }
        return days;
    }, [categories, studyLogs, showOnlyFocus, focusSubjectId, safeMaxScore]);


    const renderTooltip = useCallback(({ active, payload, label }) => {
        if (!(active && payload && payload.length)) return null;
        return (
            <div className="glass border border-white/10 p-3 rounded-2xl shadow-2xl backdrop-blur-xl bg-slate-900/90">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 border-b border-white/5 pb-1">
                    {label}
                </p>
                {payload.map((entry, index) => (
                    <div key={index} className="flex items-center justify-between gap-4 py-1">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                            <span className="text-xs font-bold text-slate-300 capitalize">
                                {entry.name}:
                            </span>
                        </div>
                        <span className="text-xs font-black text-white">
                            {entry.value != null && Number.isFinite(Number(entry.value))
                                ? (entry.name === 'acertos' ? `${entry.value}${safeUnit}` : formatDuration(entry.value))
                                : 'N/A'}
                        </span>
                    </div>
                ))}
            </div>
        );
    }, [safeUnit]);

    return (
        <div className="w-full h-[320px] sm:h-[400px] flex flex-col">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 px-1 gap-2 shrink-0">
                <div>
                    <h3 className="text-white font-black text-sm sm:text-base flex items-center gap-2">
                        📈 {showOnlyFocus ? 'Foco: Últimos 7 Dias' : 'Desempenho: Últimos 7 Dias'}
                    </h3>
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-0.5">
                        Horas de Estudo vs. Taxa de Acerto
                    </p>
                </div>
                <div className="flex items-center gap-4 bg-slate-950/40 p-2 rounded-xl border border-white/5">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_#6366f1]" />
                        <span className="text-[10px] font-bold text-slate-400 capitalize">Horas</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                        <span className="text-[10px] font-bold text-slate-400 capitalize">Acertos</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                        data={chartData}
                        margin={{ top: 10, right: 10, left: -15, bottom: 20 }}
                    >
                        <defs>
                            <linearGradient id={barGradId} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.8} />
                                <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.3} />
                            </linearGradient>
                            <filter id={neonShadowId}>
                                <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
                                <feOffset in="blur" dx="0" dy="0" result="offsetBlur" />
                                <feMerge>
                                    <feMergeNode in="offsetBlur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        </defs>

                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="rgba(255,255,255,0.03)"
                            vertical={false}
                        />

                        <XAxis
                            dataKey="data"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                            dy={10}
                        />

                        {/* Left Axis: Hours */}
                        <YAxis
                            yAxisId="left"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 10 }}
                            tickFormatter={(v) => formatDuration(v)}
                            domain={[0, 'auto']}
                            allowDecimals={true}
                        />

                        {/* Right Axis: Percentage */}
                        <YAxis
                            yAxisId="right"
                            orientation="right"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 10 }}
                            tickFormatter={(v) => `${v}${safeUnit}`}
                            domain={[0, safeMaxScore]}
                        />

                        <Tooltip
                            cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                            content={renderTooltip}
                        />

                        <Bar
                            yAxisId="left"
                            dataKey="horas"
                            name="horas"
                            fill={`url(#${barGradId})`}
                            radius={[6, 6, 0, 0]}
                            barSize={32}
                            animationDuration={1500}
                        />

                        <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="acertos"
                            name="acertos"
                            stroke="#34d399"
                            strokeWidth={4}
                            dot={{ r: 4, fill: '#34d399', strokeWidth: 2, stroke: '#0f172a' }}
                            activeDot={{ r: 6, strokeWidth: 0, fill: '#10b981' }}
                            strokeLinecap="round"
                            filter={`url(#${neonShadowId})`}
                            animationDuration={2000}
                            connectNulls
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default WeeklyPerformanceChart;
