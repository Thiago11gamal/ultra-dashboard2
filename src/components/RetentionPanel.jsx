import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { BrainCircuit, Clock, AlertTriangle, CheckCircle2, TrendingDown, Zap, Calendar, ArrowRight, ChevronDown, ChevronUp, BookOpen, RefreshCw, Play } from 'lucide-react';

// Calculate retention based on Ebbinghaus Forgetting Curve
const calculateRetention = (lastStudiedAt) => {
    if (!lastStudiedAt) return { val: 0, status: 'never', label: 'Nunca estudado', color: 'text-slate-400', bg: 'bg-slate-500', border: 'border-slate-500/30' };

    const last = new Date(lastStudiedAt).getTime();
    const diffHours = (Date.now() - last) / (1000 * 60 * 60);
    const days = diffHours / 24;
    const val = Math.round(100 * Math.exp(-days / 3));

    if (val >= 80) return { val, status: 'fresh', label: 'Ótimo', color: 'text-emerald-400', bg: 'bg-emerald-500', border: 'border-emerald-500/30' };
    if (val >= 60) return { val, status: 'good', label: 'Bom', color: 'text-green-400', bg: 'bg-green-500', border: 'border-green-500/30' };
    if (val >= 40) return { val, status: 'warning', label: 'Atenção', color: 'text-yellow-400', bg: 'bg-yellow-500', border: 'border-yellow-500/30' };
    if (val >= 20) return { val, status: 'danger', label: 'Crítico', color: 'text-orange-400', bg: 'bg-orange-500', border: 'border-orange-500/30' };
    return { val, status: 'critical', label: 'Urgente!', color: 'text-red-400', bg: 'bg-red-500', border: 'border-red-500/30' };
};

// Format time ago
const formatTimeAgo = (date) => {
    if (!date) return 'Nunca';
    const diff = Date.now() - new Date(date).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return 'Agora há pouco';
    if (hours < 24) return `${hours}h atrás`;
    if (days === 1) return 'Ontem';
    if (days < 7) return `${days} dias atrás`;
    if (days < 30) return `${Math.floor(days / 7)} semanas atrás`;
    return `${Math.floor(days / 30)} meses atrás`;
};

// Retention Ring Component
const RetentionRing = ({ value, size = 48, strokeWidth = 3, color }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (value / 100) * circumference;

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg className="w-full h-full -rotate-90">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    className="text-slate-700/50"
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    className={color}
                    style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-xs font-bold ${color}`}>{value}%</span>
            </div>
        </div>
    );
};

// Mini retention bar for topics
const RetentionBar = ({ value, bg }) => (
    <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div
            className={`h-full rounded-full transition-all duration-500 ${bg}`}
            style={{ width: `${value}%` }}
        />
    </div>
);

export default function RetentionPanel({ categories = [], onSelectCategory }) {
    const [expandedCategories, setExpandedCategories] = useState({});

    // Auto-refresh tick every 60 seconds to recalculate retention
    const [tick, setTick] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setTick(t => t + 1);
        }, 60000); // Update every 60 seconds

        return () => clearInterval(interval);
    }, []);

    const toggleExpand = (catId) => {
        setExpandedCategories(prev => ({
            ...prev,
            [catId]: !prev[catId]
        }));
    };

    // Helper to get style from value - moved before useMemo that uses it
    const getRetentionStyle = useCallback((val) => {
        if (val >= 80) return { status: 'fresh', label: 'Ótimo', color: 'text-emerald-400', bg: 'bg-emerald-500', border: 'border-emerald-500/30' };
        if (val >= 60) return { status: 'good', label: 'Bom', color: 'text-green-400', bg: 'bg-green-500', border: 'border-green-500/30' };
        if (val >= 40) return { status: 'warning', label: 'Atenção', color: 'text-yellow-400', bg: 'bg-yellow-500', border: 'border-yellow-500/30' };
        if (val >= 20) return { status: 'danger', label: 'Crítico', color: 'text-orange-400', bg: 'bg-orange-500', border: 'border-orange-500/30' };
        return { status: 'critical', label: 'Urgente!', color: 'text-red-400', bg: 'bg-red-500', border: 'border-red-500/30' };
    }, []);

    // Calculate retention for all categories and their tasks
    const retentionData = useMemo(() => {
        return categories
            .map(cat => {
                // Calculate retention for each task
                const tasksWithRetention = (cat.tasks || []).map(task => ({
                    ...task,
                    retention: calculateRetention(task.lastStudiedAt || task.completedAt),
                    timeAgo: formatTimeAgo(task.lastStudiedAt || task.completedAt)
                }));

                // Sort tasks by retention (lowest first = needs review most)
                tasksWithRetention.sort((a, b) => a.retention.val - b.retention.val);

                // Category retention is the average of all task retentions, or category lastStudiedAt
                const avgTaskRetention = tasksWithRetention.length > 0
                    ? Math.round(tasksWithRetention.reduce((acc, t) => acc + t.retention.val, 0) / tasksWithRetention.length)
                    : null;

                // Use category-level lastStudiedAt if no task data, otherwise use average
                // Fallback to 0/never if both are missing
                const categoryRetention = avgTaskRetention !== null
                    ? { ...calculateRetention(null), val: avgTaskRetention, ...getRetentionStyle(avgTaskRetention) }
                    : calculateRetention(cat.lastStudiedAt || null);

                return {
                    ...cat,
                    retention: categoryRetention,
                    timeAgo: formatTimeAgo(cat.lastStudiedAt),
                    tasksWithRetention,
                    criticalTasks: tasksWithRetention.filter(t => t.retention.val < 40).length,
                    warningTasks: tasksWithRetention.filter(t => t.retention.val >= 40 && t.retention.val < 60).length
                };
            })
            .sort((a, b) => a.retention.val - b.retention.val);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [categories, tick, getRetentionStyle]); // tick forces periodic recalculation

    // Stats summary
    const stats = useMemo(() => {
        // Count all tasks across all categories
        let allTasks = [];
        retentionData.forEach(cat => {
            allTasks = [...allTasks, ...cat.tasksWithRetention];
        });

        const critical = allTasks.filter(t => t.retention.val < 40).length;
        const warning = allTasks.filter(t => t.retention.val >= 40 && t.retention.val < 60).length;
        const healthy = allTasks.filter(t => t.retention.val >= 60).length;
        const avgRetention = allTasks.length > 0
            ? Math.round(allTasks.reduce((acc, t) => acc + t.retention.val, 0) / allTasks.length)
            : 0;
        return { critical, warning, healthy, avgRetention, totalTasks: allTasks.length, totalCategories: retentionData.length };
    }, [retentionData]);

    // Get priority items (need review)
    const needsReview = useMemo(() => {
        let urgent = [];
        retentionData.forEach(cat => {
            cat.tasksWithRetention.forEach(task => {
                if (task.retention.val < 60) {
                    urgent.push({ ...task, categoryName: cat.name, categoryIcon: cat.icon, categoryColor: cat.color });
                }
            });
        });
        return urgent.sort((a, b) => a.retention.val - b.retention.val);
    }, [retentionData]);

    return (
        <div className="w-full space-y-8 pt-4 pb-12 animate-fade-in-down">
            {/* Header */}
            <div className="flex items-center gap-5 px-1">
                <div className="relative">
                    <div className="absolute inset-0 bg-purple-500/30 rounded-2xl blur-xl"></div>
                    <div className="relative p-3.5 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 rounded-2xl border border-purple-500/30">
                        <BrainCircuit size={32} className="text-purple-400" />
                    </div>
                </div>
                <div>
                    <h2 className="text-2xl font-black bg-gradient-to-r from-white via-white to-slate-400 bg-clip-text text-transparent uppercase tracking-tight">
                        Painel de Retenção
                    </h2>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-0.5 opacity-80">
                        Baseado na Curva de Esquecimento de Ebbinghaus
                    </p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Average Retention */}
                <div className="glass p-6 border-l-4 border-purple-500 relative overflow-hidden group hover:border-purple-400 transition-all duration-500 min-h-[150px] flex flex-col justify-between">
                    <BrainCircuit size={70} className="absolute -right-6 -bottom-6 text-purple-500/10 group-hover:text-purple-500/20 transition-all duration-700" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 text-slate-500 text-[10px] font-black uppercase tracking-[0.15em] mb-3">
                            <BrainCircuit size={12} className="text-purple-500" />
                            Média Geral
                        </div>
                        <div className="text-4xl font-black text-white mb-2 tracking-tighter">{stats.avgRetention}%</div>
                    </div>

                    <div className="relative z-10">
                        {/* Progress Bar */}
                        <div className="h-1.5 bg-slate-950/50 rounded-full overflow-hidden mb-2 border border-white/5">
                            <div className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full shadow-[0_0_8px_rgba(168,85,247,0.4)]" style={{ width: `${stats.avgRetention}%` }} />
                        </div>
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{stats.totalTasks} assuntos</div>
                    </div>
                </div>

                {/* Critical */}
                <div className="glass p-6 border-l-4 border-red-500 relative overflow-hidden group hover:border-red-400 transition-all duration-500 min-h-[150px] flex flex-col">
                    <AlertTriangle size={70} className="absolute -right-6 -bottom-6 text-red-500/10 group-hover:text-red-500/20 transition-all duration-700" />
                    <div className="relative z-10 mb-auto">
                        <div className="flex items-center gap-2 text-slate-500 text-[10px] font-black uppercase tracking-[0.15em] mb-3">
                            <AlertTriangle size={12} className="text-red-500" />
                            Críticos
                        </div>
                        <div className="text-4xl font-black text-red-400 tracking-tighter drop-shadow-[0_0_10px_rgba(239,68,68,0.2)]">{stats.critical}</div>
                    </div>
                    <div className="relative z-10 text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-2">
                        precisam de revisão
                    </div>
                </div>

                {/* Warning */}
                <div className="glass p-6 border-l-4 border-yellow-500 relative overflow-hidden group hover:border-yellow-400 transition-all duration-500 min-h-[150px] flex flex-col">
                    <TrendingDown size={70} className="absolute -right-6 -bottom-6 text-yellow-500/10 group-hover:text-yellow-500/20 transition-all duration-700" />
                    <div className="relative z-10 mb-auto">
                        <div className="flex items-center gap-2 text-slate-500 text-[10px] font-black uppercase tracking-[0.15em] mb-3">
                            <TrendingDown size={12} className="text-yellow-500" />
                            Atenção
                        </div>
                        <div className="text-4xl font-black text-yellow-500 tracking-tighter drop-shadow-[0_0_10px_rgba(234,179,8,0.2)]">{stats.warning}</div>
                    </div>
                    <div className="relative z-10 text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-2">
                        em declínio
                    </div>
                </div>

                {/* Healthy */}
                <div className="glass p-6 border-l-4 border-emerald-500 relative overflow-hidden group hover:border-emerald-400 transition-all duration-500 min-h-[150px] flex flex-col">
                    <CheckCircle2 size={70} className="absolute -right-6 -bottom-6 text-emerald-500/10 group-hover:text-emerald-500/20 transition-all duration-700" />
                    <div className="relative z-10 mb-auto">
                        <div className="flex items-center gap-2 text-slate-500 text-[10px] font-black uppercase tracking-[0.15em] mb-3">
                            <CheckCircle2 size={12} className="text-emerald-500" />
                            Saudáveis
                        </div>
                        <div className="text-4xl font-black text-emerald-400 tracking-tighter drop-shadow-[0_0_10px_rgba(52,211,153,0.2)]">{stats.healthy}</div>
                    </div>
                    <div className="relative z-10 text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-2">
                        excelente
                    </div>
                </div>
            </div>

            {/* Priority Alert Box */}
            {needsReview.length > 0 && (
                <div className="relative rounded-2xl overflow-hidden shadow-2xl group">
                    <div className="absolute inset-0 bg-gradient-to-br from-red-950/60 via-slate-900/40 to-orange-950/40"></div>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(239,68,68,0.15),transparent_50%)] transition-opacity duration-700 group-hover:opacity-60"></div>
                    <div className="relative p-7 border border-red-500/20 rounded-2xl">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-red-500/10 rounded-2xl border border-red-500/20 shadow-inner">
                                    <Zap size={24} className="text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]" />
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-red-400 uppercase tracking-[0.1em]">
                                        Revisão Necessária
                                    </h3>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                                        {needsReview.length} {needsReview.length > 1 ? 'tópicos' : 'tópico'} com retenção abaixo de 60%
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2 md:justify-end max-w-xl">
                                {needsReview.slice(0, 5).map((task) => (
                                    <div key={task.id || task.title} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black border transition-all duration-300 hover:scale-105 ${task.retention.border} ${task.retention.color} bg-black/40 backdrop-blur-sm`}>
                                        <span className="opacity-70">{task.categoryIcon}</span>
                                        <span className="uppercase tracking-tight truncate max-w-[120px]">{task.title || task.text || 'Sem nome'}</span>
                                        <span className="ml-1 bg-white/5 px-1.5 py-0.5 rounded-md">{task.retention.val}%</span>
                                    </div>
                                ))}
                                {needsReview.length > 5 && (
                                    <div className="px-3 py-1.5 rounded-xl text-[10px] font-black text-slate-500 bg-slate-950/60 border border-white/5 uppercase tracking-widest">
                                        +{needsReview.length - 5} mais
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Categories List with Expandable Topics */}
            <div className="bg-slate-950/40 backdrop-blur-xl rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
                <div className="p-7 border-b border-white/5 bg-slate-900/30">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-3">
                        <div className="p-1.5 rounded-lg bg-slate-800 text-slate-400">
                            <Calendar size={14} />
                        </div>
                        Matérias & Tópicos de Estudo
                        <span className="ml-auto text-[10px] lowercase font-medium opacity-60">
                            ({stats.totalCategories} matérias, {stats.totalTasks} assuntos)
                        </span>
                    </h3>
                </div>

                <div className="divide-y divide-white/[0.03]">
                    {retentionData.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-20 opacity-20">
                            <BrainCircuit size={48} className="text-slate-500 mb-4" />
                            <span className="text-sm font-black uppercase tracking-widest">Nenhuma matéria encontrada</span>
                        </div>
                    ) : (
                        retentionData.map((cat) => {
                            const isExpanded = expandedCategories[cat.id];
                            const hasTasks = cat.tasksWithRetention.length > 0;

                            return (
                                <div key={cat.id} className="transition-all duration-500">
                                    {/* Category Header */}
                                    <div
                                        className={`group p-6 cursor-pointer transition-all duration-500 hover:bg-white/[0.02]
                                            ${cat.retention.val < 40
                                                ? 'bg-gradient-to-r from-red-500/[0.03] to-transparent'
                                                : cat.retention.val < 60
                                                    ? 'bg-gradient-to-r from-yellow-500/[0.02] to-transparent'
                                                    : ''
                                            }`}
                                        onClick={() => hasTasks && toggleExpand(cat.id)}
                                    >
                                        <div className="flex items-center gap-6">
                                            {/* Icon */}
                                            <div
                                                className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0 transition-transform duration-500 group-hover:scale-110 shadow-lg border border-white/5"
                                                style={{ backgroundColor: `${cat.color}15`, borderColor: `${cat.color}30` }}
                                            >
                                                {cat.icon}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-3 mb-1.5">
                                                    <h4 className="text-base font-black text-white uppercase tracking-tight truncate">{cat.name}</h4>
                                                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm ${cat.retention.bg}/10 ${cat.retention.color} border ${cat.retention.border}`}>
                                                        {cat.retention.label === 'Urgente!' ? 'Crítico' : cat.retention.label}
                                                    </span>
                                                    {cat.criticalTasks > 0 && (
                                                        <span className="px-2 py-0.5 rounded-lg text-[9px] font-black bg-red-500/10 text-red-500 border border-red-500/20 shadow-sm uppercase tracking-tighter">
                                                            {cat.criticalTasks} {cat.criticalTasks > 1 ? 'críticos' : 'crítico'}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-4 text-[10px] text-slate-500 font-bold uppercase tracking-widest opacity-80">
                                                    <span className="flex items-center gap-1.5">
                                                        <BookOpen size={12} className="text-slate-600" />
                                                        {cat.tasksWithRetention.length} assuntos
                                                    </span>
                                                    <span className="text-slate-800">•</span>
                                                    <span className="flex items-center gap-1.5 focus:text-slate-300 transition-colors">
                                                        <Clock size={12} className="text-slate-600" />
                                                        {cat.timeAgo === 'Nunca' ? 'Inédito' : cat.timeAgo}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Retention Ring Container */}
                                            <div className="flex items-center gap-6">
                                                <div className="hidden sm:block">
                                                    <RetentionRing
                                                        value={cat.retention.val}
                                                        color={cat.retention.color}
                                                    />
                                                </div>

                                                {/* Expand Arrow */}
                                                {hasTasks && (
                                                    <div className={`p-2 rounded-xl bg-slate-900 border border-white/5 transition-all duration-500 ${isExpanded ? 'rotate-180 bg-slate-800 border-white/10' : ''}`}>
                                                        <ChevronDown size={18} className="text-slate-500" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Progress Bar Mini */}
                                        <div className="mt-5 h-1.5 bg-slate-950/50 rounded-full overflow-hidden border border-white/5">
                                            <div
                                                className={`h-full rounded-full transition-all duration-1000 ${cat.retention.bg} shadow-[0_0_8px_rgba(0,0,0,0.3)]`}
                                                style={{ width: `${cat.retention.val}%` }}
                                            ></div>
                                        </div>
                                    </div>

                                    {/* Expanded Topics Container */}
                                    {isExpanded && hasTasks && (
                                        <div className="bg-black/20 border-t border-white/5 animate-fade-in-down">
                                            <div className="p-4 space-y-2">
                                                {cat.tasksWithRetention.map((task, index) => (
                                                    <div
                                                        key={task.id || `${task.title}-${index}`}
                                                        className={`flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 hover:bg-white/[0.03] group/item border border-transparent hover:border-white/5
                                                            ${task.retention.val < 40 ? 'bg-red-500/[0.03]' : task.retention.val < 60 ? 'bg-yellow-500/[0.02]' : ''}`}
                                                        onClick={() => onSelectCategory?.({ ...cat, selectedTask: task })}
                                                    >
                                                        {/* Task Icon Circle */}
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm shrink-0 transition-transform group-hover/item:scale-110 shadow-lg ${task.retention.bg}/10 ${task.retention.color} border ${task.retention.border}`}>
                                                            <BookOpen size={16} />
                                                        </div>

                                                        {/* Task Info */}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-black text-slate-200 uppercase tracking-tight truncate">{task.title || task.text || 'Sem nome'}</p>
                                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                                                                {task.timeAgo === 'Nunca' ? 'Aguardando estudo' : `Última revisão: ${task.timeAgo}`}
                                                            </p>
                                                        </div>

                                                        {/* Percentage & Bar */}
                                                        <div className="flex items-center gap-6">
                                                            <div className="hidden md:block">
                                                                <RetentionBar value={task.retention.val} color={task.retention.color} bg={task.retention.bg} />
                                                            </div>
                                                            <span className={`text-sm font-black font-mono ${task.retention.color} w-10 text-right`}>
                                                                {task.retention.val}%
                                                            </span>
                                                        </div>

                                                        {/* Play Button - Action */}
                                                        <button
                                                            className="w-10 h-10 rounded-xl bg-slate-950 border border-white/5 hover:bg-emerald-500/20 text-slate-500 hover:text-emerald-400 flex items-center justify-center transition-all shadow-xl group/play hover:border-emerald-500/30"
                                                            title="Iniciar Revisão"
                                                        >
                                                            <Play size={14} className="fill-current opacity-40 group-hover/play:opacity-100" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Footer Tip */}
            <div className="bg-slate-900/40 p-5 rounded-2xl border border-white/5 text-center flex items-center justify-center gap-3">
                <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20 text-yellow-500">
                    <Zap size={14} className="animate-pulse" />
                </div>
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                    Dica: <span className="text-slate-300">Clique em uma matéria para expandir os tópicos. Priorize revisões abaixo de 60%.</span>
                </p>
            </div>
        </div>
    );
}
