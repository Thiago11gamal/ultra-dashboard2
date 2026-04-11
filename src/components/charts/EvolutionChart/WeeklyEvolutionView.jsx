import React, { useMemo, useState } from 'react';
import { 
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
    Tooltip, ResponsiveContainer, ReferenceLine, Legend, Cell 
} from 'recharts';
import { TrendingUp, BarChart3, HelpCircle } from 'lucide-react';
import { getSafeScore } from "../../../utils/scoreHelper";

// 1. UTIL: Pegar a segunda-feira para agrupar as semanas
const getMondayStr = (dateStr) => {
    const dt = new Date(dateStr);
    if (isNaN(dt.getTime())) return null;
    const day = dt.getDay();
    const diff = dt.getDate() - day + (day === 0 ? -6 : 1);
    dt.setDate(diff);
    return dt.toISOString().split('T')[0]; // ex: "2026-04-01"
};

// Formatação legível para o XAxis
const formatWeek = (isoString) => {
    const [year, month, day] = isoString.split('-');
    return `${day}/${month}`;
};

export const WeeklyEvolutionView = ({ categories, showOnlyFocus, focusSubjectId, maxScore = 100, unit = '%' }) => {
    // Estado para alternar entre Linha (Evolução) e Barra (Variação)
    const [viewMode, setViewMode] = useState('evolution'); // 'evolution' | 'variation'

    // 2. PROCESSAMENTO: O SEGREDO (Adaptado do seu modelo para dados dinâmicos)
    const { chartData, activeKeys } = useMemo(() => {
        let itemsMap = {}; // Para guardar nome e cor das linhas/barras
        
        // A. Definir o que estamos mapeando (Matérias Gerais ou Assuntos)
        if (!showOnlyFocus || !focusSubjectId) {
            categories.forEach(cat => {
                itemsMap[cat.id] = { name: cat.name.replace(/Direito /gi, 'D. ').substring(0, 12), color: cat.color };
            });
        } else {
            const cat = categories.find(c => c.id === focusSubjectId);
            if (cat) {
                (cat.simuladoStats?.history || []).forEach(h => {
                    if (h.topics && Array.isArray(h.topics)) {
                        h.topics.forEach(t => { itemsMap[t.id] = { name: t.name.substring(0, 12), color: cat.color }; });
                    } else if (h.taskId) {
                        const tName = cat.tasks?.find(task => task.id === h.taskId)?.text || 'Assunto';
                        itemsMap[h.taskId] = { name: tName.substring(0, 12), color: cat.color };
                    }
                });
            }
        }

        const validIds = Object.keys(itemsMap);
        if (validIds.length === 0) return { chartData: [], activeKeys: {} };

        // B. Agrupar dados brutos por Semana
        const weeksTemp = {}; // { '2026-04-01': { id1: { correct, total }, id2: { correct, total } } }
        
        const processHistory = (historyArray, itemId) => {
            historyArray.forEach(h => {
                const weekStr = getMondayStr(h.date);
                if (!weekStr) return;
                
                if (!weeksTemp[weekStr]) weeksTemp[weekStr] = { week: weekStr };
                if (!weeksTemp[weekStr][itemId]) weeksTemp[weekStr][itemId] = { correct: 0, total: 0 };
                
                const totalQ = Number(h.total) || 0;
                const score = getSafeScore(h, maxScore);
                
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
                        h.topics.forEach(t => processHistory([{...t, date: h.date}], t.id));
                    } else if (h.taskId) {
                        processHistory([{...h}], h.taskId);
                    }
                });
            }
        }

        // C. Converter para o FORMATO FINAL DOS DADOS (Seu array cronológico)
        const sortedWeeks = Object.values(weeksTemp).sort((a, b) => a.week.localeCompare(b.week));
        
        const finalData = sortedWeeks.map((weekObj, index) => {
            const prev = sortedWeeks[index - 1];
            const dataPoint = { week: weekObj.week, displayDate: formatWeek(weekObj.week) };
            
            validIds.forEach(id => {
                // Cálculo da % na semana atual
                const currentData = weekObj[id];
                let currentPct = null;
                if (currentData && currentData.total > 0) {
                    currentPct = Number(((currentData.correct / currentData.total) * maxScore).toFixed(1));
                }
                dataPoint[id] = currentPct;

                // Cálculo do Delta com base na semana anterior
                const prevData = prev?.[id];
                let prevPct = null;
                if (prevData && prevData.total > 0) {
                    prevPct = Number(((prevData.correct / prevData.total) * maxScore).toFixed(1));
                }

                // Só calcula delta se teve prova nas duas semanas
                if (currentPct !== null && prevPct !== null) {
                    dataPoint[`delta_${id}`] = Number((currentPct - prevPct).toFixed(1));
                } else {
                    dataPoint[`delta_${id}`] = null; // Sem dados suficientes para comparar
                }
            });

            return dataPoint;
        });

        return { chartData: finalData, activeKeys: itemsMap };
    }, [categories, showOnlyFocus, focusSubjectId, maxScore]);

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

    // 6. MELHORIA VISUAL DO TOOLTIP
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-slate-950/95 border border-slate-700 p-3 rounded-xl shadow-2xl backdrop-blur-md">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-800 pb-1">
                        Semana de {label}
                    </p>
                    <div className="space-y-1.5">
                        {payload.map((entry, idx) => {
                            const isDelta = entry.dataKey.startsWith('delta_');
                            const val = entry.value;
                            if (val == null) return null; // Ignora se não teve simulado
                            
                            const color = isDelta ? (val >= 0 ? '#10b981' : '#ef4444') : entry.color;
                            const prefix = isDelta && val > 0 ? '+' : '';
                            
                            return (
                                <div key={idx} className="flex justify-between items-center gap-4 text-[10px]">
                                    <span style={{ color: entry.color || '#fff' }} className="font-bold flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }}></span>
                                        {entry.name}
                                    </span>
                                    <span className={`font-mono font-bold ${isDelta ? (val >= 0 ? 'text-emerald-400' : 'text-rose-400') : 'text-white'}`}>
                                        {prefix}{val}{unit}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        }
        return null;
    };

    const keys = Object.keys(activeKeys);
    // Limita a 5 linhas/barras para não poluir demais o gráfico se houver muitos assuntos
    const renderKeys = keys.slice(0, 7); 

    return (
        <div className="w-full pt-4 animate-fade-in">
            {/* Header e Toggle */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 px-2 gap-4">
                <div>
                    <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Raio-X Temporal</h4>
                    <h3 className="text-lg font-black text-white uppercase tracking-tight">
                        {showOnlyFocus ? 'Semanas por Assunto' : 'Semanas por Matéria'}
                    </h3>
                </div>
                
                {/* Switcher de Gráficos */}
                <div className="flex items-center bg-slate-900/60 border border-slate-800 rounded-lg p-1">
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
                        <BarChart3 size={14} /> Variação (Delta)
                    </button>
                </div>
            </div>

            <div className="h-[340px] w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                    {viewMode === 'evolution' ? (
                        // 3. GRÁFICO DE EVOLUÇÃO (LINHA)
                        <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" vertical={false} />
                            <XAxis dataKey="displayDate" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                            <YAxis domain={[0, maxScore]} stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}${unit}`} />
                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#ffffff15', strokeWidth: 2 }} />
                            <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '15px' }} iconType="circle" />
                            
                            {renderKeys.map(key => (
                                <Line 
                                    key={key}
                                    type="monotone" 
                                    dataKey={key} 
                                    name={activeKeys[key].name}
                                    stroke={activeKeys[key].color} 
                                    strokeWidth={3}
                                    dot={{ r: 4, strokeWidth: 2, fill: '#0f172a' }}
                                    activeDot={{ r: 6, strokeWidth: 0 }}
                                    connectNulls={true} // Conecta linhas mesmo se pular uma semana
                                />
                            ))}
                        </LineChart>
                    ) : (
                        // 4. GRÁFICO DE VARIAÇÃO (BARRAS)
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" vertical={false} />
                            <XAxis dataKey="displayDate" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                            <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v > 0 ? '+' : ''}${v}${unit}`} />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff05' }} />
                            <ReferenceLine y={0} stroke="#475569" strokeWidth={1} />
                            <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '15px' }} iconType="circle" />
                            
                            {renderKeys.map(key => (
                                <Bar 
                                    key={`delta_${key}`}
                                    dataKey={`delta_${key}`} 
                                    name={`${activeKeys[key].name} (Var.)`}
                                    fill={activeKeys[key].color} // A cor da legenda fica a da matéria, mas a barra será formatada no Cell
                                    radius={[4, 4, 4, 4]}
                                >
                                    {chartData.map((entry, index) => {
                                        const val = entry[`delta_${key}`];
                                        // Verde para +, Vermelho para -
                                        return <Cell key={`cell-${index}`} fill={val >= 0 ? '#10b981' : '#ef4444'} fillOpacity={0.85} />;
                                    })}
                                </Bar>
                            ))}
                        </BarChart>
                    )}
                </ResponsiveContainer>
            </div>
            
            {/* Dica de leitura da variação */}
            {viewMode === 'variation' && (
                <div className="flex justify-center mt-4 opacity-60">
                     <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
                         Comparação com a semana anterior (Barras vazias = Sem histórico para comparar)
                     </p>
                </div>
            )}
        </div>
    );
};
