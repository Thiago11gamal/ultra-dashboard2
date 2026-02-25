import React, { useMemo, useRef, useState } from 'react';
import { Activity, TrendingUp, BarChart2, Trophy, Calendar } from 'lucide-react';
import { calculateStudyStreak, analyzeSubjectBalance, analyzeEfficiency } from '../utils/analytics';
import { getXPProgress } from '../utils/gamification';

const StatsCards = ({ data, onUpdateGoalDate }) => {
    const dateInputRef = useRef(null);
    // Memoized Analytics
    const streak = useMemo(() => calculateStudyStreak(data.studyLogs || []), [data.studyLogs]);
    const balance = useMemo(() => analyzeSubjectBalance(data.categories || []), [data.categories]);
    const efficiency = useMemo(() => analyzeEfficiency(data.categories || [], data.studyLogs || []), [data.categories, data.studyLogs]);

    // Ensure user data exists
    const user = data.user || { xp: 0, level: 1 };

    const progress = useMemo(() => getXPProgress(user.xp), [user.xp]);

    // Calculate days remaining
    const daysRemaining = useMemo(() => {
        if (!user.goalDate) return null;

        const now = new Date();
        now.setHours(0, 0, 0, 0);

        let goal;
        if (typeof user.goalDate === 'string' && user.goalDate.includes('T')) {
            const g = new Date(user.goalDate);
            goal = new Date(g.getUTCFullYear(), g.getUTCMonth(), g.getUTCDate());
        } else {
            goal = new Date(user.goalDate);
            goal.setHours(0, 0, 0, 0);
        }

        const diffTime = goal - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    }, [user.goalDate]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 animate-fade-in-down">
            {/* Streak */}
            <div className="bg-[#151720] border border-white/5 rounded-2xl p-6 hover:border-orange-500/30 transition-colors group shadow-lg">
                <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-orange-500/10 rounded-lg group-hover:bg-orange-500/20 transition-colors">
                        <Activity size={20} className="text-orange-400" />
                    </div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sequência</span>
                </div>
                <div className="text-3xl font-black text-white mb-1">
                    {streak.current} {streak.current === 1 ? 'dia' : 'dias'}
                </div>
                <div className="text-xs text-slate-500">
                    Recorde: {streak.longest} {streak.longest === 1 ? 'dia' : 'dias'}
                </div>
                {streak.isActive && (
                    <div className="mt-2 flex items-center gap-1 text-orange-400">
                        <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse"></div>
                        <span className="text-xs font-bold">ATIVA</span>
                    </div>
                )}
            </div>

            {/* Eficiência */}
            <div className="bg-[#151720] border border-white/5 rounded-2xl p-6 hover:border-green-500/30 transition-colors group shadow-lg">
                <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-green-500/10 rounded-lg group-hover:bg-green-500/20 transition-colors">
                        <TrendingUp size={20} className="text-green-400" />
                    </div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Eficiência</span>
                </div>
                <div className="text-3xl font-black text-white mb-1">
                    {efficiency.score}%
                </div>
                <div className="text-xs text-slate-500 capitalize">
                    {efficiency.efficiency?.replace(/_/g, ' ') || 'N/A'}
                </div>
            </div>

            {/* Balanceamento */}
            <div className="bg-[#151720] border border-white/5 rounded-2xl p-6 hover:border-blue-500/30 transition-colors group shadow-lg">
                <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                        <BarChart2 size={20} className="text-blue-400" />
                    </div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Equilíbrio</span>
                </div>
                <div className="text-xl font-black text-white mb-1 capitalize truncate">
                    {balance.status?.replace(/_/g, ' ') || 'N/A'}
                </div>
                {balance.distribution[0] && (
                    <div className="text-xs text-slate-500">
                        {balance.distribution[0].subject}: {balance.distribution[0].percentage}%
                    </div>
                )}
            </div>

            {/* XP com barra de progresso */}
            <div className="bg-[#151720] border border-white/5 rounded-2xl p-6 hover:border-purple-500/30 transition-colors group shadow-lg">
                <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-purple-500/10 rounded-lg group-hover:bg-purple-500/20 transition-colors">
                        <Trophy size={20} className="text-purple-400" />
                    </div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Nível {progress.level}
                    </span>
                </div>
                <div className="text-3xl font-black text-white mb-2">
                    {user.xp} XP
                </div>
                <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-500">
                        <span>{progress.current} XP</span>
                        <span>{progress.needed} XP</span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500"
                            style={{ width: `${progress.percentage}% ` }}
                        />
                    </div>
                    <div className="text-xs text-purple-400 font-bold">
                        {progress.percentage}% até Nível {progress.level + 1}
                    </div>
                </div>
            </div>

            {/* Data da Prova */}
            <div className="bg-[#151720] border border-white/5 rounded-2xl p-6 hover:border-red-500/30 transition-colors group shadow-lg flex items-center justify-between relative overflow-hidden h-full">
                {/* Background glows */}
                <div className="absolute -top-10 -right-10 w-24 h-24 bg-red-500/10 rounded-full blur-[40px] group-hover:scale-150 transition-transform duration-700 pointer-events-none" />
                {daysRemaining !== null && daysRemaining <= 15 && daysRemaining >= 0 && (
                    <div className="absolute inset-0 bg-red-500/[0.02] pointer-events-none" />
                )}

                {/* Left Side: Days Remaining */}
                <div className="flex-1 flex flex-col items-center justify-center z-10 w-1/2">
                    {daysRemaining !== null ? (
                        <div className="flex flex-col items-center pl-2">
                            <div className="flex items-baseline gap-1.5 justify-center">
                                <span className={`text-4xl font-black ${daysRemaining < 0 ? 'text-slate-500' : daysRemaining <= 15 ? 'text-red-400' : 'text-white'}`}>
                                    {Math.abs(daysRemaining)}
                                </span>
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    {Math.abs(daysRemaining) === 1 ? 'dia' : 'dias'}
                                </span>
                            </div>
                            <div className={`text-[10px] font-bold mt-0.5 text-center uppercase tracking-widest ${daysRemaining < 0 ? 'text-slate-600' : daysRemaining <= 15 ? 'text-red-500/80' : 'text-slate-400'}`}>
                                {daysRemaining < 0
                                    ? "Já passou"
                                    : daysRemaining === 0
                                        ? "É hoje!"
                                        : "Para a prova"}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center opacity-50 pl-2">
                            <div className="text-3xl font-black text-slate-600 text-center">--</div>
                            <div className="text-[9px] font-bold text-slate-500 mt-1 text-center uppercase tracking-widest leading-tight">Defina<br />sua meta</div>
                        </div>
                    )}
                </div>

                {/* Vertical Divider */}
                <div className="w-[1px] h-12 bg-white/10 z-10 mx-2"></div>

                {/* Right Side: Date Picker (Clean Proxy Pattern) */}
                <div
                    className="flex-1 flex flex-col items-center justify-center z-10 w-1/2 pr-2 relative group/rightside cursor-pointer"
                    onMouseDown={(e) => {
                        // Prevent default to avoid focus issues that close the native picker prematurely
                        e.preventDefault();
                        try {
                            dateInputRef.current?.showPicker();
                        } catch (err) {
                            dateInputRef.current?.focus();
                        }
                    }}
                >
                    {/* Visual elements */}
                    <div className="flex flex-col items-center gap-1.5 mb-2 pl-3 pointer-events-none z-10">
                        <div className="p-1.5 bg-red-500/10 rounded-xl group-hover/rightside:bg-red-500/20 transition-all duration-300">
                            <Calendar size={16} className="text-red-400 group-hover/rightside:scale-110 transition-transform" />
                        </div>
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest text-center group-hover/rightside:text-slate-400 transition-colors">Data</span>
                    </div>

                    <div className="relative group/input flex justify-center w-full pointer-events-none z-10">
                        <div className="w-[120px] bg-slate-900/50 border border-white/10 rounded-lg py-1.5 text-slate-200 text-sm font-bold transition-all group-hover/rightside:bg-slate-800 group-hover/rightside:text-white group-hover/rightside:border-white/20 text-center">
                            {user.goalDate ? new Date(user.goalDate).toLocaleDateString('pt-BR') : 'DD/MM/AAAA'}
                        </div>
                    </div>

                    {/* Hidden Native Input - Just holds data and handles the picker reference */}
                    <input
                        ref={dateInputRef}
                        type="date"
                        tabIndex="-1"
                        value={user.goalDate ? user.goalDate.split('T')[0] : ''}
                        onChange={(e) => onUpdateGoalDate(e.target.value)}
                        className="opacity-0 pointer-events-none absolute inset-0 w-0 h-0"
                    />
                </div>
            </div>
        </div>
    );
};

export default StatsCards;
