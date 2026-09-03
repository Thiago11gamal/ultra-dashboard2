import React, { useState, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, LabelList, Cell
} from "recharts";
import { normalizeDate } from "../../../utils/dateHelper";
import { getSafeScore, getSyntheticTotal } from "../../../utils/scoreHelper";

const CustomTooltipStyle = {
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    padding: '12px 16px',
    fontSize: '12px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
};

// Mover para top-level (antes do componente)
const WEEKS = [
    { label: "Semana 4", offset: 4 },
    { label: "Semana 3", offset: 3 },
    { label: "Semana 2", offset: 2 },
    { label: "Semana 1", offset: 1 },
    { label: "Semana atual", offset: 0 },
];

import { ShieldAlert, AlertTriangle, Sparkles } from "lucide-react";

export const CriticalTopicsAnalysis = React.memo(({ categories = [], maxScore = 100, minScore = 0 }) => {
    const [selectedWeekOffset, setSelectedWeekOffset] = useState(0);

    // Calc time window
    const { startDate, endDate, dateLabel } = useMemo(() => {
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        end.setDate(end.getDate() - (selectedWeekOffset * 7));

        const start = new Date(end);
        start.setHours(0, 0, 0, 0);
        start.setDate(end.getDate() - 6);

        const format = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;

        return {
            startDate: start,
            endDate: end,
            dateLabel: `${format(start)} — ${format(end)}`
        };
    }, [selectedWeekOffset]);

    const subtopicsData = useMemo(() => {
        if (!categories || !categories.length) return [];
        const topicMap = {};

        categories.forEach(cat => {
            const historyRaw = cat.simuladoStats?.history;
            const history = Array.isArray(historyRaw) ? historyRaw : Object.values(historyRaw || {});
            if (!history.length) return;

            const recentHistory = history.filter(h => {
                const d = normalizeDate(h.date);
                return d && d >= startDate && d <= endDate;
            });

            const range = Math.max(1e-9, maxScore - minScore);
            for (let i = 0; i < recentHistory.length; i++) {
                const h = recentHistory[i];

                (h.topics || []).forEach(t => {
                    const n = String(t.name || '').replace(/^\[(.*?)\]\s*/i, '').trim();
                    if (!n) return;
                    const key = n.toLowerCase();
                    if (!topicMap[key]) topicMap[key] = { name: n, total: 0, correct: 0, criticidade: 0 };

                    let total = parseInt(t.total, 10) || 0;
                    if (total === 0 && t.score != null) {
                        total = getSyntheticTotal(maxScore);
                    } else if (total === 0) {
                        return;
                    }
                    
                    const score = getSafeScore(t, maxScore, minScore);
                    if (!Number.isFinite(score)) return;
                    if (total <= 0) return;
                    const normalizedScore = Math.max(minScore, Math.min(maxScore, score));
                    
                    const correctCount = t.isPercentage
                        ? ((normalizedScore - minScore) / range) * total
                        : (t.correct != null ? Number(t.correct) : ((normalizedScore - minScore) / range) * total);

                    if (!Number.isFinite(correctCount)) return;
                    const safeCorrect = Math.max(0, Math.min(total, correctCount));

                    topicMap[key].total += total;
                    topicMap[key].correct += safeCorrect;
                });
            }
        });

        // Calcular criticidade final consolidada por tópico
        Object.keys(topicMap).forEach(key => {
            const item = topicMap[key];
            const accuracy = item.total > 0 ? item.correct / item.total : 0;
            const erroAbsoluto = item.total - item.correct;
            // Índice de criticidade
            item.criticidade = erroAbsoluto * (1 - accuracy);
        });

        const PALETTE = ["#ef4444", "#f97316", "#fb923c", "#f59e0b", "#facc15"];
        const result = Object.values(topicMap)
            .filter(d => d.criticidade > 0)
            .sort((a, b) => b.criticidade - a.criticidade);

        return result.slice(0, 15).map((item, i, arr) => {
            const isLong = item.name.length > 24;
            return {
                ...item,
                name: isLong ? item.name.substring(0, 22) + '...' : item.name,
                fullName: item.name,
                value: Math.round(item.criticidade * 10) / 10,
                fill: PALETTE[Math.min(PALETTE.length - 1, Math.floor((i / (arr.length > 1 ? arr.length - 1 : 1)) * (PALETTE.length - 1)))]
            };
        });
    }, [categories, startDate, endDate, maxScore, minScore]);

    const pointLeakageData = useMemo(() => {
        if (!categories || !categories.length) return [];
        let totalCriticidade = 0;
        const PALETTE = ["#ef4444", "#f97316", "#fb923c", "#f59e0b", "#facc15"];

        const rawData = categories.map(cat => {
            let total = 0;
            let correct = 0;
            const historyRaw = cat.simuladoStats?.history;
            const history = Array.isArray(historyRaw) ? historyRaw : Object.values(historyRaw || {});

            const recentHistory = history.filter(h => {
                const d = normalizeDate(h.date);
                return d && d >= startDate && d <= endDate;
            });
            const range = Math.max(1e-9, maxScore - minScore);
            for (const h of recentHistory) {
                let t = parseInt(h.total, 10) || 0;
                if (t === 0 && h.score != null) {
                    t = getSyntheticTotal(maxScore);
                } else if (t === 0) {
                    continue;
                }
                
                const score = getSafeScore(h, maxScore, minScore);
                if (!Number.isFinite(score)) continue;
                const normalizedScore = Math.max(minScore, Math.min(maxScore, score));
                
                const correctCount = h.isPercentage
                    ? ((normalizedScore - minScore) / range) * t
                    : (h.correct != null ? Number(h.correct) : ((normalizedScore - minScore) / range) * t);
                
                if (!Number.isFinite(correctCount)) continue;
                const safeCorrect = Math.max(0, Math.min(t, correctCount));
                total += t;
                correct += safeCorrect;
            }
            
            const accuracy = total > 0 ? correct / total : 0;
            const erroAbsoluto = total - correct;
            const criticidade = erroAbsoluto * (1 - accuracy);
            
            return { name: cat.name, value: criticidade, errors: erroAbsoluto };
        });

        const data = rawData.filter(d => d.value > 0).sort((a, b) => b.value - a.value);
        data.forEach(d => { totalCriticidade += d.value; });

        return data.slice(0, 10).map((item, i, arr) => {
            const isLong = item.name.length > 24;
            return {
                ...item,
                fullName: item.name,
                name: isLong ? item.name.substring(0, 22) + '...' : item.name,
                color: PALETTE[Math.min(PALETTE.length - 1, Math.floor((i / (arr.length > 1 ? arr.length - 1 : 1)) * (PALETTE.length - 1)))],
                percentage: totalCriticidade > 0 ? Math.round((item.value / totalCriticidade) * 100) : 0,
                displayValue: Math.round(item.value * 10) / 10
            };
        });
    }, [categories, startDate, endDate, maxScore, minScore]);

    const hasData = useMemo(() => {
        if (!categories) return false;
        return categories.some(cat => {
            const historyRaw = cat.simuladoStats?.history;
            const history = Array.isArray(historyRaw) ? historyRaw : Object.values(historyRaw || {});
            return history.some(h => {
                const d = normalizeDate(h.date);
                return d && d >= startDate && d <= endDate && (parseInt(h.total, 10) > 0 || h.score != null);
            });
        });
    }, [categories, startDate, endDate]);

    const weekTitle = WEEKS.find(w => w.offset === selectedWeekOffset)?.label || "SEMANA";

    return (
        <div className="w-full space-y-4 pt-2">
            {/* Header com Navegação Temporal Unificada */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-md shadow-lg">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-inner shrink-0">
                        <ShieldAlert size={20} />
                    </div>
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            Matriz de criticidade e pontos de fuga
                            <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-[9px] font-black text-rose-400 border border-rose-500/20 uppercase tracking-wider">
                                Índice de Criticidade
                            </span>
                        </div>
                        <p className="text-[11px] sm:text-xs text-slate-400 font-medium">
                            Identifique matérias e assuntos específicos que mais geram perdas de pontos
                        </p>
                    </div>
                </div>

                {/* Week Selector + Date Range Badge */}
                <div className="flex flex-wrap items-center gap-2 self-start md:self-center shrink-0">
                    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar p-1 bg-slate-950/80 rounded-xl border border-slate-800/80 shadow-inner">
                        {WEEKS.map((w) => {
                            const isActive = selectedWeekOffset === w.offset;
                            return (
                                <button
                                    key={w.label}
                                    type="button"
                                    onClick={() => setSelectedWeekOffset(w.offset)}
                                    aria-pressed={isActive}
                                    className={`px-2.5 sm:px-3 py-1 text-[9px] sm:text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
                                        isActive
                                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-[0_0_12px_rgba(99,102,241,0.5)] border border-indigo-400/40'
                                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                                    }`}
                                >
                                    {w.label}
                                </button>
                            );
                        })}
                    </div>
                    <div className="text-[10px] sm:text-[11px] font-mono font-bold text-indigo-300 bg-indigo-950/40 border border-indigo-800/50 px-2.5 py-1 rounded-lg">
                        {dateLabel}
                    </div>
                </div>
            </div>

            {/* Painéis Lado a Lado perfeitamente enquadrados */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 items-stretch">
                {/* Matérias críticas */}
                <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md p-4 sm:p-6 shadow-xl hover:border-slate-700/80 transition-all flex flex-col justify-between h-full min-w-0">
                    <div>
                        <div className="flex items-center justify-between gap-2 mb-1">
                            <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider">{weekTitle}</p>
                            <span className="text-[9px] font-bold text-slate-400 bg-white/5 border border-white/5 px-2 py-0.5 rounded-md">
                                {pointLeakageData.length} {pointLeakageData.length === 1 ? 'matéria' : 'matérias'}
                            </span>
                        </div>
                        <h4 className="text-sm sm:text-base font-bold text-slate-200 mb-1 flex items-center gap-2">
                            🩸 Matérias Críticas
                        </h4>
                        <p className="text-[10px] sm:text-xs text-slate-400 mb-4 leading-relaxed">
                            Disciplinas com maior Índice de Criticidade (Erros acumulados × taxa de erro).
                        </p>
                    </div>

                    <div className="min-h-[220px] sm:min-h-[260px] w-full flex-1 flex flex-col justify-center">
                        {pointLeakageData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={Math.max(220, pointLeakageData.length * 36)} minWidth={1}>
                                <BarChart data={pointLeakageData} layout="vertical" margin={{ top: 0, right: 60, left: -10, bottom: 0 }}>
                                    <CartesianGrid stroke="rgba(255,255,255,0.06)" horizontal={false} />
                                    <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={{ stroke: '#334155' }} tickLine={{ stroke: '#334155' }} allowDecimals={false} />
                                    <YAxis type="category" dataKey="name" stroke="#94a3b8" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={{ stroke: '#334155' }} tickLine={{ stroke: '#334155' }} width={130} />
                                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} formatter={(v, n, props) => [`${v} (Índice)`, `${props?.payload?.fullName || 'Matéria'} (${props?.payload?.errors || 0} erros)`]} contentStyle={CustomTooltipStyle} itemStyle={{ color: '#e2e8f0' }} />
                                    <Bar dataKey="displayValue" radius={[0, 6, 6, 0]} barSize={16} minPointSize={4}>
                                        {pointLeakageData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                        <LabelList dataKey="displayValue" position="right" offset={8}
                                            content={(props) => {
                                                const { x, y, width, value, index } = props;
                                                const entry = pointLeakageData[index];
                                                if (!entry || value === null || value === undefined) return null;
                                                return (
                                                    <text x={x + width + 10} y={y + 9} fill="#ffffff" fontSize={10} fontWeight="bold">
                                                        {value}{entry.percentage > 0 ? ` (${entry.percentage}%)` : ''}
                                                    </text>
                                                );
                                            }}
                                        />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full min-h-[220px] flex flex-col items-center justify-center bg-slate-950/30 rounded-2xl border border-slate-800/50 p-6 text-slate-500 text-sm text-center">
                                <span className="text-4xl mb-2">{hasData ? '🎉' : '⏳'}</span>
                                <p className="font-bold text-slate-300 mb-1">{hasData ? 'Sem erros críticos!' : 'Nenhum dado registrado'}</p>
                                Cadastre simulados para visualizar este gráfico.
                            </div>
                        )}
                    </div>
                </div>

                {/* Assuntos críticos */}
                <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md p-4 sm:p-6 shadow-xl hover:border-slate-700/80 transition-all flex flex-col justify-between h-full min-w-0">
                    <div>
                        <div className="flex items-center justify-between gap-2 mb-1">
                            <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider">{weekTitle} · TODOS OS ASSUNTOS</p>
                            <span className="text-[9px] font-bold text-slate-400 bg-white/5 border border-white/5 px-2 py-0.5 rounded-md">
                                {subtopicsData.length} {subtopicsData.length === 1 ? 'tópico' : 'tópicos'}
                            </span>
                        </div>
                        <h4 className="text-sm sm:text-base font-bold text-slate-200 mb-1 flex items-center gap-2">
                            📏 Assuntos Críticos
                        </h4>
                        <p className="text-[10px] sm:text-xs text-slate-400 mb-4 leading-relaxed">
                            Tópicos com maior urgência de revisão e reforço teórico.
                        </p>
                    </div>

                    <div className="min-h-[220px] sm:min-h-[260px] w-full flex-1 flex flex-col justify-center">
                        {subtopicsData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={Math.max(220, subtopicsData.length * 36)} minWidth={1}>
                                <BarChart data={subtopicsData} layout="vertical" margin={{ top: 0, right: 60, left: -5, bottom: 0 }}>
                                    <CartesianGrid stroke="rgba(255,255,255,0.06)" horizontal={false} />
                                    <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={{ stroke: '#334155' }} tickLine={{ stroke: '#334155' }} allowDecimals={false} />
                                    <YAxis type="category" dataKey="name" stroke="#94a3b8" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={{ stroke: '#334155' }} tickLine={{ stroke: '#334155' }} width={120} />
                                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} formatter={(v, n, props) => {
                                        const total = Number(props?.payload?.total) || 0;
                                        const correct = Number(props?.payload?.correct) || 0;
                                        const errors = Math.max(0, total - correct);
                                        return [`${v} (Índice)`, `${props?.payload?.fullName || 'Assunto'} (${errors} erros)`];
                                    }} contentStyle={CustomTooltipStyle} itemStyle={{ color: '#e2e8f0' }} />
                                    <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={16} minPointSize={4}>
                                        {subtopicsData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                                        <LabelList dataKey="value" position="right" style={{ fill: '#ffffff', fontSize: 10, fontWeight: 'bold' }} offset={8} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full min-h-[220px] flex flex-col items-center justify-center bg-slate-950/30 rounded-2xl border border-slate-800/50 p-6 text-slate-500 text-sm text-center">
                                <span className="text-4xl mb-2">{hasData ? '🎉' : '⏳'}</span>
                                <p className="font-bold text-slate-300 mb-1">{hasData ? 'Sem assuntos críticos!' : 'Nenhum dado registrado'}</p>
                                <p className="text-xs text-slate-500">{hasData ? 'Nenhum erro registrado neste período.' : 'Registre simulados para visualizar este gráfico.'}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
});

