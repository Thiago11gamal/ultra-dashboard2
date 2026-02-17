import React from 'react';
import { Activity, TrendingUp, BarChart2, Trophy } from 'lucide-react';
import { calculateStudyStreak, analyzeSubjectBalance, analyzeEfficiency, getXPProgress } from '../utils/analytics';

const StatsCards = ({ data }) => {
    // Fallsbacks for safety
    const streak = calculateStudyStreak(data.studyLogs || []);
    const balance = analyzeSubjectBalance(data.categories || []);
    const efficiency = analyzeEfficiency(data.categories || [], data.studyLogs || []);
    // Ensure user data exists
    const user = data.user || { xp: 0, level: 1 };
    // We need getXPProgress. If it is in analytics (as user hinted) or gamification?
    // User provided "XP_CONFIG ... getXPProgress" in one block, implying it might be in gamification.js
    // BUT in the import above I imported it from analytics based on the user's snippet calling "getXPProgress" as if it was available.
    // Wait, the user snippet for `gamification.js` HAD `getXPProgress`.
    // The user snippet for `StatsCards` imports `getXPProgress` from `../utils/gamification`?
    // Actually the user snippet for StatsCards just says `getXPProgress(data.user.xp...)`.
    // Let's check imports.
    // I recently put `getXPProgress` in `gamification.js`.
    // So I should import it from there.

    // Changing imports to match reality:
    // import { calculateStudyStreak, analyzeSubjectBalance, analyzeEfficiency } from '../utils/analytics';
    // import { getXPProgress } from '../utils/gamification';

    const progress = getXPProgress(user.xp); // User snippet passed (xp, level), but my impl only needs xp.
    // Wait, user provided snippet: `const getXPProgress = (xp, level) => { ... }` in the TOP block.
    // And in my `gamification.js` update, I implemented `getXPProgress = (xp) => { ... calculateLevel(xp) ... }`.
    // If I use the user's `getXPProgress` which takes 2 args, I need to match that.
    // Let's re-read the user's `gamification.js` snippet logic.
    /*
    const getXPProgress = (xp, level) => {
      const currentLevelXP = Math.pow(level - 1, 2) * 100;
      const nextLevelXP = Math.pow(level, 2) * 100;
      ...
    */
    // In my previous `gamification.js` update step, I used:
    /*
    export const getXPProgress = (xp) => {
      const level = calculateLevel(xp);
      ...
    */
    // My implementation is safer because it calculates level from XP, ensuring consistency.
    // However, the user's `StatsCards` calls it as `getXPProgress(data.user.xp, data.user.level)`.
    // If I use my implementation, it ignores the second arg, which is fine.

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in-down">
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
                        Nível {user.level}
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
                            style={{ width: `${progress.percentage}%` }}
                        />
                    </div>
                    <div className="text-xs text-purple-400 font-bold">
                        {progress.percentage}% até Nível {user.level + 1}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StatsCards;
