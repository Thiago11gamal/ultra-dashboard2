import React, { useState } from 'react';
import { differenceInDays, subDays, format, addDays } from 'date-fns';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { Pencil } from 'lucide-react';
import { calculateLevel, getLevelTitle, calculateProgress, getXpToNextLevel } from '../utils/gamification';

// Circular Progress Ring Component with Neon Glow
const ProgressRing = ({ progress, size = 120, strokeWidth = 10 }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (progress / 100) * circumference;

    return (
        <div className="relative flex items-center justify-center">
            {/* Ambient Glow behind the ring */}
            <div className="absolute inset-0 bg-blue-500/20 blur-[40px] rounded-full" />

            <svg width={size} height={size} className="transform -rotate-90 relative z-10">
                {/* Background circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth={strokeWidth}
                />
                {/* Progress circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="url(#neonGradient)"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    style={{
                        transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)',
                        filter: 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.5))'
                    }}
                />
                <defs>
                    <linearGradient id="neonGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="50%" stopColor="#8b5cf6" />
                        <stop offset="100%" stopColor="#22c55e" />
                    </linearGradient>
                </defs>
            </svg>

            {/* Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                <span className="text-3xl lg:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-400 filter drop-shadow-sm">
                    {progress}%
                </span>
                <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mt-1">Concluído</span>
            </div>
        </div>
    );
};

// Mini Sparkline Component
const Sparkline = ({ data, color }) => {
    if (!data || data.length < 2) return null;

    return (
        <div className="h-8 w-full mt-2 opacity-60 group-hover:opacity-100 transition-opacity">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                    <Line
                        type="monotone"
                        dataKey="value"
                        stroke={color}
                        strokeWidth={2}
                        dot={false}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default function StatsCards({ data, onUpdateGoalDate }) {
    const categories = data?.categories || [];
    const user = data?.user || { startDate: new Date(), goalDate: new Date() };
    const studyLogs = data?.studyLogs || [];
    const [editingGoalDate, setEditingGoalDate] = useState(false);

    // Gamification Stats
    const currentXP = user?.xp || 0;
    const level = calculateLevel(currentXP);
    const { title: rankTitle, color: rankColor } = getLevelTitle(level);
    const xpProgress = calculateProgress(currentXP);
    const xpNeeded = getXpToNextLevel(currentXP);

    // Generate 7-day trend data
    const generate7DayTrend = () => {
        const today = new Date();
        const trend = [];

        for (let i = 6; i >= 0; i--) {
            const targetDate = subDays(today, i);
            const dateStr = format(targetDate, 'yyyy-MM-dd');

            // Count minutes studied on this day
            const dayLogs = studyLogs.filter(log => {
                const logDate = format(new Date(log.date), 'yyyy-MM-dd');
                return logDate === dateStr;
            });

            const totalMinutes = dayLogs.reduce((acc, log) => acc + (log.minutes || 0), 0);

            trend.push({
                day: format(targetDate, 'EEE'),
                value: totalMinutes,
                studied: dayLogs.length > 0
            });
        }

        return trend;
    };

    const trendData = generate7DayTrend();

    // Calculate streak per day for sparkline
    const streakTrend = trendData.map((d, i) => ({
        ...d,
        value: d.studied ? (i > 0 && trendData[i - 1].studied ? trendData[i - 1].value + 1 : 1) : 0
    }));

    // Calculate overall progress
    const safeCategories = categories || [];
    const totalTasks = safeCategories.reduce((acc, cat) => acc + (cat.tasks || []).length, 0);
    const completedTasks = safeCategories.reduce(
        (acc, cat) => acc + (cat.tasks || []).filter(t => t.completed).length,
        0
    );
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Calculate days since start and until goal
    const now = new Date();
    // Normalize to midnight to ensure accurate day calculation regardless of time
    const todayNormalized = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const goalDateObj = new Date(user.goalDate);
    // Use the goal date components explicitly to avoid UTC shift issues if parsing simplistic strings
    // But since input is YYYY-MM-DD, parsing usually results in UTC midnight. 
    // Best to treat goalDate as local midnight too.
    // Assuming user.goalDate is YYYY-MM-DD string or ISO.
    // If string "2026-02-01", new Date() makes it UTC.
    // Let's ensure we compare "local date" vs "local date".
    const goalNormalized = new Date(goalDateObj.getFullYear(), goalDateObj.getMonth(), goalDateObj.getDate());
    // Wait, if goalDate is ISO string from input type=date, it might be YYYY-MM-DD.
    // If it's stored as full ISO, we just take the day components.

    // Robust parsing:
    // If we just want "calendar days difference":
    // 1. Get current date at midnight
    // 2. Get goal date at midnight
    // 3. Diff

    // We already have todayNormalized.
    // For goal, we need to be careful about timezone shifts if it was saved as UTC.
    // If the input was "2026-02-01", it's saved as "2026-02-01".
    // new Date("2026-02-01") is UTC.
    // If we take .getDate() etc from it, we get UTC date components.
    // If I am in -4, "2026-02-01T00:00Z" is "2026-01-31T20:00" local.
    // The user likely wants "Calendar Date" comparison.

    // Let's use string parts if possible, or simpler:
    // Parse the goalDate string as YYYY-MM-DD and create a local date from it.
    let goalNormalizedFinal;
    if (typeof user.goalDate === 'string' && user.goalDate.includes('T')) {
        // It is ISO, so likely UTC or generated by new Date().toISOString()
        // If it was generated by input type="date", it shouldn't have T unless we did new Date(e.target.value).toISOString()
        // In App.jsx line 230: onUpdateGoalDate(new Date(e.target.value).toISOString());
        // Yes, it's ISO. So "2026-02-01" became "2026-02-01T00:00:00.000Z".
        // Which means it is UTC.
        // If user selected Feb 1st, they meant Feb 1st.
        // In local time (GMT-4), that might be Jan 31st 20:00.
        // We should correct for timezone offset OR treat the UTC date as the intended local date.

        // If we interpret the UTC date string as local parts:
        const g = new Date(user.goalDate);
        // Get UTC parts because the source was "YYYY-MM-DD" -> UTC
        goalNormalizedFinal = new Date(g.getUTCFullYear(), g.getUTCMonth(), g.getUTCDate());
    } else if (typeof user.goalDate === 'string') {
        const parts = user.goalDate.split('-');
        if (parts.length === 3) {
            goalNormalizedFinal = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        } else {
            goalNormalizedFinal = new Date(user.goalDate); // Fallback
        }
    } else {
        goalNormalizedFinal = new Date(user.goalDate);
    }

    // For safety, set hours to 0
    goalNormalizedFinal.setHours(0, 0, 0, 0);

    const daysSinceStart = differenceInDays(todayNormalized, new Date(user.startDate));
    const daysUntilGoal = differenceInDays(goalNormalizedFinal, todayNormalized);

    // Calculate Unique Days Studied
    const uniqueDays = new Set(studyLogs.map(log => new Date(log.date).toLocaleDateString()));
    const daysStudying = uniqueDays.size;

    // Calculate Streak
    const calculateStreak = () => {
        if (!studyLogs.length) return 0;
        const dates = [...new Set(
            studyLogs
                .map(l => new Date(l.date).setHours(0, 0, 0, 0))
                .sort((a, b) => b - a)
        )];
        if (dates.length === 0) return 0;
        const today = new Date().setHours(0, 0, 0, 0);
        const yesterday = new Date(Date.now() - 86400000).setHours(0, 0, 0, 0);
        if (dates[0] !== today && dates[0] !== yesterday) return 0;
        let streakCount = 1;
        let currentDate = dates[0];
        for (let i = 1; i < dates.length; i++) {
            const prevDate = dates[i];
            const diffTime = Math.abs(currentDate - prevDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays === 1) {
                streakCount++;
                currentDate = prevDate;
            } else {
                break;
            }
        }
        return streakCount;
    };

    const streak = calculateStreak();

    const stats = [
        {
            label: 'Dias Estudados',
            value: daysStudying,
            icon: '📅',
            startColor: 'rgba(59, 130, 246, 0.5)',
            endColor: 'rgba(6, 182, 212, 0)',
            textGradient: 'from-blue-400 to-cyan-400',
            textColor: 'text-blue-400',
            sparklineColor: '#3b82f6',
            sparklineData: trendData.map(d => ({ value: d.studied ? 1 : 0 }))
        },
        {
            label: 'Dias p/ Prova',
            value: daysUntilGoal > 0 ? daysUntilGoal : 0,
            icon: '🎯',
            startColor: 'rgba(249, 115, 22, 0.5)',
            endColor: 'rgba(239, 68, 68, 0)',
            textGradient: 'from-orange-400 to-red-400',
            textColor: 'text-orange-400',
            sparklineColor: '#f97316',
            sparklineData: null,
            editable: true,
            goalDate: user.goalDate
        },
        {
            label: 'Tarefas Feitas',
            value: `${completedTasks}/${totalTasks}`,
            icon: '✅',
            startColor: 'rgba(34, 197, 94, 0.5)',
            endColor: 'rgba(16, 185, 129, 0)',
            textGradient: 'from-green-400 to-emerald-400',
            textColor: 'text-green-400',
            sparklineColor: '#22c55e',
            sparklineData: null // Could add task completion trend later
        },
        {
            label: 'Streak Atual',
            value: `${streak} dias`,
            icon: '🔥',
            startColor: 'rgba(168, 85, 247, 0.5)',
            endColor: 'rgba(236, 72, 153, 0)',
            textGradient: 'from-purple-400 to-pink-400',
            textColor: 'text-purple-400',
            sparklineColor: '#a855f7',
            sparklineData: trendData.map(d => ({ value: d.value })) // Minutes studied per day
        },
    ];

    return (
        <div className="space-y-6 mb-8 mt-6">

            {/* Gamification Banner - Standalone */}
            <div className="relative overflow-hidden rounded-2xl p-6 border border-white/10 bg-gradient-to-r from-slate-900/90 to-purple-900/40 backdrop-blur-md shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 group">
                {/* Animated Background */}
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
                <div className={`absolute inset-0 bg-gradient-to-r ${rankColor.replace('text-', 'from-')}/20 to-transparent opacity-30 group-hover:opacity-50 transition-opacity duration-700`}></div>

                {/* Left: Level & Rank */}
                <div className="flex items-center gap-5 z-10 w-full md:w-auto justify-center md:justify-start">
                    <div className={`relative w-20 h-20 shrink-0 rounded-full bg-slate-950 flex items-center justify-center text-3xl border-4 ${rankColor.replace('text-', 'border-')} shadow-[0_0_20px_-5px_currentColor] ${rankColor}`}>
                        <span className="font-black">#{level}</span>
                    </div>
                    <div className="text-center md:text-left">
                        <h3 className={`text-2xl font-black ${rankColor} uppercase tracking-wide drop-shadow-md`}>{rankTitle}</h3>
                        <p className="text-slate-400 text-xs font-semibold tracking-wider uppercase">Nível Atual</p>
                    </div>
                </div>

                {/* Center/Right: XP Progress */}
                <div className="flex-1 w-full z-10 flex flex-col justify-center">
                    <div className="flex justify-between items-end mb-2 px-1">
                        <span className="text-white text-sm font-bold">Progresso de XP</span>
                        <span className={`text-sm font-black ${rankColor}`}>{xpProgress}%</span>
                    </div>
                    <div className="h-4 bg-slate-950/50 rounded-full overflow-hidden border border-white/5 relative shadow-inner">
                        <div
                            className={`h-full bg-gradient-to-r ${rankColor.replace('text-', 'from-')} to-white rounded-full transition-all duration-1000 ease-out relative`}
                            style={{ width: `${xpProgress}%` }}
                        >
                            <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.5),transparent)] w-1/2 h-full skew-x-12 animate-[shimmer_2s_infinite]"></div>
                        </div>
                    </div>
                    <div className="flex justify-between items-center mt-2 px-1">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">RANK ATUAL</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Faltam {xpNeeded} XP para o próximo nível</span>
                    </div>
                </div>
            </div>

            {/* Top Row: Key Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {stats.map((stat, index) => (
                    <div
                        key={index}
                        onClick={() => stat.editable && setEditingGoalDate(true)}
                        className={`relative overflow-hidden rounded-2xl p-6 border border-white/10 bg-slate-900/80 backdrop-blur-sm group hover:border-white/20 hover:scale-[1.02] transition-all duration-500 shadow-xl hover:shadow-2xl ${stat.editable ? 'cursor-pointer' : ''}`}
                    >
                        {/* Animated Gradient Glow */}
                        <div
                            className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-[50px] opacity-30 group-hover:opacity-60 group-hover:scale-125 transition-all duration-700"
                            style={{ background: `radial-gradient(circle, ${stat.startColor}, transparent 70%)` }}
                        />

                        {/* Bottom accent line */}
                        <div
                            className="absolute bottom-0 left-0 right-0 h-1 opacity-50 group-hover:opacity-100 transition-opacity duration-300"
                            style={{ background: `linear-gradient(to right, ${stat.startColor}, transparent)` }}
                        />

                        {/* Edit indicator */}
                        {stat.editable && (
                            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Pencil size={14} className="text-orange-400" />
                            </div>
                        )}

                        <div className="relative z-10 flex flex-col">
                            <div className="flex items-end justify-between gap-4">
                                <div className="flex-1 min-w-0 py-2 pl-8 translate-y-2">
                                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 pt-2 leading-relaxed">{stat.label}</p>
                                    <p className={`text-3xl lg:text-4xl font-black ${stat.textColor} drop-shadow-lg leading-normal tracking-tight pb-2`}>
                                        {stat.value}
                                    </p>
                                </div>
                                <div className="relative">
                                    {/* Icon glow effect */}
                                    <div
                                        className="absolute inset-0 blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-500 scale-150"
                                        style={{ background: stat.startColor }}
                                    />
                                    <span className="relative text-3xl opacity-70 group-hover:opacity-100 grayscale group-hover:grayscale-0 transition-all duration-500 transform group-hover:scale-125 group-hover:-rotate-12">
                                        {stat.icon}
                                    </span>
                                </div>
                            </div>
                            {/* Sparkline */}
                            {stat.sparklineData && (
                                <Sparkline data={stat.sparklineData} color={stat.sparklineColor} />
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Goal Date Edit Modal */}
            {editingGoalDate && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setEditingGoalDate(false)}>
                    <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl min-w-[300px]" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-white mb-4">📅 Data da Prova</h3>
                        <input
                            type="date"
                            defaultValue={format(new Date(user.goalDate), 'yyyy-MM-dd')}
                            onChange={(e) => {
                                if (e.target.value && onUpdateGoalDate) {
                                    onUpdateGoalDate(new Date(e.target.value).toISOString());
                                }
                            }}
                            className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500 transition-colors"
                        />
                        <button
                            onClick={() => setEditingGoalDate(false)}
                            className="w-full mt-4 px-4 py-3 bg-orange-500/20 text-orange-400 rounded-xl hover:bg-orange-500/30 transition-colors font-bold"
                        >
                            Confirmar
                        </button>
                    </div>
                </div>
            )}



            {/* Bottom Row: Detailed Progress */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* Main Progress Ring (Restored) */}
                <div className="lg:col-span-7 rounded-2xl p-6 border border-white/5 bg-slate-900/40 flex items-center justify-around relative overflow-hidden group">
                    {/* Background Glow */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

                    <div className="flex flex-col gap-2 z-10">
                        <h3 className="text-xl font-bold text-white mb-1">Progresso Geral</h3>
                        <p className="text-slate-400 text-xs max-w-xs leading-relaxed">
                            Você completou <span className="text-green-400 font-bold">{completedTasks}</span> de <span className="text-white font-bold">{totalTasks}</span> missões.
                        </p>
                        {progress >= 50 && (
                            <div className="mt-3 px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-lg inline-flex items-center gap-2 w-fit">
                                <span className="animate-pulse text-purple-400 text-xs">⚡</span>
                                <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider">Modo Turbo</span>
                            </div>
                        )}
                    </div>

                    <div className="z-10 scale-100">
                        <ProgressRing progress={progress} size={130} strokeWidth={10} />
                    </div>
                </div>

                {/* Priority Breakdown (Vertical) */}
                <div className="lg:col-span-5 rounded-2xl p-6 border border-white/5 bg-slate-900/40 flex flex-col justify-center gap-4 relative overflow-hidden">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <span>📊</span> Distribuição por Prioridade
                    </h3>

                    <div className="space-y-5">
                        {[
                            { key: 'high', label: 'Alta Prioridade', color: 'from-red-500 to-rose-500', bg: 'bg-red-900/20', text: 'text-red-400' },
                            { key: 'medium', label: 'Média Prioridade', color: 'from-yellow-400 to-amber-500', bg: 'bg-yellow-900/20', text: 'text-yellow-400' },
                            { key: 'low', label: 'Baixa Prioridade', color: 'from-green-400 to-emerald-500', bg: 'bg-green-900/20', text: 'text-green-400' }
                        ].map((prio) => {
                            const total = categories.reduce((acc, cat) => acc + (cat.tasks || []).filter(t => (t.priority === prio.key || (!t.priority && prio.key === 'medium'))).length, 0) || 1;
                            const completed = categories.reduce((acc, cat) => acc + (cat.tasks || []).filter(t => (t.priority === prio.key || (!t.priority && prio.key === 'medium')) && t.completed).length, 0);
                            const pct = Math.round((completed / total) * 100);

                            return (
                                <div key={prio.key} className="space-y-1.5">
                                    <div className="flex justify-between text-xs font-bold">
                                        <span className={prio.text}>{prio.label}</span>
                                        <span className="text-slate-500">{pct}%</span>
                                    </div>
                                    <div className={`h-2 rounded-full overflow-hidden ${prio.bg}`}>
                                        <div
                                            className={`h-full rounded-full bg-gradient-to-r ${prio.color} shadow-[0_0_10px_rgba(0,0,0,0.3)]`}
                                            style={{ width: `${pct}%`, transition: 'width 1s ease-out' }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
