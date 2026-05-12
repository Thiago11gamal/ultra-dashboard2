import React, { useMemo, useState, useCallback } from 'react';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, ReferenceLine, Legend, Cell, Brush
} from 'recharts';
import { TrendingUp, BarChart3, HelpCircle, Zap } from 'lucide-react';
import { getSafeScore, formatValue, getSyntheticTotal } from "../../../utils/scoreHelper";
import WeeklyPerformanceChart from './WeeklyPerformanceChart';
import { computeTopRegressions, computeTrendKpi } from '../../../utils/weeklyEvolutionInsights.js';

const getMondayStr = (dateStr) => {
    const dt = typeof dateStr === 'string' && dateStr.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
        ? new Date(`${dateStr}T12:00:00`)
        : new Date(dateStr);
    if (isNaN(dt.getTime())) return null;
    const day = dt.getDay();
    const diff = dt.getDate() - day + (day === 0 ? -6 : 1);
    dt.setDate(diff);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const formatWeek = (isoString) => {
    if (!isoString || typeof isoString !== 'string') return '--/--';
    const [year, month, day] = isoString.split('-');
    if (!year || !month || !day) return '--/--';
    return `${day}/${month}`;
};

const shortenLabel = (value, max = 18) => {
    const text = String(value || '').trim();
    if (!text) return '—';
    return text.length > max ? `${text.slice(0, max - 1)}…` : text;
};

export const WeeklyEvolutionView = ({
    categories,
    studyLogs = [],
    showOnlyFocus,
    focusSubjectId,
    maxScore = 100,
    unit = '%'
}) => {
    const [viewMode, setViewMode] = useState('performance');
    const [userToggles, setUserToggles] = useState({});

    React.useEffect(() => {
        setUserToggles({});
    }, [showOnlyFocus, focusSubjectId]);

    const categoriesSignature = useMemo(() => categories.map((cat) => {
        const history = cat?.simuladoStats?.history || [];
        const tasks = cat?.tasks || [];
        const historyDigest = history.map((h) => [
            getMondayStr(h?.date) || 'nodate',
            Number(h?.score ?? 0),
            Number(h?.correct ?? 0),
            Number(h?.total ?? 0),
            Array.isArray(h?.topics) ? h.topics.length : 0,
            h?.taskId || ''
        ].join(':')).join('|');
        return [
            cat?.id,
            cat?.name || '',
            tasks.length,
            tasks.map((t) => `${t?.id || ''}:${t?.text || ''}`).join(','),
            historyDigest
        ].join('|');
    }).join('||'), [categories]);

    const { chartData, activeKeys, rankedKeys } = useMemo(() => {
        let itemsMap = {};

        if (!showOnlyFocus || !focusSubjectId) {
            categories.forEach(cat => {
                if (!cat?.id) return;
                const fullName = String(cat.name || 'Matéria').replace(/Direito /gi, 'D. ');
                const safeName = shortenLabel(fullName, 18);
                const safeColor = typeof cat.color === 'string' ? cat.color : '#64748b';
                itemsMap[cat.id] = { name: safeName, fullName: fullName, color: safeColor };
            });
        } else {
            const cat = categories.find(c => c.id === focusSubjectId);
            if (cat) {
                (cat.tasks || []).forEach(task => {
                    const tName = String(task?.text || '').trim();
                    if (!tName) return;
                    itemsMap[tName.toLowerCase()] = { name: shortenLabel(tName, 18), color: cat.color, fullName: tName };
                });

                (cat.simuladoStats?.history || []).forEach(h => {
                    if (h.topics && Array.isArray(h.topics)) {
                        h.topics.forEach(t => {
                            const tName = String(t.name || '').trim();
                            if (!tName) return;
                            itemsMap[tName.toLowerCase()] = { name: shortenLabel(tName, 18), color: cat.color, fullName: tName };
                        });
                    } else if (h.taskId) {
                        const tName = cat.tasks?.find(task => task.id === h.taskId)?.text || 'Assunto';
                        itemsMap[tName.toLowerCase()] = { name: shortenLabel(tName, 18), color: cat.color, fullName: tName };
                    }
                });
            }
        }

        const validIds = Object.keys(itemsMap);
        if (validIds.length === 0) return { chartData: [], activeKeys: {} };

        const weeksTemp = {};

        const processHistory = (historyArray, itemId) => {
            if (!Array.isArray(historyArray) || !itemId) return;
            historyArray.forEach(h => {
                const weekStr = getMondayStr(h.date);
                if (!weekStr) return;

                if (!weeksTemp[weekStr]) weeksTemp[weekStr] = { week: weekStr };
                if (!weeksTemp[weekStr][itemId]) weeksTemp[weekStr][itemId] = { correct: 0, total: 0 };

                let totalQ = Number(h.total) || 0;
                let score = getSafeScore(h, maxScore);

                if (totalQ === 0 && h.score != null) {
                    totalQ = getSyntheticTotal(maxScore);
                }

                weeksTemp[weekStr][itemId].total += totalQ;
                weeksTemp[weekStr][itemId].correct += (score / maxScore) * totalQ;
            });
        };

        if (!showOnlyFocus || !focusSubjectId) {
            categories.forEach(cat => {
                processHistory(cat.simuladoStats?.history, cat.id);
            });
        } else {
            const cat = categories.find(c => c.id === focusSubjectId);
            if (cat) {
                (cat.simuladoStats?.history || []).forEach(h => {
                    if (h.topics && Array.isArray(h.topics)) {
                        h.topics.forEach(t => {
                            const tId = String(t.name || '').toLowerCase().trim();
                            const weekStr = getMondayStr(h.date);
                            if (!weekStr) return;
                            if (!weeksTemp[weekStr]) weeksTemp[weekStr] = { week: weekStr };
                            if (!weeksTemp[weekStr][tId]) weeksTemp[weekStr][tId] = { correct: 0, total: 0 };

                            let totalQ = Number(t.total) || 0;
                            const topicScore = getSafeScore(t, maxScore);
                            if (totalQ === 0 && t.score != null) {
                                totalQ = getSyntheticTotal(maxScore);
                            }
                            weeksTemp[weekStr][tId].total += totalQ;
                            weeksTemp[weekStr][tId].correct += (topicScore / maxScore) * totalQ;
                        });
                    } else if (h.taskId) {
                        const tId = String(cat.tasks?.find(task => task.id === h.taskId)?.text || 'Assunto').toLowerCase().trim();
                        processHistory([h], tId);
                    }
                });
            }
        }

        const sortedWeeks = Object.values(weeksTemp).sort((a, b) => a.week.localeCompare(b.week));
        if (sortedWeeks.length === 0) return { chartData: [], activeKeys: {}, rankedKeys: [] };

        const memoryByItem = {}; 

        const finalData = sortedWeeks.map(weekObj => {
            const dataPoint = {
                week: weekObj.week,
                displayDate: formatWeek(weekObj.week)
            };

            validIds.forEach(id => {
                const currentData = weekObj[id];

                if (currentData && currentData.total > 0) {
                    const rawPct = (currentData.correct / currentData.total) * maxScore;
                    const currentPct = Number(Math.max(0, Math.min(maxScore, rawPct)).toFixed(2));
                    dataPoint[id] = currentPct;

                    if (memoryByItem[id] !== undefined) {
                        const prevPct = memoryByItem[id].pct;
                        const delta = Number((currentPct - prevPct).toFixed(2));

                        dataPoint[`delta_${id}`] = delta;
                        dataPoint[`deltaColor_${id}`] = delta > 0 ? '#10b981' : delta < 0 ? '#ef4444' : '#94a3b8';

                        dataPoint[`meta_${id}`] = {
                            currTot: currentData.total,
                            currPct: currentPct,
                            prevPct: prevPct,
                            prevTot: memoryByItem[id].total
                        };
                    } else {
                        dataPoint[`delta_${id}`] = null;
                        dataPoint[`deltaColor_${id}`] = '#94a3b8';
                        dataPoint[`meta_${id}`] = { currTot: currentData.total, currPct: currentPct, prevPct: null, prevTot: 0 };
                    }

                    memoryByItem[id] = { pct: currentPct, total: currentData.total };
                } else {
                    dataPoint[id] = null;
                    dataPoint[`delta_${id}`] = null;
                    dataPoint[`deltaColor_${id}`] = '#94a3b8';
                }
            });

            return dataPoint;
        });

        const volumeTracker = {};
        validIds.forEach(id => volumeTracker[id] = 0);
        finalData.forEach(week => {
            validIds.forEach(id => {
                const meta = week[`meta_${id}`];
                if (meta && Number.isFinite(Number(meta.currTot))) volumeTracker[id] += Number(meta.currTot);
            });
        });
        const rankedKeys = [...validIds].sort((a, b) => volumeTracker[b] - volumeTracker[a]);

        return { chartData: finalData, activeKeys: itemsMap, rankedKeys };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [categories, showOnlyFocus, focusSubjectId, maxScore, categoriesSignature]);

    const keys = Object.keys(activeKeys);

    const hiddenKeys = useMemo(() => {
        const result = {};
        rankedKeys?.forEach((key, idx) => {
            const defaultHide = showOnlyFocus ? false : idx >= 6; 
            if (userToggles[key] !== undefined) {
                result[key] = userToggles[key]; 
            } else {
                result[key] = defaultHide;
            }
        });
        return result;
    }, [rankedKeys, userToggles, showOnlyFocus]);

    const topRegressions = useMemo(() => computeTopRegressions({ viewMode, chartData, keys, activeKeys, hiddenKeys }), [viewMode, chartData, keys, activeKeys, hiddenKeys]);
    const trendKpi = useMemo(() => computeTrendKpi({ chartData, keys, hiddenKeys }), [chartData, keys, hiddenKeys]);

    const handleLegendClick = useCallback((e) => {
        const dataKey = e?.dataKey;
        if (!dataKey) return;
        const keyID = String(dataKey).replace('delta_', '');
        setUserToggles(prev => ({
            ...prev,
            [keyID]: !hiddenKeys[keyID] 
        }));
    }, [hiddenKeys]);

    const renderCustomTooltip = useCallback(({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-slate-950/95 border border-slate-700 p-3 rounded-none shadow-2xl backdrop-blur-md min-w-[220px]">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-800 pb-1">
                        Semana de {label}
                    </p>
                    <div className="space-y-3">
                        {payload.map((entry, idx) => {
                            const dataKey = String(entry.dataKey || '');
                            const isDelta = dataKey.startsWith('delta_');
                            const baseKey = isDelta ? dataKey.replace('delta_', '') : dataKey;

                            if (hiddenKeys[baseKey]) return null;

                            const val = entry.value;
                            if (val == null) return null;

                            const meta = entry.payload[`meta_${baseKey}`];

                            if (isDelta) {
                                const color = entry.payload[`deltaColor_${baseKey}`] || (val > 0 ? '#10b981' : val < 0 ? '#ef4444' : '#94a3b8');
                                const prefix = val > 0 ? '+' : '';
                                const currentPct = Number.isFinite(Number(meta?.currPct)) ? meta.currPct : entry.payload?.[baseKey];

                                return (
                                    <div key={idx} className="flex flex-col gap-0.5">
                                        <div className="flex justify-between items-center text-[10px]">
                                            <span style={{ color: entry.color || '#fff' }} className="font-bold flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-none" style={{ backgroundColor: entry.color }}></span>
                                                {entry.name.replace(' (Var.)', '')}
                                            </span>
                                            <span style={{ color }} className="font-mono font-black text-xs">
                                                {prefix}{formatValue(val)}{unit}
                                            </span>
                                        </div>
                                        {meta && meta.prevPct != null && Number.isFinite(Number(currentPct)) && (
                                            <div className="flex justify-between text-[8px] text-slate-500 pl-3">
                                                <span>De {formatValue(meta.prevPct)}{unit}</span>
                                                <span>
                                                    Para {formatValue(currentPct)}{unit} <strong style={{ color }}>(Δ {prefix}{formatValue(val)}{unit})</strong>
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                );
                            } else {
                                return (
                                    <div key={idx} className="flex flex-col gap-0.5">
                                        <div className="flex justify-between items-center text-[10px]">
                                            <span style={{ color: entry.color || '#fff' }} className="font-bold flex items-center gap-1.5">
                                                <span className="w-2 h-2 rounded-none" style={{ backgroundColor: entry.color }}></span>
                                                {entry.name}
                                            </span>
                                            <span className="font-mono font-bold text-white text-xs">
                                                {formatValue(val)}{unit}
                                            </span>
                                        </div>
                                        {meta && meta.currTot > 0 && (
                                            <span className="text-[8px] text-slate-500 pl-3.5 italic">
                                                Volume: {meta.currTot} questões
                                            </span>
                                        )}
                                    </div>
                                );
                            }
                        })}
                    </div>
                </div>
            );
        }
        return null;
    }, [hiddenKeys, unit]);

    const renderLegendText = useCallback((value, entry) => {
        const keyID = String(entry.dataKey || '').replace('delta_', '');
        const isHidden = hiddenKeys[keyID];
        return (
            <span className={`text-[10px] font-black uppercase tracking-widest transition-opacity cursor-pointer ${isHidden ? 'opacity-20' : 'opacity-100'}`}>
                {value.replace(' (Var.)', '')}
            </span>
        );
    }, [hiddenKeys]);

    if (chartData.length < 2) {
        return (
            <div className="h-[300px] flex flex-col items-center justify-center bg-slate-900/40 rounded-none border border-slate-800 p-6">
                <HelpCircle size={40} className="text-slate-600 mb-3" />
                <p className="text-slate-400 text-sm font-bold uppercase tracking-wider text-center">Dados Insuficientes</p>
                <p className="text-slate-500 text-[10px] mt-2 text-center max-w-[250px]">
                    Registre pelo menos 2 semanas de simulados para visualizar a curva de evolução e a variação de deltas.
                </p>
            </div>
        );
    }

    return (
        <div className="w-full pt-4 animate-fade-in relative flex flex-col">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 px-2 gap-4 shrink-0">
                <div>
                    <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Raio-X Temporal Avançado</h4>
                    <h3 className="text-lg font-black text-white uppercase tracking-tight">
                        {showOnlyFocus ? 'Semanas por Assunto' : 'Semanas por Matéria'}
                    </h3>
                    {trendKpi && (
                        <p className="text-[10px] mt-1 text-slate-400 font-mono">
                            Tendência: <span className={trendKpi.delta >= 0 ? 'text-emerald-300' : 'text-rose-300'}>{trendKpi.delta >= 0 ? '+' : ''}{formatValue(trendKpi.delta)}{unit}</span> 
                            {' '}({trendKpi.previousN} sem. → {trendKpi.recentN} sem.)
                        </p>
                    )}
                </div>

                <div className="flex items-center bg-slate-900/60 border border-slate-800 rounded-none p-1">
                    <button
                        onClick={() => setViewMode('performance')}
                        aria-label="Alternar para visão de desempenho semanal"
                        aria-pressed={viewMode === 'performance'}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-none text-[10px] font-bold uppercase transition-all ${viewMode === 'performance' ? 'bg-indigo-600/20 text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <Zap size={14} /> Desempenho (7 dias)
                    </button>
                    <button
                        onClick={() => setViewMode('evolution')}
                        aria-label="Alternar para visão de evolução semanal"
                        aria-pressed={viewMode === 'evolution'}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-none text-[10px] font-bold uppercase transition-all ${viewMode === 'evolution' ? 'bg-indigo-600/20 text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <TrendingUp size={14} /> Evolução
                    </button>
                    <button
                        onClick={() => setViewMode('variation')}
                        aria-label="Alternar para visão de variação semanal"
                        aria-pressed={viewMode === 'variation'}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-none text-[10px] font-bold uppercase transition-all ${viewMode === 'variation' ? 'bg-indigo-600/20 text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <BarChart3 size={14} /> Delta
                    </button>
                </div>
            </div>

            <div className="h-[380px] w-full mt-2 relative">
                {viewMode === 'performance' ? (
                    <WeeklyPerformanceChart
                        categories={categories}
                        studyLogs={studyLogs}
                        showOnlyFocus={showOnlyFocus}
                        focusSubjectId={focusSubjectId}
                        maxScore={maxScore}
                        unit={unit}
                    />
                ) : (
                    <ResponsiveContainer width="100%" height="100%" minHeight={320}>
                        {viewMode === 'evolution' ? (
                            <LineChart data={chartData} margin={{ top: 10, right: 10, left: 8, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" vertical={false} />

                                <XAxis dataKey="displayDate" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} dy={10} minTickGap={15} />
                                <YAxis domain={[0, maxScore]} stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} allowDataOverflow={true} tickFormatter={(v) => `${formatValue(v)}${unit}`} />
                                <Tooltip content={renderCustomTooltip} cursor={{ stroke: '#ffffff22', strokeWidth: 1, strokeDasharray: '4 4' }} />
                                <Legend verticalAlign="bottom" height={40} iconType="circle" formatter={renderLegendText} onClick={handleLegendClick} wrapperStyle={{ paddingTop: '20px' }} />

                                {keys.map(key => (
                                    <Line
                                        key={key}
                                        type="monotoneX" // FIX: Evita overshoot indesejado
                                        dataKey={key}
                                        name={activeKeys[key].name}
                                        stroke={activeKeys[key].color}
                                        strokeWidth={2.5}
                                        dot={{ r: 3, strokeWidth: 1, fill: '#0f172a' }}
                                        activeDot={{ r: 6, strokeWidth: 0 }}
                                        hide={hiddenKeys[key]}
                                        isAnimationActive={true}
                                        connectNulls={true} // FIX: Preserva integridade temporal na falta de dados entre as semanas
                                    />
                                ))}

                                {chartData.length > 8 && (
                                    <Brush
                                        dataKey="week"
                                        height={18}
                                        stroke="#ffffff11"
                                        fill="#0f172a"
                                        tickFormatter={formatWeek}
                                        className="text-[8px]"
                                        travellerWidth={8}
                                    />
                                )}
                            </LineChart>
                        ) : (
                            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 8, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" vertical={false} />

                                <XAxis dataKey="displayDate" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} dy={10} minTickGap={15} />
                                <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v > 0 ? '+' : ''}${v}${unit}`} />
                                <Tooltip content={renderCustomTooltip} cursor={{ fill: '#ffffff08' }} />
                                <Legend verticalAlign="bottom" height={40} iconType="square" formatter={renderLegendText} onClick={handleLegendClick} wrapperStyle={{ paddingTop: '20px' }} />
                                <ReferenceLine y={0} stroke="#ffffff22" />

                                {chartData.length > 8 && (
                                    <Brush
                                        dataKey="week"
                                        height={18}
                                        stroke="#ffffff11"
                                        fill="#0f172a"
                                        tickFormatter={formatWeek}
                                        className="text-[8px]"
                                        travellerWidth={8}
                                    />
                                )}

                                {keys.map(key => (
                                    <Bar
                                        key={`delta_${key}`}
                                        dataKey={`delta_${key}`}
                                        name={`${activeKeys[key].name} (Var.)`}
                                        fill={activeKeys[key].color}
                                        radius={[0, 0, 0, 0]}
                                        hide={hiddenKeys[key]}
                                    >
                                        {chartData.map((entry, index) => {
                                            const barColor = entry[`deltaColor_${key}`] || '#94a3b8';
                                            return <Cell key={`cell-${index}`} fill={barColor} fillOpacity={0.85} />;
                                        })}
                                    </Bar>
                                ))}
                            </BarChart>
                        )}
                    </ResponsiveContainer>
                )}
            </div>

            {viewMode === 'variation' && (
                <div className="mt-3 rounded-none border border-rose-900/40 bg-rose-950/20 p-3">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-rose-300 mb-2">
                        Top Regressões {topRegressions[0]?.week ? `· Semana ${topRegressions[0].week}` : ''}
                    </p>
                    {topRegressions.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {topRegressions.map(item => (
                                <div key={item.key} className="rounded-none bg-black/30 border border-white/5 px-2 py-1.5 text-[10px] flex items-center justify-between">
                                    <span className="truncate" style={{ color: item.color }} title={item.fullName}>{item.name}</span>
                                    <span className="font-mono font-black text-rose-300">{formatValue(item.delta)}{unit}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-[10px] text-slate-400">Sem regressões visíveis no filtro atual. ✅</p>
                    )}
                </div>
            )}

            {viewMode !== 'performance' && (
                <div className="flex justify-center mt-3 opacity-60">
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest bg-slate-900 px-3 py-1 rounded-none border border-slate-800 shrink-0 select-none">
                        💡 Dica: Clique nos itens da Legenda para ocultar/isolar o gráfico.
                    </p>
                </div>
            )}
        </div>
    );
};
