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

export function CriticalTopicsAnalysis({ categories = [] }) {
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
                    if (!topicMap[key]) topicMap[key] = { name: n, errors: 0 };
                    
                    const total = Number.isFinite(parseInt(t.total, 10)) ? parseInt(t.total, 10) : 10;
                    const correctCount = t.isPercentage && t.total
                        ? Math.round((parseInt(t.correct, 10) / 100) * parseInt(t.total, 10))
                        : (t.correct != null ? parseInt(t.correct, 10) : Math.round((getSafeScore(t) / 100) * total));
                    
                    topicMap[key].errors += Math.max(0, total - correctCount);
                });
            }
        });

        const PALETTE = ["#ef4444", "#f97316", "#fb923c", "#f59e0b", "#facc15"];
        const result = Object.values(topicMap)
            .filter(d => d.errors > 0)
            .sort((a, b) => b.errors - a.errors);

        return result.slice(0, 15).map((item, i, arr) => {
            const isLong = item.name.length > 20;
            return {
                ...item,
                name: isLong ? item.name.substring(0, 18) + '...' : item.name,
                fullName: item.name,
                value: item.errors,
                fill: PALETTE[Math.min(PALETTE.length - 1, Math.floor((i / (arr.length > 1 ? arr.length - 1 : 1)) * (PALETTE.length - 1)))]
            };
        });
    }, [categories, startDate, endDate]);

    const pointLeakageData = useMemo(() => {
        if (!categories || !categories.length) return [];
        let totalErrors = 0;
        const PALETTE = ["#ef4444", "#f97316", "#fb923c", "#f59e0b", "#facc15"];
        
        const rawData = categories.map(cat => {
            let errors = 0;
            const history = cat.simuladoStats?.history || [];
            
            const recentHistory = history.filter(h => {
                const d = normalizeDate(h.date);
                return d && d >= startDate && d <= endDate;
            });
            for (const h of recentHistory) {
                const total = parseInt(h.total, 10) || 10;
                const correctCount = h.isPercentage && h.total
                    ? Math.round((parseInt(h.correct, 10) / 100) * parseInt(h.total, 10))
                    : (h.correct != null ? parseInt(h.correct, 10) : Math.round((getSafeScore(h) / 100) * total));
                errors += Math.max(0, total - correctCount);
            }
            totalErrors += errors;
            return { name: cat.name, value: errors };
        });

        const data = rawData.filter(d => d.value > 0).sort((a, b) => b.value - a.value);
        return data.slice(0, 10).map((item, i, arr) => {
            const isLong = item.name.length > 20;
            return {
                ...item,
                fullName: item.name,
                name: isLong ? item.name.substring(0, 18) + '...' : item.name,
                color: PALETTE[Math.min(PALETTE.length - 1, Math.floor((i / (arr.length > 1 ? arr.length - 1 : 1)) * (PALETTE.length - 1)))],
                percentage: totalErrors > 0 ? Math.round((item.value / totalErrors) * 100) : 0
            };
        });
    }, [categories, startDate, endDate]);

    const weekTitle = WEEKS.find(w => w.offset === selectedWeekOffset)?.label || "SEMANA";

    return (
        <div className="col-span-1 md:col-span-2 pt-6">
            {/* Week Selector Header */}
            <div className="flex flex-col items-center sm:items-end mb-4 pr-1">
                <div className="flex items-center gap-1 sm:gap-2 mb-1 overflow-x-auto max-w-full scrollbar-hide py-1">
                    {WEEKS.map(w => {
                        const isActive = selectedWeekOffset === w.offset;
                        return (
                            <button
                                key={w.label}
                                onClick={() => setSelectedWeekOffset(w.offset)}
                                className={`
                                    relative px-3 py-1.5 text-[9px] sm:text-[10px] font-black tracking-widest rounded-full transition-all shrink-0
                                    ${isActive 
                                        ? 'bg-gradient-to-r from-[#9d4edd] to-[#7b2cbf] text-white shadow-[0_0_15px_rgba(157,78,221,0.5)]' 
                                        : 'text-slate-500 hover:text-slate-400'
                                    }
                                `}
                            >
                                {!isActive && <span className="mr-1.5 text-slate-700 font-normal opacity-50">•</span>}
                                {w.label}
                                {isActive && (
                                    <div className="absolute inset-0 rounded-full border border-white/20" />
                                )}
                            </button>
                        );
                    })}
                </div>
                <div className="text-[10px] sm:text-xs text-slate-500 font-mono tracking-widest mr-2">{dateLabel}</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                {/* Matérias Críticas */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3 sm:p-5 shadow-lg hover:border-slate-700 transition-all w-full min-w-0">
                    <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">{weekTitle}</p>
                    <h3 className="text-sm sm:text-base font-bold text-slate-200 mb-1 truncate">🩸 Matérias Críticas <span className="text-slate-600 font-normal">({pointLeakageData.length})</span></h3>
                    <p className="text-[9px] sm:text-xs text-slate-500 mb-2 sm:mb-4">Erros absolutos por disciplina neste período.</p>
                    <div className="min-h-[220px] sm:min-h-[260px] w-full">
                        {pointLeakageData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={Math.max(220, pointLeakageData.length * 36)}>
                                <BarChart data={pointLeakageData} layout="vertical" margin={{ top: 0, right: 30, left: -10, bottom: 0 }}>
                                    <CartesianGrid stroke="rgba(255,255,255,0.1)" horizontal={false} />
                                    <XAxis type="number" stroke="#ffffff" tick={{ fontSize: 10, fill: '#ffffff' }} axisLine={{ stroke: 'rgba(255,255,255,0.2)' }} tickLine={{ stroke: 'rgba(255,255,255,0.2)' }} allowDecimals={false} />
                                    <YAxis type="category" dataKey="name" stroke="#ffffff" tick={{ fontSize: 9, fill: '#ffffff' }} axisLine={{ stroke: 'rgba(255,255,255,0.2)' }} tickLine={{ stroke: 'rgba(255,255,255,0.2)' }} width={80} />
                                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} formatter={(v, n, props) => [`${v} erros`, props?.payload?.fullName || 'Matéria']} contentStyle={CustomTooltipStyle} itemStyle={{ color: '#e2e8f0' }} />
                                    <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={16} minPointSize={4}>
                                        {pointLeakageData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                        <LabelList dataKey="value" position="right" offset={8}
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
                    <p className="text-[9px] sm:text-[11px] text-slate-500 mb-2 sm:mb-4">Tópicos de todas as matérias com mais erros absolutos.</p>
                    <div className="min-h-[220px] sm:min-h-[260px] w-full">
                        {subtopicsData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={Math.max(220, subtopicsData.length * 36)}>
                                <BarChart data={subtopicsData} layout="vertical" margin={{ top: 0, right: 30, left: -5, bottom: 0 }}>
                                    <CartesianGrid stroke="rgba(255,255,255,0.1)" horizontal={false} />
                                    <XAxis type="number" stroke="#ffffff" tick={{ fontSize: 10, fill: '#ffffff' }} axisLine={{ stroke: 'rgba(255,255,255,0.2)' }} tickLine={{ stroke: 'rgba(255,255,255,0.2)' }} allowDecimals={false} />
                                    <YAxis type="category" dataKey="name" stroke="#ffffff" tick={{ fontSize: 9, fill: '#ffffff' }} axisLine={{ stroke: 'rgba(255,255,255,0.2)' }} tickLine={{ stroke: 'rgba(255,255,255,0.2)' }} width={85} />
                                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} formatter={(v, n, props) => [`${v} erros`, props?.payload?.fullName || 'Assunto']} contentStyle={CustomTooltipStyle} itemStyle={{ color: '#e2e8f0' }} />
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
}
