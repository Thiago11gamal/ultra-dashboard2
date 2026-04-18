import React, { useMemo, useRef } from 'react';
import { Activity, TrendingUp, BarChart2, Trophy, Calendar, AlertCircle } from 'lucide-react';
import { calculateStudyStreak, analyzeSubjectBalance, analyzeEfficiency } from '../utils/analytics';
import { getXPProgress } from '../utils/gamification';

// ─── BUG 1 FIX ───────────────────────────────────────────────────────────────
// Cor dinâmica para o card de Eficiência baseada no score real.
// Antes: sempre emerald/verde, independente do score.
// Agora: verde (≥85), amarelo (≥60), vermelho (<60).
const getEfficiencyTheme = (score) => {
    if (score >= 85) return {
        glow: 'bg-emerald-500/10',
        glowHover: 'group-hover:bg-emerald-500/20',
        gradient: 'from-emerald-500/[0.02]',
        iconBg: 'bg-green-500/10 group-hover:bg-green-500/20',
        iconColor: 'text-green-400',
    };
    if (score >= 60) return {
        glow: 'bg-yellow-500/10',
        glowHover: 'group-hover:bg-yellow-500/20',
        gradient: 'from-yellow-500/[0.02]',
        iconBg: 'bg-yellow-500/10 group-hover:bg-yellow-500/20',
        iconColor: 'text-yellow-400',
    };
    return {
        glow: 'bg-red-500/10',
        glowHover: 'group-hover:bg-red-500/20',
        gradient: 'from-red-500/[0.02]',
        iconBg: 'bg-red-500/10 group-hover:bg-red-500/20',
        iconColor: 'text-red-400',
    };
};

const StatsCards = ({ data, onUpdateGoalDate }) => {
    const dateInputRef = useRef(null);

    // Memoized Analytics
    const streak    = useMemo(() => calculateStudyStreak(data.studyLogs || []),                              [data.studyLogs]);
    const balance   = useMemo(() => analyzeSubjectBalance(data.categories || []),                            [data.categories]);
    const efficiency = useMemo(() => analyzeEfficiency(data.categories || [], data.studyLogs || []),         [data.categories, data.studyLogs]);

    // Ensure user data exists
    const user     = data.user || { xp: 0, level: 1 };
    const progress = useMemo(() => getXPProgress(user.xp), [user.xp]);

    // ─── BUG 1 FIX: tema calculado a partir do score real ───────────────────
    const effTheme = useMemo(() => getEfficiencyTheme(efficiency?.score ?? 0), [efficiency?.score]);

    // Calculate days remaining
    const daysRemaining = useMemo(() => {
        if (!user.goalDate) return null;

        const now = new Date();
        const localToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        let goal;
        try {
            const raw = String(user.goalDate).trim();
            // Try to force noon for YYYY-MM-DD to avoid timezone shifting backwards safely
            const dateParams = raw.match(/^\d{4}-\d{2}-\d{2}$/) ? `${raw}T12:00:00` : raw;
            goal = new Date(dateParams);
            if (isNaN(goal.getTime())) {
                goal = new Date(raw); // fallback to raw string if parsing failed
            }
        } catch(e) { return null; }
        
        if (!goal || isNaN(goal.getTime())) return null;
        goal.setHours(12, 0, 0, 0);

        const diffTime = goal.getTime() - localToday.getTime();
        return Math.round(diffTime / (1000 * 60 * 60 * 24));
    }, [user.goalDate]);

    return (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 animate-fade-in-down">

            {/* ── Sequência ─────────────────────────────────────────────────── */}
            <div className="relative glass-hover bg-[#151720]/80 border border-white/10 rounded-2xl p-5 sm:p-6 flex flex-col justify-between group transition-all duration-500 overflow-hidden shadow-2xl">
                <div className="absolute -top-10 -left-10 w-24 h-24 bg-orange-500/10 rounded-full blur-[40px] group-hover:bg-orange-500/20 transition-all duration-700" />
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/[0.02] to-transparent pointer-events-none" />
                <div className="relative z-10 flex flex-col h-full">
                    <div className="flex items-center gap-2 sm:gap-3 mb-3">
                        <div className="p-2 bg-orange-500/10 rounded-lg group-hover:bg-orange-500/20 transition-colors">
                            <Activity size={18} className="text-orange-400" />
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest leading-none pt-1">Sequência</span>
                    </div>
                    <div className="text-2xl sm:text-4xl font-black text-white mt-1 mb-2">
                        {streak?.current || 0} <span className="text-lg sm:text-2xl text-slate-300 font-bold">{(streak?.current || 0) === 1 ? 'dia' : 'dias'}</span>
                    </div>
                    <div className="mt-auto pt-2 flex flex-col gap-1.5">
                        <div className="text-xs sm:text-sm text-slate-400 font-medium leading-relaxed">
                            Recorde: {streak?.longest || 0}d
                        </div>
                        {streak?.isActive && (
                            <div className="flex items-center gap-2 text-orange-400 mt-1">
                                <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(251,146,60,0.8)]" />
                                <span className="text-xs sm:text-sm font-bold tracking-widest">ATIVA</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Eficiência ──────────────────────────────────────────────── */}
            <div className="relative glass-hover bg-[#151720]/80 border border-white/10 rounded-2xl p-5 sm:p-6 flex flex-col justify-between group transition-all duration-500 overflow-hidden shadow-2xl">
                <div className={`absolute -top-10 -left-10 w-24 h-24 ${effTheme.glow} rounded-full blur-[40px] ${effTheme.glowHover} transition-all duration-700`} />
                <div className={`absolute inset-0 bg-gradient-to-br ${effTheme.gradient} to-transparent pointer-events-none`} />
                <div className="relative z-10 flex flex-col h-full">
                    <div className="flex items-center gap-2 sm:gap-3 mb-3">
                        <div className={`p-2 ${effTheme.iconBg} rounded-lg transition-colors`}>
                            <TrendingUp size={18} className={effTheme.iconColor} />
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest leading-none pt-1">Eficiência</span>
                    </div>
                    <div className="text-2xl sm:text-4xl font-black text-white mt-1 mb-2">
                        {efficiency?.score ?? 0}<span className="text-lg sm:text-2xl text-slate-300 font-bold ml-1">%</span>
                    </div>
                    <div className="mt-auto pt-2 flex flex-col gap-1.5">
                        <div className={`text-xs sm:text-sm ${effTheme.iconColor} capitalize leading-relaxed truncate font-extrabold`}>
                            {efficiency?.efficiency?.replace(/_/g, ' ') || 'Sem dados'}
                        </div>
                        {efficiency?.metrics?.minutesPerTask > 0 && (
                            <div className="text-xs sm:text-sm text-slate-400 font-medium">
                                ~{efficiency.metrics.minutesPerTask} min/tarefa
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Equilíbrio ─────────────────────────────────────────────── */}
            <div className="relative glass-hover bg-[#151720]/80 border border-white/10 rounded-2xl p-5 sm:p-6 flex flex-col justify-between group transition-all duration-500 overflow-hidden shadow-2xl">
                <div className="absolute -top-10 -left-10 w-24 h-24 bg-blue-500/10 rounded-full blur-[40px] group-hover:bg-blue-500/20 transition-all duration-700" />
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.02] to-transparent pointer-events-none" />
                <div className="relative z-10 flex flex-col h-full">
                    <div className="flex items-center gap-2 sm:gap-3 mb-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                            <BarChart2 size={18} className="text-blue-400" />
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest leading-none pt-1">Equilíbrio</span>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-white mt-1 mb-2 capitalize truncate">
                        {balance?.status?.replace(/_/g, ' ') || 'N/A'}
                    </div>
                    <div className="mt-auto pt-2 flex flex-col gap-1.5">
                        {balance?.distribution?.[0] && (
                            <div className="text-xs sm:text-sm text-slate-400 font-medium leading-relaxed truncate">
                                {balance.distribution[0].subject}: <span className="font-bold text-slate-300">{balance.distribution[0].percentage}%</span>
                            </div>
                        )}
                        {balance?.metrics?.activeSubjects > 0 && (
                            <div className="text-xs sm:text-sm text-slate-500 font-medium">
                                {balance.metrics.activeSubjects}/{balance.metrics.totalSubjects} matérias ativas
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── XP / Nível ─────────────────────────────────────────────── */}
            <div className="relative glass-hover bg-[#151720]/80 border border-white/10 rounded-2xl p-5 sm:p-6 flex flex-col justify-between group transition-all duration-500 shadow-2xl overflow-hidden">
                <div className="absolute -top-10 -left-10 w-24 h-24 bg-purple-500/10 rounded-full blur-[40px] group-hover:bg-purple-500/20 transition-all duration-700" />
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/[0.02] to-transparent pointer-events-none" />
                <div className="relative z-10 flex flex-col h-full">
                    <div className="flex items-center gap-2 sm:gap-3 mb-3">
                        <div className="p-2 bg-purple-500/10 rounded-lg group-hover:bg-purple-500/20 transition-colors">
                            <Trophy size={18} className="text-purple-400" />
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest leading-none pt-1">
                            Nível {progress.level}
                        </span>
                    </div>
                    <div className="text-2xl sm:text-4xl font-black text-white mt-1 mb-3">
                        {user.xp.toLocaleString('pt-BR')} <span className="text-lg sm:text-2xl text-slate-300 font-bold">XP</span>
                    </div>
                    <div className="space-y-2 mt-auto pt-2">
                        <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden shadow-inner">
                            <div
                                className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-1000 ease-out"
                                style={{ width: `${progress.percentage}%` }}
                            />
                        </div>
                        <div className="text-xs sm:text-sm text-purple-400 font-bold leading-relaxed">
                            {progress.percentage}% → Nível {progress.level + 1}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Data da Prova ───────────────────────────────────────────── */}
            <div className={`col-span-2 lg:col-span-1 relative bg-[#151720]/80 border rounded-2xl p-5 sm:p-6 transition-all duration-700 flex items-center justify-between h-full group shadow-2xl ${!user.goalDate
                ? 'animate-glow-red'
                : 'border-white/10 hover:border-rose-500/30'
                }`}>

                {/* Background glows */}
                <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                    <div className={`absolute -top-10 -right-10 w-24 h-24 rounded-full blur-[40px] transition-transform duration-700 ${!user.goalDate ? 'bg-red-500/30 scale-150' : 'bg-red-500/10 group-hover:scale-150'}`} />
                    {(!user.goalDate || (daysRemaining !== null && daysRemaining <= 15 && daysRemaining >= 0)) && (
                        <div className="absolute inset-0 bg-red-500/[0.04]" />
                    )}
                </div>

                {/* Left: contador de dias */}
                <div className="relative z-10 flex-1 flex flex-col items-center justify-center w-1/2">
                    {daysRemaining !== null ? (
                        <div className="flex flex-col items-center">
                            <div className="flex items-baseline gap-1.5 justify-center mb-1">
                                <span className={`text-4xl sm:text-5xl font-black ${daysRemaining < 0 ? 'text-slate-500' : daysRemaining <= 15 ? 'text-red-400' : 'text-white'}`}>
                                    {Math.abs(daysRemaining)}
                                </span>
                                <span className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                                    {Math.abs(daysRemaining) === 1 ? 'dia' : 'dias'}
                                </span>
                            </div>
                            <div className={`text-xs font-bold mt-1 text-center uppercase tracking-widest leading-relaxed ${daysRemaining < 0 ? 'text-slate-600' : daysRemaining <= 15 ? 'text-red-500/80' : 'text-slate-400'}`}>
                                {daysRemaining < 0
                                    ? 'Já passou'
                                    : daysRemaining === 0
                                        ? 'É hoje!'
                                        : 'Para a prova'}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center">
                            <div className="text-red-500 animate-bounce mb-2">
                                <AlertCircle size={36} strokeWidth={3} />
                            </div>
                            <div className="text-xs font-black text-red-100 bg-red-600 px-3 py-1 rounded-sm text-center uppercase tracking-widest leading-tight shadow-lg shadow-red-500/50">
                                URGENTE
                            </div>
                        </div>
                    )}
                </div>

                {/* Divisor vertical */}
                <div className="w-[1px] h-16 bg-white/10 z-10 mx-3" />

                {/* Right: date picker */}
                <div className="relative z-10 flex-1 flex flex-col items-center justify-center w-1/2 group/rightside cursor-pointer">
                    <div className="flex flex-col items-center gap-2 mb-3 pointer-events-none">
                        <div className={`p-2 rounded-xl transition-all duration-300 ${!user.goalDate ? 'bg-red-600 shadow-lg shadow-red-500/50 scale-110' : 'bg-red-500/10 group-hover/rightside:bg-red-500/20'}`}>
                            <Calendar size={18} className={`${!user.goalDate ? 'text-white' : 'text-red-400 group-hover/rightside:scale-110 transition-transform'}`} />
                        </div>
                        <span className={`text-xs font-black uppercase tracking-widest text-center leading-normal transition-colors ${!user.goalDate ? 'text-red-400 animate-pulse' : 'text-slate-500 group-hover/rightside:text-slate-400'}`}>Data final</span>
                    </div>

                    <div className="relative group/input flex justify-center w-full pointer-events-none">
                        <div className={`w-[120px] bg-slate-900/50 border rounded-lg py-1.5 text-sm font-bold transition-all group-hover/rightside:bg-slate-800 group-hover/rightside:text-white group-hover/rightside:border-white/20 text-center leading-relaxed ${!user.goalDate ? 'border-red-500/50 text-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.3)]' : 'border-white/10 text-slate-200'}`}>
                            {user.goalDate ? (() => {
                                try {
                                    const raw = String(user.goalDate).trim();
                                    const dateParams = raw.match(/^\d{4}-\d{2}-\d{2}$/) ? `${raw}T12:00:00` : raw;
                                    let g = new Date(dateParams);
                                    if (isNaN(g.getTime())) g = new Date(raw);
                                    if (isNaN(g.getTime())) return 'INVÁLIDA';
                                    g.setHours(12, 0, 0, 0); // Display exactly as noon to avoid -1 day timezone shifts
                                    return g.toLocaleDateString('pt-BR');
                                } catch(e) { return 'INVÁLIDA'; }
                            })() : 'ESCOLHER'}
                        </div>
                    </div>

                    <input
                        ref={dateInputRef}
                        type="date"
                        value={user.goalDate ? String(user.goalDate).split('T')[0] : ''}
                        onChange={(e) => onUpdateGoalDate(e.target.value)}
                        className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-20"
                    />
                </div>
            </div>
        </div>
    );
};

export default StatsCards;
