import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const total = data.total !== undefined ? data.total : data.value;
        const completed = data.completed || 0;
        const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

        return (
            <div className="bg-slate-900/90 border border-white/10 p-4 rounded-xl shadow-2xl backdrop-blur-md text-sm min-w-[180px]">
                <p className="font-bold text-white mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: data.color || '#a855f7' }} />
                    {label || data.name}
                </p>
                <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Total:</span>
                        <span className="font-mono text-slate-200">{total} tarefas</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Concluído:</span>
                        <span className="font-mono text-purple-400 font-bold">{completed} <span className="text-slate-500 text-[10px] ml-1">({pct}%)</span></span>
                    </div>
                </div>
            </div>
        );
    }
    return null;
};

export default function Charts({ data, compact = false }) {
    // Ensure categories exists from data prop or fallback
    const categories = data?.categories || [];

    // Pie chart data - tasks per category
    const pieData = categories.map(cat => ({
        name: cat.name,
        value: cat.tasks.length,
        total: cat.tasks.length,
        completed: cat.tasks.filter(t => t.completed).length,
        color: cat.color,
    }));

    // Bar chart data - completed vs total per category
    const barData = categories.map(cat => ({
        name: cat.name.split(' ')[0], // Shortened name
        total: cat.tasks.length,
        completed: cat.tasks.filter(t => t.completed).length,
        color: cat.color,
    }));

    // Simulated weekly progress data (Unused)
    // const weeklyData = [ ... ];

    // Check if there is any data to display
    const hasData = pieData.reduce((acc, curr) => acc + curr.value, 0) > 0;

    if (!hasData) {
        return (
            <div className={`grid grid-cols-1 ${compact ? 'lg:grid-cols-1' : 'lg:grid-cols-2'} gap-6`}>
                <div className="glass p-8 flex flex-col items-center justify-center text-slate-500 col-span-full min-h-[250px]">
                    <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mb-4">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 20V10" />
                            <path d="M18 20V4" />
                            <path d="M6 20v-4" />
                        </svg>
                    </div>
                    <p className="font-bold">Sem dados para gráficos</p>
                    <p className="text-xs mt-1">Adicione tarefas para visualizar estatísticas.</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`grid grid-cols-1 ${compact ? 'lg:grid-cols-1' : 'lg:grid-cols-2'} gap-6`}>
            {/* SVG Gradient Defs - always rendered so the gradient is available */}
            <svg width="0" height="0" className="hidden">
                <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#a855f7" />
                        <stop offset="100%" stopColor="#3b82f6" />
                    </linearGradient>
                </defs>
            </svg>

            {!compact && (
                <>
                    {/* Pie Chart - Category Distribution */}
                    <div className="glass p-6">
                        <h3 className="text-lg font-bold mb-4">Distribuição por Matéria</h3>
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={3}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Legend */}
                        <div className="flex flex-wrap gap-3 justify-center mt-4">
                            {pieData.map((entry) => (
                                <div key={entry.name} className="flex items-center gap-2 text-sm">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                                    <span className="text-slate-400">{entry.name.split(' ')[0]}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {/* Bar Chart - Progress per Category (shown in both modes) */}
            <div className="glass p-6">
                <h3 className="text-lg font-bold mb-4">Progresso por Matéria</h3>
                <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={barData} barCategoryGap="20%">
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11, fontWeight: 600 }} tickLine={false} axisLine={false} />
                        <YAxis stroke="#64748b" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(val) => Math.round(val)} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                        <Bar dataKey="total" fill="rgba(255,255,255,0.05)" radius={[6, 6, 0, 0]} barSize={24} />
                        <Bar dataKey="completed" fill="url(#barGradient)" radius={[6, 6, 0, 0]} barSize={24} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
