import React, { useMemo, useState } from 'react';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, ReferenceLine, Legend, Cell, Brush
} from 'recharts';
import { TrendingUp, BarChart3, HelpCircle, Zap } from 'lucide-react';
import { getSafeScore, formatValue, getSyntheticTotal } from "../../../utils/scoreHelper";
import WeeklyPerformanceChart from './WeeklyPerformanceChart';

// FIX CRÍTICO: Forçar T12:00:00 para evitar que new Date("YYYY-MM-DD") recue 1 dia em UTC-4.
// Extracção de data local em vez de toISOString() (que retorna UTC).
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

// Formatação legível para o XAxis
const formatWeek = (isoString) => {
    if (!isoString || typeof isoString !== 'string') return '--/--';
    const [year, month, day] = isoString.split('-');
    if (!year || !month || !day) return '--/--';
    return `${day}/${month}`;
};

export const WeeklyEvolutionView = ({
    categories,
    studyLogs = [],
    showOnlyFocus,
    focusSubjectId,
    maxScore = 100,
    unit = '%'
}) => {
    const [viewMode, setViewMode] = useState('performance'); // 'evolution' | 'variation' | 'performance'
    const [userToggles, setUserToggles] = useState({});

    // Limpa a memória de cliques na legenda sempre que trocar de matéria ou modo
    React.useEffect(() => {
        setUserToggles({});
    }, [showOnlyFocus, focusSubjectId]);

    // 2. PROCESSAMENTO DOMINADO
    const { chartData, activeKeys, rankedKeys } = useMemo(() => {
        let itemsMap = {};

        if (!showOnlyFocus || !focusSubjectId) {
            categories.forEach(cat => {
                if (!cat?.id) return;
                const safeName = String(cat.name || 'Matéria').replace(/Direito /gi, 'D. ').substring(0, 12);
                const safeColor = typeof cat.color === 'string' ? cat.color : '#64748b';
                itemsMap[cat.id] = { name: safeName, color: safeColor };
            });
        } else {
            const cat = categories.find(c => c.id === focusSubjectId);
            if (cat) {
                (cat.simuladoStats?.history || []).forEach(h => {
                    if (h.topics && Array.isArray(h.topics)) {
                        h.topics.forEach(t => {
                            const tName = String(t.name || '').trim();
                            if (!tName) return;
                            itemsMap[tName.toLowerCase()] = { name: tName.substring(0, 12), color: cat.color };
                        });
                    } else if (h.taskId) {
                        const tName = cat.tasks?.find(task => task.id === h.taskId)?.text || 'Assunto';
                        itemsMap[tName.toLowerCase()] = { name: tName.substring(0, 12), color: cat.color };
                    }
                });
            }
        }

        const validIds = Object.keys(itemsMap);
        if (validIds.length === 0) return { chartData: [], activeKeys: {} };

        const weeksTemp = {};

        const processHistory = (historyArray, itemId) => {
            historyArray.forEach(h => {
                const weekStr = getMondayStr(h.date);
                if (!weekStr) return;

                if (!weeksTemp[weekStr]) weeksTemp[weekStr] = { week: weekStr };
                if (!weeksTemp[weekStr][itemId]) weeksTemp[weekStr][itemId] = { correct: 0, total: 0 };

                let totalQ = Number(h.total) || 0;
                let score = getSafeScore(h, maxScore);

                // MATH FIX: Impedir que testes baseados puramente em porcentagem sem métrica de questões gerem 'missing data' (zeros cegos)
                if (totalQ === 0 && h.score != null) {
                    totalQ = getSyntheticTotal(maxScore);
                }

                weeksTemp[weekStr][itemId].total += totalQ;
                weeksTemp[weekStr][itemId].correct += (score / maxScore) * totalQ;
            });
        };

        if (!showOnlyFocus || !focusSubjectId) {
            categories.forEach(cat => processHistory(cat.simuladoStats?.history || [], cat.id));
        } else {
            const cat = categories.find(c => c.id === focusSubjectId);
            if (cat) {
                (cat.simuladoStats?.history || []).forEach(h => {
                    if (h.topics && Array.isArray(h.topics)) {
                        h.topics.forEach(t => {
                            const tName = String(t.name || '').trim();
                            if (!tName) return;
                            processHistory([{ ...t, date: h.date }], tName.toLowerCase());
                        });
                    } else if (h.taskId) {
                        const tName = cat.tasks?.find(task => task.id === h.taskId)?.text || 'Assunto';
                        processHistory([{ ...h }], tName.toLowerCase());
                    }
                });
            }
        }

        const sortedWeeks = Object.values(weeksTemp).sort((a, b) => a.week.localeCompare(b.week));
        // 🌟 SOLUÇÃO: BURACO DO EIXO X (Preenchimento blindado contra Timezones)
        // FIX: Usar T12:00:00 local e extracção local consistente com getMondayStr
        const filledWeeks = [];
        if (sortedWeeks.length > 0) {
            const firstWeek = new Date(`${sortedWeeks[0].week}T12:00:00`);
            const lastWeek = new Date(`${sortedWeeks[sortedWeeks.length - 1].week}T12:00:00`);

            const curr = new Date(firstWeek);

            while (curr <= lastWeek) {
                const y = curr.getFullYear();
                const m = String(curr.getMonth() + 1).padStart(2, '0');
                const d = String(curr.getDate()).padStart(2, '0');
                const weekStr = `${y}-${m}-${d}`;
                filledWeeks.push(weeksTemp[weekStr] || { week: weekStr });
                curr.setDate(curr.getDate() + 7);
            }
        }

        // 🌟 SOLUÇÃO 1: BURACO TEMPORAL VENCIDO
        const memoryByItem = {}; // Mantém o último percentual válido por ID

        const finalData = filledWeeks.map((weekObj) => {
            const dataPoint = {
                week: weekObj.week,
                displayDate: formatWeek(weekObj.week)
            };

            validIds.forEach(id => {
                const currentData = weekObj[id];

                if (currentData && currentData.total > 0) {
                    // 1. Calcula o percentual da semana atual
                    const rawPct = (currentData.correct / currentData.total) * maxScore;
                    const currentPct = Number(Math.max(0, Math.min(maxScore, rawPct)).toFixed(2));
                    dataPoint[id] = currentPct;

                    // 2. Calcula o Delta se houver registro anterior
                    if (memoryByItem[id] !== undefined) {
                        const prevPct = memoryByItem[id].pct;
                        const delta = Number((currentPct - prevPct).toFixed(2));

                        dataPoint[`delta_${id}`] = delta;
                        dataPoint[`deltaColor_${id}`] = delta > 0 ? '#10b981' : delta < 0 ? '#ef4444' : '#94a3b8';

                        // Metadados para o Tooltip
                        dataPoint[`meta_${id}`] = {
                            currTot: currentData.total,
                            prevPct: prevPct,
                            prevTot: memoryByItem[id].total
                        };
                    } else {
                        // Primeira semana com dados: sem variação
                        dataPoint[`delta_${id}`] = null;
                        dataPoint[`deltaColor_${id}`] = '#94a3b8';
                        dataPoint[`meta_${id}`] = { currTot: currentData.total, prevPct: null, prevTot: 0 };
                    }

                    // 3. Atualiza a memória PARA A PRÓXIMA SEMANA
                    memoryByItem[id] = { pct: currentPct, total: currentData.total };
                } else {
                    // Semana sem dados para esta matéria específica
                    dataPoint[id] = null;
                    dataPoint[`delta_${id}`] = null;
                    dataPoint[`deltaColor_${id}`] = '#94a3b8';
                }
            });

            return dataPoint;
        });

        // Ranqueamento dos validIds por volume total (para default view)
        const volumeTracker = {};
        validIds.forEach(id => volumeTracker[id] = 0);
        filledWeeks.forEach(week => {
            validIds.forEach(id => {
                if (week[id]) volumeTracker[id] += week[id].total;
            });
        });
        const rankedKeys = [...validIds].sort((a, b) => volumeTracker[b] - volumeTracker[a]);

        return { chartData: finalData, activeKeys: itemsMap, rankedKeys };
    }, [categories, showOnlyFocus, focusSubjectId, maxScore]);

    const keys = Object.keys(activeKeys);

    // 🌟 LÓGICA DO "Noodle Bowl" (Oculta linhas exedentes se houverem mais de 6 opções)
    const hiddenKeys = useMemo(() => {
        const result = {};
        rankedKeys?.forEach((key, idx) => {
            const defaultHide = idx >= 6; // Mantém no top 6 mais volumosos
            if (userToggles[key] !== undefined) {
                result[key] = userToggles[key]; // Escolha manual do aluno domina
            } else {
                result[key] = defaultHide;
            }
        });
        return result;
    }, [rankedKeys, userToggles]);

    if (chartData.length < 2) {
        return (
            <div className="h-[300px] flex flex-col items-center justify-center bg-slate-900/40 rounded-2xl border border-slate-800 p-6">
                <HelpCircle size={40} className="text-slate-600 mb-3" />
                <p className="text-slate-400 text-sm font-bold uppercase tracking-wider text-center">Dados Insuficientes</p>
                <p className="text-slate-500 text-[10px] mt-2 text-center max-w-[250px]">
                    Registre pelo menos 2 semanas de simulados para visualizar a curva de evolução e a variação de deltas.
                </p>
            </div>
        );
    }

    const handleLegendClick = (e) => {
        const { dataKey } = e;
        const keyID = String(dataKey).replace('delta_', '');
        setUserToggles(prev => ({
            ...prev,
            [keyID]: !hiddenKeys[keyID] // Inverte o frame de ocultação
        }));
    };

    const renderCustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-slate-950/95 border border-slate-700 p-3 rounded-lg shadow-2xl backdrop-blur-md min-w-[220px]">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-800 pb-1">
                        Semana de {label}
                    </p>
                    <div className="space-y-3">
                        {payload.map((entry, idx) => {
                            const dataKey = String(entry.dataKey || '');
                            const isDelta = dataKey.startsWith('delta_');
                            const baseKey = isDelta ? dataKey.replace('delta_', '') : dataKey;

                            // Se a key tá oculta no click, pula no Tooltip pra manter sincro visual
                            if (hiddenKeys[baseKey]) return null;

                            const val = entry.value;
                            if (val == null) return null;

                            const meta = entry.payload[`meta_${baseKey}`];

                            if (isDelta) {
                                // Design para Variação
                                const color = entry.payload[`deltaColor_${baseKey}`] || (val > 0 ? '#10b981' : val < 0 ? '#ef4444' : '#94a3b8');
                                const prefix = val > 0 ? '+' : '';

                                return (
                                    <div key={idx} className="flex flex-col gap-1">
                                        <div className="flex justify-between items-center text-[10px]">
                                            <span style={{ color: activeKeys[baseKey]?.color || '#fff' }} className="font-bold flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }}></span>
                                                {entry.name.replace(' (Var.)', '')}
                                            </span>
                                            <span className={`font-mono font-black`} style={{ color }}>
                                                {prefix}{formatValue(val)}{unit}
                                            </span>
                                        </div>
                                        {meta && meta.prevPct !== null && (
                                            <div className="flex justify-between text-[9px] text-slate-500 font-medium pl-3">
                                                <span>De: {formatValue(meta.prevPct)}{unit} ({meta.prevTot}q)</span>
                                                <span>Para: {formatValue(meta.prevPct + val)}{unit} ({meta.currTot}q)</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            } else {
                                // Design para Evolução
                                return (
                                    <div key={idx} className="flex flex-col gap-0.5">
                                        <div className="flex justify-between items-center text-[10px]">
                                            <span style={{ color: entry.color || '#fff' }} className="font-bold flex items-center gap-1.5">
                                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
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
    };

    return (
        <div className="w-full pt-4 animate-fade-in relative flex flex-col">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 px-2 gap-4 shrink-0">
                <div>
                    <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Raio-X Temporal Avançado</h4>
                    <h3 className="text-lg font-black text-white uppercase tracking-tight">
                        {showOnlyFocus ? 'Semanas por Assunto' : 'Semanas por Matéria'}
                    </h3>
                </div>

                <div className="flex items-center bg-slate-900/60 border border-slate-800 rounded-lg p-1">
                    <button
                        onClick={() => setViewMode('performance')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${viewMode === 'performance' ? 'bg-indigo-600/20 text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <Zap size={14} /> Desempenho (7 dias)
                    </button>
                    <button
                        onClick={() => setViewMode('evolution')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${viewMode === 'evolution' ? 'bg-indigo-600/20 text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <TrendingUp size={14} /> Evolução
                    </button>
                    <button
                        onClick={() => setViewMode('variation')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${viewMode === 'variation' ? 'bg-indigo-600/20 text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
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
                    <ResponsiveContainer width="100%" height="100%">
                        {viewMode === 'evolution' ? (
                            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" vertical={false} />

                                <XAxis dataKey="displayDate" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} dy={10} minTickGap={15} />
                                <YAxis domain={[0, maxScore]} stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${formatValue(v)}${unit}`} />

                                <Tooltip content={renderCustomTooltip} cursor={{ stroke: '#ffffff15', strokeWidth: 2 }} />

                                <Legend
                                    onClick={handleLegendClick}
                                    wrapperStyle={{ fontSize: '10px', paddingTop: '5px', cursor: 'pointer' }}
                                    iconType="circle"
                                    formatter={(value, entry) => (
                                        <span style={{
                                            color: hiddenKeys[entry.dataKey] ? '#475569' : '#fff',
                                            textDecoration: hiddenKeys[entry.dataKey] ? 'line-through' : 'none',
                                            transition: 'all 0.3s'
                                        }}>
                                            {value}
                                        </span>
                                    )}
                                />

                                {chartData.length > 4 && (
                                    <Brush
                                        dataKey="displayDate"
                                        height={20}
                                        stroke="#4f46e5"
                                        fill="#0f172a"
                                        tickFormatter={() => ''}
                                        className="opacity-80"
                                        travellerWidth={8}
                                    />
                                )}

                                {keys.map(key => (
                                    <Line
                                        key={key}
                                        type="monotone"
                                        dataKey={key}
                                        name={activeKeys[key].name}
                                        stroke={activeKeys[key].color}
                                        strokeWidth={3}
                                        hide={hiddenKeys[key]}
                                        dot={{ r: 4, strokeWidth: 2, fill: '#0f172a' }}
                                        activeDot={{ r: 6, strokeWidth: 0 }}
                                        connectNulls={true}
                                    />
                                ))}
                            </LineChart>
                        ) : (
                            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" vertical={false} />

                                <XAxis dataKey="displayDate" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} dy={10} minTickGap={15} />
                                <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v > 0 ? '+' : ''}${formatValue(v)}${unit}`} />

                                <Tooltip content={renderCustomTooltip} cursor={{ fill: '#ffffff05' }} />
                                <ReferenceLine y={0} stroke="#475569" strokeWidth={1} />

                                <Legend
                                    onClick={handleLegendClick}
                                    wrapperStyle={{ fontSize: '10px', paddingTop: '5px', cursor: 'pointer' }}
                                    iconType="circle"
                                    formatter={(value, entry) => {
                                        const baseKey = entry.dataKey.replace('delta_', '');
                                        return (
                                            <span style={{
                                                color: hiddenKeys[baseKey] ? '#475569' : '#fff',
                                                textDecoration: hiddenKeys[baseKey] ? 'line-through' : 'none',
                                                transition: 'all 0.3s'
                                            }}>
                                                {value.replace(' (Var.)', '')}
                                            </span>
                                        );
                                    }}
                                />

                                {chartData.length > 4 && (
                                    <Brush
                                        dataKey="displayDate"
                                        height={20}
                                        stroke="#4f46e5"
                                        fill="#0f172a"
                                        tickFormatter={() => ''}
                                        className="opacity-80"
                                        travellerWidth={8}
                                    />
                                )}

                                {keys.map(key => (
                                    <Bar
                                        key={`delta_${key}`}
                                        dataKey={`delta_${key}`}
                                        name={`${activeKeys[key].name} (Var.)`}
                                        fill={activeKeys[key].color}
                                        radius={[4, 4, 4, 4]}
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

            {viewMode !== 'performance' && (
                <div className="flex justify-center mt-3 opacity-60">
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest bg-slate-900 px-3 py-1 rounded-full border border-slate-800 shrink-0 select-none">
                        💡 Dica: Clique nos itens da Legenda para ocultar/isolar o gráfico.
                    </p>
                </div>
            )}
        </div>
    );
};
