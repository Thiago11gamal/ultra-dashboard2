import React from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, LabelList, Cell
} from "recharts";

const CustomTooltipStyle = {
    backgroundColor: '#0a0f1e',
    border: '1px solid rgba(99,102,241,0.25)',
    borderRadius: '12px',
    padding: '10px 14px',
    fontSize: '12px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
};

export function CriticalTopicsAnalysis({ pointLeakageData, subtopicsData }) {
    return (
        <>
            {/* Matérias Críticas */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3 sm:p-5 shadow-lg hover:border-slate-700 transition-all w-full min-w-0">
                <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Última semana</p>
                <h3 className="text-sm sm:text-base font-bold text-slate-200 mb-1 truncate">🩸 Matérias Críticas <span className="text-slate-600 font-normal">({pointLeakageData.length})</span></h3>
                <p className="text-[9px] sm:text-xs text-slate-500 mb-2 sm:mb-4">Erros absolutos por disciplina nos últimos 7 dias.</p>
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
                            Nenhum erro registrado esta semana!
                        </div>
                    )}
                </div>
            </div>

            {/* Assuntos Críticos */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3 sm:p-5 shadow-lg hover:border-slate-700 transition-all w-full min-w-0">
                <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider mb-1 truncate">Última semana · todos os assuntos</p>
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
                            Nenhum erro registrado esta semana!
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
