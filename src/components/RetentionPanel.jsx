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
        <div className="w-full space-y-6 animate-fade-in-down">
            {/* Header */}
            <div className="flex items-center gap-4">
                <div className="relative">
                    <div className="absolute inset-0 bg-purple-500/30 rounded-xl blur-lg"></div>
                    <div className="relative p-3 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 rounded-xl border border-purple-500/30">
                        <BrainCircuit size={28} className="text-purple-400" />
                    </div>
                </div>
                <div>
                    <h2 className="text-xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                        Painel de Retenção
                    </h2>
                    <p className="text-slate-500 text-xs">Baseado na Curva de Esquecimento de Ebbinghaus</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4">
                {/* Average Retention */}
                <div className="glass p-4 border-l-4 border-purple-500">
                    <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                        <BrainCircuit size={14} />
                        Média Geral
                    </div>
                    <div className="text-3xl font-black text-white">{stats.avgRetention}%</div>
                    <div className="text-xs text-slate-500 mt-1">{stats.totalTasks} assuntos</div>
                </div>

                {/* Critical */}
                <div className="glass p-4 border-l-4 border-red-500">
                    <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                        <AlertTriangle size={14} />
                        Críticos
                    </div>
                    <div className="text-3xl font-black text-red-400">{stats.critical}</div>
                    <div className="text-xs text-slate-500 mt-1">precisam revisão</div>
                </div>

                {/* Warning */}
                <div className="glass p-4 border-l-4 border-yellow-500">
                    <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                        <TrendingDown size={14} />
                        Atenção
                    </div>
                    <div className="text-3xl font-black text-yellow-400">{stats.warning}</div>
                    <div className="text-xs text-slate-500 mt-1">em declínio</div>
                </div>

                {/* Healthy */}
                <div className="glass p-4 border-l-4 border-emerald-500">
                    <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                        <CheckCircle2 size={14} />
                        Saudáveis
                    </div>
                    <div className="text-3xl font-black text-emerald-400">{stats.healthy}</div>
                    <div className="text-xs text-slate-500 mt-1">ótimo</div>
                </div>
            </div>

            {/* Priority Alert */}
            {needsReview.length > 0 && (
                <div className="relative rounded-xl overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-red-900/40 via-orange-900/30 to-yellow-900/20"></div>
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-red-500/10 via-transparent to-transparent"></div>
                    <div className="relative p-5 border border-red-500/30 rounded-xl">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-red-500/20 rounded-lg">
                                <Zap size={20} className="text-red-400" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-red-300 uppercase tracking-wider">
                                    ⚠️ Revisão Necessária
                                </h3>
                                <p className="text-xs text-slate-400">
                                    {needsReview.length} assunto{needsReview.length > 1 ? 's' : ''} com retenção abaixo de 60%
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {needsReview.slice(0, 6).map((task) => (
                                <span key={task.id || task.title} className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${task.retention.border} ${task.retention.color} bg-black/30`}>
                                    {task.categoryIcon} {task.title || task.text || 'Sem nome'} ({task.retention.val}%)
                                </span>
                            ))}
                            {needsReview.length > 6 && (
                                <span className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-400 bg-slate-800/50 border border-slate-700">
                                    +{needsReview.length - 6} mais
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Categories List with Expandable Topics */}
            <div className="glass p-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                    <Calendar size={14} />
                    Matérias e Assuntos ({stats.totalCategories} matérias, {stats.totalTasks} assuntos)
                </h3>

                <div className="space-y-3">
                    {retentionData.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                            <BrainCircuit size={40} className="mx-auto mb-3 opacity-30" />
                            <p>Nenhuma matéria encontrada</p>
                            <p className="text-xs mt-1">Adicione matérias no Dashboard para começar</p>
                        </div>
                    ) : (
                        retentionData.map((cat, idx) => {
                            const isExpanded = expandedCategories[cat.id];
                            const hasTasks = cat.tasksWithRetention.length > 0;

                            return (
                                <div key={cat.id} className="rounded-xl overflow-hidden border border-white/10">
                                    {/* Category Header */}
                                    <div
                                        className={`group p-4 cursor-pointer transition-all duration-300 hover:bg-white/5
                                            ${cat.retention.val < 40
                                                ? 'bg-gradient-to-r from-red-900/20 to-transparent'
                                                : cat.retention.val < 60
                                                    ? 'bg-gradient-to-r from-yellow-900/10 to-transparent'
                                                    : 'bg-white/5'
                                            }`}
                                        onClick={() => hasTasks && toggleExpand(cat.id)}
                                    >
                                        <div className="flex items-center gap-4">
                                            {/* Icon */}
                                            <div
                                                className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0"
                                                style={{ backgroundColor: `${cat.color}20`, borderColor: `${cat.color}40`, borderWidth: 1 }}
                                            >
                                                {cat.icon}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-bold text-white truncate">{cat.name}</h4>
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${cat.retention.bg}/20 ${cat.retention.color}`}>
                                                        {cat.retention.label}
                                                    </span>
                                                    {cat.criticalTasks > 0 && (
                                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400">
                                                            {cat.criticalTasks} crítico{cat.criticalTasks > 1 ? 's' : ''}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                                    <span className="flex items-center gap-1">
                                                        <BookOpen size={10} />
                                                        {cat.tasksWithRetention.length} assuntos
                                                    </span>
                                                    <span>•</span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock size={10} />
                                                        {cat.timeAgo}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Retention Ring */}
                                            <RetentionRing
                                                value={cat.retention.val}
                                                color={cat.retention.color}
                                            />

                                            {/* Expand Arrow */}
                                            {hasTasks && (
                                                <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                                                    <ChevronDown size={20} className="text-slate-500" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="mt-3 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${cat.retention.bg}`}
                                                style={{ width: `${cat.retention.val}%` }}
                                            ></div>
                                        </div>
                                    </div>

                                    {/* Expanded Topics */}
                                    {isExpanded && hasTasks && (
                                        <div className="bg-slate-900/50 border-t border-white/5">
                                            <div className="p-3 space-y-2">
                                                {cat.tasksWithRetention.map((task, tIdx) => (
                                                    <div
                                                        key={task.id}
                                                        className={`flex items-center gap-3 p-3 rounded-lg transition-all hover:bg-white/5 cursor-pointer
                                                            ${task.retention.val < 40 ? 'bg-red-900/10' : task.retention.val < 60 ? 'bg-yellow-900/5' : 'bg-white/5'}`}
                                                        onClick={() => onSelectCategory?.({ ...cat, selectedTask: task })}
                                                    >
                                                        {/* Task Icon */}
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 ${task.retention.bg}/20 ${task.retention.color}`}>
                                                            📖
                                                        </div>

                                                        {/* Task Info */}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-white truncate">{task.title || task.text || 'Sem nome'}</p>
                                                            {task.timeAgo !== 'Nunca' && (
                                                                <p className="text-[10px] text-slate-500">{task.timeAgo}</p>
                                                            )}
                                                        </div>

                                                        {/* Status Badge */}
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${task.retention.bg}/20 ${task.retention.color}`}>
                                                            {task.retention.label}
                                                        </span>

                                                        {/* Retention Bar */}
                                                        <RetentionBar value={task.retention.val} color={task.retention.color} bg={task.retention.bg} />

                                                        {/* Percentage */}
                                                        <span className={`text-sm font-bold ${task.retention.color} w-12 text-right`}>
                                                            {task.retention.val}%
                                                        </span>

                                                        {/* Play Button */}
                                                        <button
                                                            className="w-8 h-8 rounded-full bg-white/5 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 flex items-center justify-center transition-all group/play ml-2"
                                                            title="Revisar Agora"
                                                        >
                                                            <Play size={14} className="fill-current opacity-50 group-hover/play:opacity-100" />
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
            <div className="text-center text-xs text-slate-500 py-2">
                💡 <span className="text-slate-400">Dica:</span> Clique nas matérias para ver os assuntos. Revise itens com retenção abaixo de 60%
            </div>
        </div>
    );
}
