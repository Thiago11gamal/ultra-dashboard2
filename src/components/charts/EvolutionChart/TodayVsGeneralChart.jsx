import React, { useMemo, useState } from 'react';
import { 
    ResponsiveContainer, PieChart, Pie, Cell, 
    ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid, LabelList
} from 'recharts';
import { getDateKey, toDateMs } from '../../../utils/dateHelper';
import { getSafeScore, getSyntheticTotal } from '../../../utils/scoreHelper';
import { Zap, Target, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const COLORS = {
    gaugeBg: '#1e293b',    // slate-800
    gaugeFillValid: '#a855f7', // purple-500
    gaugeFillDanger: '#ef4444',// red-500
    gaugeFillSuccess: '#22c55e',// green-500
    reference: '#94a3b8',  // slate-400
    neonLine: '#c084fc',   // purple-400
};

const CustomTooltipTimeline = ({ active, payload, unit }) => {
    const safeFix = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0).toFixed(1);

    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-xl">
                <p className="text-slate-300 text-xs font-bold mb-1">{data.displayDate}</p>
                
                <p className="text-white text-sm font-black flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.neonLine }}></span>
                    Média: {safeFix(data.accuracy)}{unit}
                </p>
                
                {data.lastTestAcc != null && (
                    <p className="text-white text-sm font-black flex items-center gap-2 mt-1">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: data.lastTestColor || COLORS.gaugeFillValid }}></span>
                        Último: {safeFix(data.lastTestAcc)}{unit}
                    </p>
                )}

                <p className="text-slate-500 text-[10px] mt-2 uppercase tracking-wider">{data.total} questões</p>
            </div>
        );
    }
    return null;
};

const CustomTooltipPie = ({ active, payload, unit }) => {
    const safeFix = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0).toFixed(1);

    if (active && payload && payload.length) {
        const data = payload[0].payload;
        if (data.trueValue == null) return null; // Não mostra se o arco for vazio/sem dados
        
        return (
            <div 
                className="bg-slate-900 border border-slate-700 p-2 rounded-xl shadow-xl z-50 pointer-events-none"
                style={{ transform: 'translate(-50%, -130%)', width: 'max-content' }}
            >
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: data.baseColor }}></span>
                    <span className="text-slate-300 text-[10px] font-bold uppercase tracking-wider">{data.name.replace(' (Restante)', '')}</span>
                </div>
                <p className="text-white text-sm font-black mt-1">
                    {safeFix(data.trueValue)}{unit}
                </p>
            </div>
        );
    }
    return null;
};

export function TodayVsGeneralChart({ 
    activeCategories = [], 
    globalMetrics = {}, 
    targetScore = 80,
    maxScore = 100, 
    unit = '%' 
}) {
    // 1. Média Geral (Absoluta)
    const generalAccuracy = globalMetrics?.globalAccuracy || 0;
    const scale = maxScore / 100;
    const [nowMs] = useState(() => Date.now());
    const [todayKey] = useState(() => getDateKey(new Date()));

    // 2. Extrair dados diários agregados (Últimos 14 dias)
    const { dailyData, lastActiveEntry, isToday } = useMemo(() => {
        const dayMap = {};
        
        activeCategories.forEach(cat => {
            const history = Object.values(cat.simuladoStats?.history || {});
            history.forEach(h => {
                const dKey = getDateKey(h.date || h.createdAt);
                if (!dKey) return;
                
                if (!dayMap[dKey]) dayMap[dKey] = { correct: 0, total: 0 };
                
                let tot = Number(h.total) || 0;
                let corr = Number(h.correct) || 0;
                const score = getSafeScore(h, maxScore);
                
                // Fallback para inserção de percentual direto (sem quantidade)
                if (tot === 0 && h.score != null) {
                    tot = getSyntheticTotal(maxScore);
                    corr = Math.round((score / maxScore) * tot);
                } else if (tot > 0 && h.correct == null) {
                    // M4 FIX: Preserva o h.correct absoluto para evitar erros de precisão flutuante!
                    corr = Math.round((score / maxScore) * tot);
                }
                
                dayMap[dKey].correct += corr;
                dayMap[dKey].total += tot;
            });
        });
        
        const sortedDates = Object.keys(dayMap).sort();
        const result = sortedDates.slice(-14).map(date => {
            const [, m, d] = date.split('-');
            const entry = dayMap[date];
            const acc = entry.total > 0 ? (entry.correct / entry.total) * maxScore : 0;
            return {
                date,
                displayDate: `${d}/${m}`,
                accuracy: acc,
                total: entry.total,
            };
        });

        const lastEntry = result.length > 0 ? result[result.length - 1] : null;
        const _isToday = lastEntry ? lastEntry.date === todayKey : false;

        return { dailyData: result, lastActiveEntry: lastEntry, isToday: _isToday };
    }, [activeCategories, maxScore, todayKey]);

    // Extrair histórico acumulado em múltiplos recortes de tempo
    const temporalMetrics = useMemo(() => {
        let maxTime = 0;
        let latestAcc = null;

        const buckets = {
            today: { correct: 0, total: 0 },
            week: { correct: 0, total: 0 },
            month: { correct: 0, total: 0 },
            month3: { correct: 0, total: 0 },
            month6: { correct: 0, total: 0 }
        };

        const now = nowMs;
        const ms1Week = 7 * 24 * 60 * 60 * 1000;
        const ms1Month = 30 * 24 * 60 * 60 * 1000;
        const ms3Months = 90 * 24 * 60 * 60 * 1000;
        const ms6Months = 180 * 24 * 60 * 60 * 1000;

        activeCategories.forEach(cat => {
            const history = Object.values(cat.simuladoStats?.history || {});
            history.forEach(h => {
                const time = toDateMs(h.date || h.createdAt);
                if (!time) return;
                
                const score = getSafeScore(h, maxScore);
                const hDateKey = getDateKey(h.date || h.createdAt);
                
                if (time > maxTime) {
                    maxTime = time;
                    latestAcc = score;
                }

                let tot = Number(h.total) || 0;
                let corr = Number(h.correct) || 0;
                if (tot === 0 && h.score != null) {
                    tot = getSyntheticTotal(maxScore);
                    corr = Math.round((score / maxScore) * tot);
                } else if (tot > 0 && h.correct == null) {
                    // M4 FIX: Idem - não sobrescreve os acertos reais.
                    corr = Math.round((score / maxScore) * tot);
                }

                if (tot === 0) return;

                if (hDateKey === todayKey) {
                    buckets.today.correct += corr;
                    buckets.today.total += tot;
                }
                if (now - time <= ms1Week) {
                    buckets.week.correct += corr;
                    buckets.week.total += tot;
                }
                if (now - time <= ms1Month) {
                    buckets.month.correct += corr;
                    buckets.month.total += tot;
                }
                if (now - time <= ms3Months) {
                    buckets.month3.correct += corr;
                    buckets.month3.total += tot;
                }
                if (now - time <= ms6Months) {
                    buckets.month6.correct += corr;
                    buckets.month6.total += tot;
                }
            });
        });

        const getAcc = (b) => b.total > 0 ? (b.correct / b.total) * maxScore : null;

        return [
            { id: 'month6', label: '6 Meses', val: getAcc(buckets.month6), rIn: 70, rOut: 80 },
            { id: 'month3', label: '3 Meses', val: getAcc(buckets.month3), rIn: 82, rOut: 92 },
            { id: 'month', label: '1 Mês', val: getAcc(buckets.month), rIn: 94, rOut: 103 },
            { id: 'week', label: 'Semana', val: getAcc(buckets.week), rIn: 105, rOut: 113 },
            { id: 'today', label: 'Hoje', val: getAcc(buckets.today), rIn: 115, rOut: 122 },
            { id: 'last', label: 'Último', val: latestAcc, rIn: 124, rOut: 130 }
        ];
    }, [activeCategories, maxScore, nowMs, todayKey]);

    const lastMetric = temporalMetrics.find(t => t.id === 'last');
    const latestAcc = lastMetric?.val ?? null;

    const chartData = useMemo(() => {
        if (!dailyData || dailyData.length === 0) return [];
        const data = dailyData.map(d => ({ ...d }));
        if (latestAcc !== null) {
            const lastIdx = data.length - 1;
            const prevAcc = data.length > 1 ? data[lastIdx - 1].accuracy : data[0].accuracy;
            data[lastIdx].lastTestAcc = latestAcc;
            
            const marginLine = 2; // 2% margin for stability
            if (latestAcc < prevAcc - marginLine) {
                data[lastIdx].lastTestColor = COLORS.gaugeFillDanger;
            } else if (latestAcc > prevAcc + marginLine) {
                data[lastIdx].lastTestColor = COLORS.gaugeFillValid;
            } else {
                data[lastIdx].lastTestColor = '#eab308'; // Stable / Yellow
            }
        }
        return data;
    }, [dailyData, latestAcc]);

    if (!dailyData || dailyData.length === 0) {
        return (
            <div className="h-[300px] flex flex-col items-center justify-center gap-4 rounded-2xl border border-slate-800 bg-slate-950/30">
                <span className="text-4xl opacity-50">⚖️</span>
                <p className="text-slate-400 font-bold text-sm">Dados insuficientes para comparação diária.</p>
            </div>
        );
    }

    const focusAccuracy = lastActiveEntry ? lastActiveEntry.accuracy : 0;
    const delta = focusAccuracy - generalAccuracy;
    const deltaAbs = Math.abs(delta);
    
    // Stable Margin logic for delta
    const marginDelta = 2; // 2% margin
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
        if (val >= targetScore) return COLORS.gaugeFillSuccess;
        if (val < targetScore - (15 * scale)) return COLORS.gaugeFillDanger;
        return '#facc15';
    };

    // Usaremos a cor do arco 'Hoje' para o texto central, ou a cor geral.

    // Helper for safe rendering
    const safeFix = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0).toFixed(1);

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full min-h-[400px]">
            {/* Painel Esquerdo: O Velocímetro / Dashboard de Hoje */}
            <div className="w-full lg:w-1/3 min-w-[280px] bg-black/40 border border-slate-700/50 rounded-3xl p-6 flex flex-col items-center justify-center relative shadow-inner overflow-hidden group">
                <div className="absolute top-4 left-4 flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                        <Target size={14} />
                    </div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        {isToday ? "Sessão de Hoje" : "Última Sessão"}
                    </span>
                </div>

                {/* Legenda dos Anéis */}
                <div className="absolute top-4 right-4 flex flex-col items-end gap-1">
                    {temporalMetrics.slice().reverse().map(metric => {
                        if (metric.val == null) {
                            return (
                                <div key={metric.id} className="flex items-center gap-1.5 opacity-40">
                                    <span className="text-[7px] text-slate-500 uppercase tracking-widest font-black">{metric.label}</span>
                                    <span className="text-[10px] font-black tracking-tighter text-slate-600">--{unit}</span>
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-800"></div>
                                </div>
                            );
                        }
                        const c = getColor(metric.val);
                        return (
                            <div key={metric.id} className="flex items-center gap-1.5 opacity-90 hover:opacity-100 transition-opacity">
                                <span className="text-[7px] text-slate-500 uppercase tracking-widest font-black">{metric.label}</span>
                                <span className="text-[10px] font-black tracking-tighter" style={{ color: c }}>
                                    {safeFix(metric.val)}{unit}
                                </span>
                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c, filter: `drop-shadow(0 0 4px ${c}80)` }}></div>
                            </div>
                        );
                    })}
                </div>

                <div className="relative w-[260px] h-[140px] mt-6 flex justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            {temporalMetrics.map((metric) => {
                                const isNull = metric.val == null;
                                const val = isNull ? 0 : Math.max(0, Math.min(metric.val, maxScore));
                                const arcColor = isNull ? 'transparent' : getColor(metric.val);
                                const arcData = [
                                    { name: metric.label, value: val, trueValue: metric.val, baseColor: arcColor },
                                    { name: `${metric.label} (Restante)`, value: maxScore - val, trueValue: metric.val, baseColor: arcColor }
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
                                    >
                                        <Cell key={`cell-${metric.id}-0`} fill={arcColor} style={{ filter: isNull ? 'none' : `drop-shadow(0 0 6px ${arcColor}60)` }} />
                                        <Cell key={`cell-${metric.id}-1`} fill={COLORS.gaugeBg} />
                                    </Pie>
                                );
                            })}
                            <Tooltip content={<CustomTooltipPie unit={unit} />} cursor={false} offset={0} isAnimationActive={false} />
                        </PieChart>
                    </ResponsiveContainer>
                    
                    {/* Texto Central do Gauge */}
                    <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center justify-end pb-1 pointer-events-none">
                        <div className="text-4xl sm:text-5xl font-black text-white drop-shadow-lg tabular-nums tracking-tight">
                            {safeFix(focusAccuracy)}<span className="text-xl text-slate-400 ml-1">{unit}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-1">
                            {isToday ? "Acertos(%) hoje" : "Acertos(%) no dia"}
                        </span>
                    </div>
                </div>

                {/* Badges de Comparação (Deltas) */}
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3 w-full">
                    <div className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 border shadow-sm ${
                        deltaStatus === 'positive' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                        deltaStatus === 'negative' ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' :
                        'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                    }`}>
                        {deltaStatus === 'positive' ? <TrendingUp size={14} /> : 
                         deltaStatus === 'negative' ? <TrendingDown size={14} /> : 
                         <Minus size={14} />}
                        <div className="flex flex-col">
                            <span className="text-sm font-black">
                                {delta > 0 ? '+' : delta < 0 ? '−' : ''}{safeFix(deltaAbs)}{unit}
                            </span>
                            <span className="text-[7px] uppercase tracking-wider opacity-70">Geral</span>
                        </div>
                    </div>

                    {deltaLastVsToday !== null && (
                        <div className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 border shadow-sm ${
                            lastVsTodayStatus === 'positive' ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' :
                            lastVsTodayStatus === 'negative' ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' :
                            'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                        }`}>
                            {lastVsTodayStatus === 'positive' ? <TrendingUp size={14} /> : 
                             lastVsTodayStatus === 'negative' ? <TrendingDown size={14} /> : 
                             <Minus size={14} />}
                            <div className="flex flex-col">
                                <span className="text-xs font-black">
                                    {deltaLastVsToday > 0 ? '+' : ''}{safeFix(Math.abs(deltaLastVsToday))}{unit}
                                </span>
                                <span className="text-[7px] uppercase tracking-wider opacity-70">Ritmo (Hoje)</span>
                            </div>
                        </div>
                    )}
                </div>
                
                {/* Info adicional da Meta */}
                <div className="w-full flex justify-between items-center mt-6 pt-4 border-t border-white/5 px-2">
                    <div className="flex flex-col">
                        <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Média Geral</span>
                        <span className="text-sm font-bold text-slate-300">{safeFix(generalAccuracy)}{unit}</span>
                    </div>
                    <div className="flex flex-col text-right">
                        <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Meta</span>
                        <span className="text-sm font-bold text-slate-300">{targetScore}{unit}</span>
                    </div>
                </div>
            </div>

            {/* Painel Direito: Linha do Tempo Analítica */}
            <div className="w-full lg:w-2/3 flex-1 bg-black/20 border border-slate-700/30 rounded-3xl p-4 sm:p-6 flex flex-col relative">
                <div className="flex justify-between items-start mb-6">
                    <div className="flex flex-col">
                        <h4 className="text-sm font-black text-slate-200 uppercase tracking-widest mb-1 flex items-center gap-2">
                            <Zap size={14} className="text-purple-400" /> Histórico Recente (14 dias)
                        </h4>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                            Compare suas variações diárias com a linha base
                        </p>
                    </div>
                </div>
                
                <div className="flex-1 w-full min-h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData} margin={{ top: 20, right: 20, left: -20, bottom: 10 }}>
                            <defs>
                                <linearGradient id="neonGradient" x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" stopColor={COLORS.neonLine} stopOpacity={0.4} />
                                    <stop offset="100%" stopColor={COLORS.neonLine} stopOpacity={1} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" vertical={false} />
                            <XAxis 
                                dataKey="displayDate" 
                                stroke="#64748b" 
                                fontSize={10} 
                                tickLine={false} 
                                axisLine={false} 
                                dy={10}
                                fontWeight={600}
                            />
                            <YAxis 
                                domain={[0, maxScore]} 
                                stroke="#64748b" 
                                fontSize={10} 
                                tickLine={false} 
                                axisLine={false} 
                                tickFormatter={(v) => `${v}${unit === '%' ? '' : unit}`} 
                            />
                            <Tooltip content={<CustomTooltipTimeline unit={unit} />} cursor={{ stroke: '#ffffff1a', strokeWidth: 2 }} />
                            
                            {/* Linha de Referência da Média Geral */}
                            <ReferenceLine 
                                y={generalAccuracy} 
                                stroke={COLORS.reference} 
                                strokeDasharray="5 5" 
                                strokeWidth={2} 
                                opacity={0.6}
                                label={{ position: 'top', value: 'MÉDIA GERAL', fill: COLORS.reference, fontSize: 9, fontWeight: 800, textAnchor: 'end', dx: -10 }}
                            />
                            
                            {/* Linha da Evolução Diária */}
                            <Line 
                                type="monotoneX" 
                                dataKey="accuracy" 
                                stroke="url(#neonGradient)" 
                                strokeWidth={3} 
                                dot={{ fill: '#1e293b', stroke: COLORS.neonLine, strokeWidth: 2, r: 4 }}
                                activeDot={{ fill: COLORS.neonLine, stroke: '#fff', strokeWidth: 2, r: 6 }}
                                isAnimationActive={true}
                                animationDuration={1200}
                            >
                                <LabelList 
                                    dataKey="accuracy" 
                                    position="top" 
                                    offset={10} 
                                    formatter={(v) => Math.round(v)} 
                                    fill="#94a3b8" 
                                    fontSize={10}
                                    fontWeight={700}
                                />
                            </Line>

                            {/* Barra do Último Simulado (aparece apenas no último dia) */}
                            <Bar dataKey="lastTestAcc" barSize={16} radius={[4,4,0,0]} isAnimationActive={true} animationDuration={1200} fill={COLORS.gaugeFillValid}>
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.lastTestColor || COLORS.gaugeFillValid} style={{ filter: entry.lastTestColor ? `drop-shadow(0 0 6px ${entry.lastTestColor}80)` : 'none' }} />
                                ))}
                                <LabelList 
                                    dataKey="lastTestAcc" 
                                    position="right" 
                                    offset={10} 
                                    formatter={(v) => v ? Math.round(v) : ''} 
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
}
