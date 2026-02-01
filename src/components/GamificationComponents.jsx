import React, { useMemo } from 'react';
import { Flame, Trophy, Sparkles } from 'lucide-react';
import { calculateStreak, getStreakBonus, ACHIEVEMENTS } from '../utils/gamificationLogic';

// Component: Streak Display
export const StreakDisplay = ({ studyLogs }) => {
    const { current, best } = useMemo(() => calculateStreak(studyLogs), [studyLogs]);
    const bonus = getStreakBonus(current);

    return (
        <div className="rounded-xl p-4 border border-white/10 bg-gradient-to-br from-orange-900/20 to-red-900/20 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Flame size={16} className="text-orange-400" />
                    <h3 className="text-xs font-bold text-white">Streak</h3>
                </div>
                <span className="text-[10px] text-orange-400">+{bonus} XP/dia</span>
            </div>

            <div className="flex items-center justify-around">
                <div className="text-center">
                    <div className="text-3xl font-black text-orange-400">{current}</div>
                    <div className="text-[9px] uppercase tracking-wider text-slate-400">Dias</div>
                </div>
                <div className="w-px h-10 bg-white/10" />
                <div className="text-center">
                    <div className="text-xl font-bold text-slate-300">{best}</div>
                    <div className="text-[9px] uppercase tracking-wider text-slate-500">Recorde</div>
                </div>
            </div>
        </div>
    );
};

// Component: Achievements Grid
export const AchievementsGrid = ({ unlockedIds = [] }) => {
    return (
        <div className="rounded-xl p-3 border border-white/10 bg-slate-900/80 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-2">
                <Trophy size={14} className="text-yellow-400" />
                <h3 className="text-xs font-bold text-white">Conquistas</h3>
                <span className="ml-auto text-[10px] text-slate-400">
                    {unlockedIds.length}/{ACHIEVEMENTS.length}
                </span>
            </div>

            <div className="flex flex-wrap gap-2 justify-center">
                {ACHIEVEMENTS.map(achievement => {
                    const unlocked = unlockedIds.includes(achievement.id);
                    return (
                        <div
                            key={achievement.id}
                            className={`
                                w-8 h-8 rounded-lg flex items-center justify-center text-lg
                                transition-all cursor-help group relative
                                ${unlocked
                                    ? 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30'
                                    : 'bg-slate-800/50 border border-slate-700/50 grayscale opacity-40'}
                            `}
                            title={`${achievement.name}: ${achievement.description}`}
                        >
                            <span className={unlocked ? '' : 'brightness-50'}>{achievement.icon}</span>

                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-28 p-2 bg-slate-800 border border-slate-700 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 text-center">
                                <div className="text-[10px] font-bold text-white">{achievement.name}</div>
                                <div className="text-[9px] text-slate-400">{achievement.description}</div>
                                <div className="text-[9px] text-yellow-400 mt-1">+{achievement.xpReward} XP</div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// Component: XP History
export const XPHistory = ({ user }) => {
    const xp = user?.xp || 0;

    return (
        <div className="rounded-xl p-4 border border-white/10 bg-gradient-to-br from-purple-900/20 to-blue-900/20 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-2">
                <Sparkles size={16} className="text-purple-400" />
                <h3 className="text-xs font-bold text-white">XP Total</h3>
            </div>

            <div className="text-center">
                <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
                    {xp.toLocaleString()}
                </div>
            </div>
        </div>
    );
};
