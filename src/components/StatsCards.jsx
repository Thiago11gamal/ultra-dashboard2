import React, { useMemo, useRef } from 'react';
import { Activity, TrendingUp, BarChart2, Trophy, Calendar, AlertCircle } from 'lucide-react';
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
            <div className="relative bg-[#151720] border border-white/5 rounded-2xl p-6 group hover:border-orange-500/30 transition-colors shadow-lg">
                {/* Background Layer for Progress/Overflow elements */}
                <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                    {/* No specific glow here yet, but allows the progress bar container to breathe */}
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-orange-500/10 rounded-lg group-hover:bg-orange-500/20 transition-colors">
                            <Activity size={20} className="text-orange-400" />
                        </div>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider leading-relaxed">Sequência</span>
                    </div>
                    <div className="text-3xl font-black text-white mb-1">
                        {streak.current} {streak.current === 1 ? 'dia' : 'dias'}
                    </div>
                    <div className="text-xs text-slate-500 leading-normal">
                        Recorde: {streak.longest} {streak.longest === 1 ? 'dia' : 'dias'}
                    </div>
                    {streak.isActive && (
                        <div className="mt-2 flex items-center gap-1 text-orange-400">
                            <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse"></div>
                            <span className="text-xs font-bold">ATIVA</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Eficiência */}
            <div className="relative bg-[#151720] border border-white/5 rounded-2xl p-6 group hover:border-green-500/30 transition-colors shadow-lg">
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-green-500/10 rounded-lg group-hover:bg-green-500/20 transition-colors">
                            <TrendingUp size={20} className="text-green-400" />
                        </div>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider leading-relaxed">Eficiência</span>
                    </div>
                    <div className="text-3xl font-black text-white mb-1">
                        {efficiency.score}%
                    </div>
                    <div className="text-xs text-slate-500 capitalize leading-normal">
                        {efficiency.efficiency?.replace(/_/g, ' ') || 'N/A'}
                    </div>
                </div>
            </div>

            {/* Balanceamento */}
            <div className="relative bg-[#151720] border border-white/5 rounded-2xl p-6 group hover:border-blue-500/30 transition-colors shadow-lg">
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                            <BarChart2 size={20} className="text-blue-400" />
                        </div>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider leading-relaxed">Equilíbrio</span>
                    </div>
                    <div className="text-xl font-black text-white mb-1 capitalize truncate">
                        {balance.status?.replace(/_/g, ' ') || 'N/A'}
                    </div>
                    {balance.distribution[0] && (
                        <div className="text-xs text-slate-500 leading-normal">
                            {balance.distribution[0].subject}: {balance.distribution[0].percentage}%
                        </div>
                    )}
                </div>
            </div>

            {/* XP com barra de progresso */}
            <div className="relative bg-[#151720] border border-white/5 rounded-2xl p-6 group hover:border-purple-500/30 transition-colors shadow-lg">
                {/* Background Layer for Progress/Overflow elements */}
                <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                    {/* No specific glow here yet, but allows the progress bar container to breathe */}
                </div>

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-purple-500/10 rounded-lg group-hover:bg-purple-500/20 transition-colors">
                            <Trophy size={20} className="text-purple-400" />
                        </div>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider leading-relaxed">
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
                        <div className="text-xs text-purple-400 font-bold leading-normal">
                            {progress.percentage}% até Nível {progress.level + 1}
                        </div>
                    </div>
                </div>
            </div>

            {/* Data da Prova */}
            <div className={`relative bg-[#151720] border rounded-2xl p-6 transition-all duration-500 flex items-center justify-between h-full group shadow-2xl ${!user.goalDate
                ? 'animate-glow-red'
                : 'border-white/5 hover:border-red-500/30'
                }`}>

                {/* Background Layer for Glowes & Overflows */}
                <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                    <div className={`absolute -top-10 -right-10 w-24 h-24 rounded-full blur-[40px] transition-transform duration-700 ${!user.goalDate ? 'bg-red-500/30 scale-150' : 'bg-red-500/10 group-hover:scale-150'}`} />
                    {(!user.goalDate || (daysRemaining !== null && daysRemaining <= 15 && daysRemaining >= 0)) && (
                        <div className="absolute inset-0 bg-red-500/[0.04]" />
                    )}
                </div>

                {/* Content Layer */}
                <div className="relative z-10 flex-1 flex flex-col items-center justify-center w-1/2">
                    {daysRemaining !== null ? (
                        <div className="flex flex-col items-center pl-2">
                            <div className="flex items-baseline gap-1.5 justify-center">
                                <span className={`text-4xl font-black ${daysRemaining < 0 ? 'text-slate-500' : daysRemaining <= 15 ? 'text-red-400' : 'text-white'}`}>
                                    {Math.abs(daysRemaining)}
                                </span>
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider leading-relaxed">
                                    {Math.abs(daysRemaining) === 1 ? 'dia' : 'dias'}
                                </span>
                            </div>
                            <div className={`text-[10px] font-bold mt-0.5 text-center uppercase tracking-widest leading-normal ${daysRemaining < 0 ? 'text-slate-600' : daysRemaining <= 15 ? 'text-red-500/80' : 'text-slate-400'}`}>
                                {daysRemaining < 0
                                    ? "Já passou"
                                    : daysRemaining === 0
                                        ? "É hoje!"
                                        : "Para a prova"}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center pl-2">
                            <div className="text-red-500 animate-bounce mb-1">
                                <AlertCircle size={32} strokeWidth={3} />
                            </div>
                            <div className="text-[10px] font-black text-red-100 bg-red-600 px-2 py-0.5 rounded-sm text-center uppercase tracking-tighter leading-tight shadow-lg shadow-red-500/50">
                                URGENTE
                            </div>
                        </div>
                    )}
                </div>

                {/* Vertical Divider */}
                <div className="w-[1px] h-12 bg-white/10 z-10 mx-2"></div>

                {/* Right Side: Date Picker */}
                <div
                    className="relative z-10 flex-1 flex flex-col items-center justify-center w-1/2 pr-2 group/rightside cursor-pointer"
                    onMouseDown={(e) => {
                        e.preventDefault();
                        try {
                            dateInputRef.current?.showPicker();
                        } catch {
                            dateInputRef.current?.focus();
                        }
                    }}
                >
                    <div className="flex flex-col items-center gap-1.5 mb-2 pl-3 pointer-events-none">
                        <div className={`p-1.5 rounded-xl transition-all duration-300 ${!user.goalDate ? 'bg-red-600 shadow-lg shadow-red-500/50 scale-110' : 'bg-red-500/10 group-hover/rightside:bg-red-500/20'}`}>
                            <Calendar size={16} className={`${!user.goalDate ? 'text-white' : 'text-red-400 group-hover/rightside:scale-110 transition-transform'}`} />
                        </div>
                        <span className={`text-[9px] font-black uppercase tracking-widest text-center leading-normal transition-colors ${!user.goalDate ? 'text-red-400 animate-pulse' : 'text-slate-500 group-hover/rightside:text-slate-400'}`}>Data</span>
                    </div>

                    <div className="relative group/input flex justify-center w-full pointer-events-none">
                        <div className={`w-[120px] bg-slate-900/50 border rounded-lg py-1.5 text-sm font-bold transition-all group-hover/rightside:bg-slate-800 group-hover/rightside:text-white group-hover/rightside:border-white/20 text-center leading-relaxed ${!user.goalDate ? 'border-red-500/50 text-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.3)]' : 'border-white/10 text-slate-200'}`}>
                            {user.goalDate ? new Date(user.goalDate).toLocaleDateString('pt-BR') : 'ESCOLHER'}
                        </div>
                    </div>

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
