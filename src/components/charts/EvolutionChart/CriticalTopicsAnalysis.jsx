import React, { useState, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, LabelList, Cell
} from "recharts";
import { normalizeDate } from "../../../utils/dateHelper";
import { getSafeScore } from "../../../utils/scoreHelper";

const CustomTooltipStyle = {
    backgroundColor: '#0a0f1e',
    border: '1px solid rgba(99,102,241,0.25)',
    borderRadius: '12px',
    padding: '10px 14px',
    fontSize: '12px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
};

export const CriticalTopicsAnalysis = React.memo(({ categories = [], maxScore = 100 }) => {
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
            dateLabel: `${format(start)}—${format(end)}`
        };
    }, [selectedWeekOffset]);

    const WEEKS = [
        { label: "SEMANA 4", offset: 4 },
        { label: "SEMANA 3", offset: 3 },
        { label: "SEMANA 2", offset: 2 },
        { label: "SEMANA 1", offset: 1 },
        { label: "SEMANA ATUAL", offset: 0 },
    ];

    const subtopicsData = useMemo(() => {
        if (!categories || !categories.length) return [];
        const topicMap = {};

        categories.forEach(cat => {
            const history = cat.simuladoStats?.history || [];
            if (!history.length) return;

            const recentHistory = history.filter(h => {
                const d = normalizeDate(h.date);
                return d && d >= startDate && d <= endDate;
            });

            for (let i = 0; i < recentHistory.length; i++) {
                const h = recentHistory[i];

                (h.topics || []).forEach(t => {
                    const n = String(t.name || '').trim();
                    if (!n) return;
                    const key = n.toLowerCase();
                    if (!topicMap[key]) topicMap[key] = { name: n, total: 0, correct: 0, criticidade: 0 };

                    const total = parseInt(t.total, 10) || 0;
                    if (total === 0) return;
                    const correctCount = (t.isPercentage && t.score != null && total > 0)
                        ? Math.round((Math.min(100, Math.max(0, Number(t.score))) / 100) * total)
                        : (t.correct != null ? parseInt(t.correct, 10) : Math.round((getSafeScore(t, maxScore) / maxScore) * total));

                    topicMap[key].total += total;
                    topicMap[key].correct += correctCount;
                });
            }
        });

        // Calcular criticidade final consolidada por tópico
        Object.keys(topicMap).forEach(key => {
            const item = topicMap[key];
            const accuracy = item.total > 0 ? item.correct / item.total : 0;
            const erroAbsoluto = item.total - item.correct;
            // Índice de Criticidade Composto: penaliza matérias com baixo rendimento mais pesadamente
            item.criticidade = erroAbsoluto * (1 - accuracy);
        });

        const PALETTE = ["#ef4444", "#f97316", "#fb923c", "#f59e0b", "#facc15"];
        const result = Object.values(topicMap)
            .filter(d => d.criticidade > 0)
            .sort((a, b) => b.criticidade - a.criticidade);

        return result.slice(0, 15).map((item, i, arr) => {
            const isLong = item.name.length > 20;
            return {
                ...item,
                name: isLong ? item.name.substring(0, 18) + '...' : item.name,
                fullName: item.name,
                value: Math.round(item.criticidade * 10) / 10, // Arredondar para 1 casa decimal para o gráfico
                fill: PALETTE[Math.min(PALETTE.length - 1, Math.floor((i / (arr.length > 1 ? arr.length - 1 : 1)) * (PALETTE.length - 1)))]
            };
        });
    }, [categories, startDate, endDate, maxScore]);

    const pointLeakageData = useMemo(() => {
        if (!categories || !categories.length) return [];
        let totalCriticidade = 0;
        const PALETTE = ["#ef4444", "#f97316", "#fb923c", "#f59e0b", "#facc15"];

        const rawData = categories.map(cat => {
            let total = 0;
            let correct = 0;
            const history = cat.simuladoStats?.history || [];

            const recentHistory = history.filter(h => {
                const d = normalizeDate(h.date);
                return d && d >= startDate && d <= endDate;
            });
            for (const h of recentHistory) {
                const t = parseInt(h.total, 10) || 0;
                if (t === 0) continue;
                const correctCount = (h.isPercentage && h.score != null && t > 0)
                    ? Math.round((Math.min(100, Math.max(0, Number(h.score))) / 100) * t)
                    : (h.correct != null ? parseInt(h.correct, 10) : Math.round((getSafeScore(h, maxScore) / maxScore) * t));
                
                total += t;
                correct += correctCount;
            }
            
            const accuracy = total > 0 ? correct / total : 0;
            const erroAbsoluto = total - correct;
            const criticidade = erroAbsoluto * (1 - accuracy);
            
            return { name: cat.name, value: criticidade, errors: erroAbsoluto };
        });

        const data = rawData.filter(d => d.value > 0).sort((a, b) => b.value - a.value);
        data.forEach(d => { totalCriticidade += d.value; });

        return data.slice(0, 10).map((item, i, arr) => {
            const isLong = item.name.length > 20;
            return {
                ...item,
                fullName: item.name,
                name: isLong ? item.name.substring(0, 18) + '...' : item.name,
                color: PALETTE[Math.min(PALETTE.length - 1, Math.floor((i / (arr.length > 1 ? arr.length - 1 : 1)) * (PALETTE.length - 1)))],
                percentage: totalCriticidade > 0 ? Math.round((item.value / totalCriticidade) * 100) : 0,
                displayValue: Math.round(item.value * 10) / 10
            };
        });
    }, [categories, startDate, endDate, maxScore]);

    const weekTitle = WEEKS.find(w => w.offset === selectedWeekOffset)?.label || "SEMANA";

    return (
        <div className="col-span-1 md:col-span-2 pt-6">
            {/* Week Selector Header */}
            <div className="flex flex-col items-center sm:items-end mb-5 pr-1">
                <div className="flex items-center gap-1 sm:gap-2 mb-2 overflow-x-auto max-w-full scrollbar-hide py-2 px-1 bg-slate-900/30 rounded-full border border-slate-800/50 shadow-inner">
                    {WEEKS.map((w, idx) => {
                        const isActive = selectedWeekOffset === w.offset;
                        return (
                            <div key={w.label} className="flex items-center">
                                {!isActive && idx !== 0 && idx !== WEEKS.findIndex(ww => ww.offset === selectedWeekOffset) - 1 && <span className="mx-1.5 text-slate-600 font-bold opacity-60">•</span>}
                                <button
                                    onClick={() => setSelectedWeekOffset(w.offset)}
                                    className={`
                                        relative px-3.5 py-1.5 text-[10px] sm:text-xs font-black tracking-widest rounded-full transition-all shrink-0
                                        ${isActive
                                            ? 'bg-gradient-to-r from-[#9d4edd] to-[#7b2cbf] text-white shadow-[0_0_20px_rgba(157,78,221,0.8)] scale-105 border border-purple-400/30 ring-1 ring-purple-500/20'
                                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 shadow-sm'
                                        }
                                    `}
                                >
                                    {w.label}
                                </button>
                            </div>
                        );
                    })}
                </div>
                <div className="text-[11px] sm:text-xs text-slate-400 font-mono tracking-widest mr-3 font-bold bg-slate-900/40 px-3 py-1 rounded-md border border-slate-800">{dateLabel}</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                {/* Matérias Críticas */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3 sm:p-5 shadow-lg hover:border-slate-700 transition-all w-full min-w-0">
                    <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">{weekTitle}</p>
                    <h3 className="text-sm sm:text-base font-bold text-slate-200 mb-1 truncate">🩸 Matérias Críticas <span className="text-slate-600 font-normal">({pointLeakageData.length})</span></h3>
                    <p className="text-[9px] sm:text-xs text-slate-500 mb-2 sm:mb-4">Disciplinas com maior Índice de Criticidade (Erros x Ineficiência).</p>
                    <div className="min-h-[220px] sm:min-h-[260px] w-full">
                        {pointLeakageData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={Math.max(220, pointLeakageData.length * 36)}>
                                <BarChart data={pointLeakageData} layout="vertical" margin={{ top: 0, right: 30, left: -10, bottom: 0 }}>
                                    <CartesianGrid stroke="rgba(255,255,255,0.1)" horizontal={false} />
                                    <XAxis type="number" stroke="#ffffff" tick={{ fontSize: 10, fill: '#ffffff' }} axisLine={{ stroke: 'rgba(255,255,255,0.2)' }} tickLine={{ stroke: 'rgba(255,255,255,0.2)' }} allowDecimals={false} />
                                    <YAxis type="category" dataKey="name" stroke="#ffffff" tick={{ fontSize: 9, fill: '#ffffff' }} axisLine={{ stroke: 'rgba(255,255,255,0.2)' }} tickLine={{ stroke: 'rgba(255,255,255,0.2)' }} width={80} />
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
                            <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-slate-500 text-sm italic text-center px-4">
                                <span className="text-4xl mb-3">🎉</span>
                                Nenhum erro registrado neste período!
                            </div>
                        )}
                    </div>
                </div>

                {/* Assuntos Críticos */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3 sm:p-5 shadow-lg hover:border-slate-700 transition-all w-full min-w-0">
                    <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider mb-1 truncate">{weekTitle} · todos os assuntos</p>
                    <h3 className="text-sm sm:text-base font-bold text-slate-200 mb-1 truncate">📏 Assuntos Críticos <span className="text-slate-600 font-normal">({subtopicsData.length})</span></h3>
                    <p className="text-[9px] sm:text-[11px] text-slate-500 mb-2 sm:mb-4">Tópicos com maior Índice de Criticidade (Erros x Ineficiência).</p>
                    <div className="min-h-[220px] sm:min-h-[260px] w-full">
                        {subtopicsData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={Math.max(220, subtopicsData.length * 36)}>
                                <BarChart data={subtopicsData} layout="vertical" margin={{ top: 0, right: 30, left: -5, bottom: 0 }}>
                                    <CartesianGrid stroke="rgba(255,255,255,0.1)" horizontal={false} />
                                    <XAxis type="number" stroke="#ffffff" tick={{ fontSize: 10, fill: '#ffffff' }} axisLine={{ stroke: 'rgba(255,255,255,0.2)' }} tickLine={{ stroke: 'rgba(255,255,255,0.2)' }} allowDecimals={false} />
                                    <YAxis type="category" dataKey="name" stroke="#ffffff" tick={{ fontSize: 9, fill: '#ffffff' }} axisLine={{ stroke: 'rgba(255,255,255,0.2)' }} tickLine={{ stroke: 'rgba(255,255,255,0.2)' }} width={85} />
                                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} formatter={(v, n, props) => [`${v} (Índice)`, `${props?.payload?.fullName || 'Assunto'} (${props?.payload?.total - props?.payload?.correct || 0} erros)`]} contentStyle={CustomTooltipStyle} itemStyle={{ color: '#e2e8f0' }} />
                                    <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={16} minPointSize={4}>
                                        {subtopicsData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                                        <LabelList dataKey="value" position="right" style={{ fill: '#ffffff', fontSize: 10, fontWeight: 'bold' }} offset={8} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-slate-500 text-sm italic text-center px-4">
                                <span className="text-4xl mb-3">🎉</span>
                                Nenhum erro registrado neste período!
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
});
