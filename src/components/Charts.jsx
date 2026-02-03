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
    LineChart,
    Line,
    Area,
    AreaChart,
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="glass p-3 text-sm">
                <p className="font-semibold">{label}</p>
                <p className="text-purple-400">{payload[0].value} tarefas</p>
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

    return (
        <div className={`grid grid-cols-1 ${compact ? 'lg:grid-cols-1' : 'lg:grid-cols-2'} gap-6`}>
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
                            {pieData.map((entry, index) => (
                                <div key={index} className="flex items-center gap-2 text-sm">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                                    <span className="text-slate-400">{entry.name.split(' ')[0]}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Bar Chart - Progress per Category */}
                    <div className="glass p-6">
                        <h3 className="text-lg font-bold mb-4">Progresso por Matéria</h3>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={barData} barCategoryGap="20%">
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 12 }} />
                                <YAxis stroke="#64748b" tick={{ fontSize: 12 }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="total" fill="rgba(255,255,255,0.1)" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="completed" fill="url(#barGradient)" radius={[4, 4, 0, 0]} />
                                <defs>
                                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#a855f7" />
                                        <stop offset="100%" stopColor="#3b82f6" />
                                    </linearGradient>
                                </defs>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </>
            )}


        </div>
    );
}
