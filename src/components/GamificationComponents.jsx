import React, { useMemo } from 'react';
import { Flame, Trophy, Sparkles } from 'lucide-react';
import { calculateStudyStreak } from '../utils/analytics';
import { ACHIEVEMENTS } from '../config/gamification';

import { calculateLevel, calculateProgress, getLevelTitle } from '../utils/gamification';

export const StreakDisplay = ({ studyLogs }) => {
    const { current, best } = useMemo(() => calculateStudyStreak(studyLogs), [studyLogs]);
    const bonus = Math.min(500, current * 50);

    return (
        <div className="rounded-2xl p-6 border border-transparent hover:border-orange-500/20 bg-gradient-to-br from-orange-900/10 via-slate-900/50 to-slate-900/80 backdrop-blur-sm shadow-inner transition-all duration-500 group h-full flex flex-col justify-between relative overflow-hidden">
            {/* Ambient Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-orange-500/20 transition-colors"></div>
            
            <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-orange-500/10 rounded-lg border border-orange-500/20 group-hover:scale-110 transition-transform">
                        <Flame size={18} className="text-orange-400 drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
                    </div>
                    <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest">Sequência</h3>
                </div>
                <span className="text-[10px] font-bold text-orange-400 bg-orange-500/10 px-2 py-1 rounded-full border border-orange-500/20">+{bonus} XP/dia</span>
            </div>
            
            <div className="flex items-center justify-around relative z-10 mt-2">
                <div className="text-center transform group-hover:scale-105 transition-transform duration-500">
                    <div className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-orange-300 to-orange-600 drop-shadow-[0_0_15px_rgba(249,115,22,0.3)]">{current}</div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">Dias Seguidos</div>
                </div>
                
                <div className="w-px h-16 bg-gradient-to-b from-transparent via-white/10 to-transparent mx-4" />
                
                <div className="text-center">
                    <div className="text-2xl font-black text-slate-300">{best}</div>
                    <div className="text-[10px] uppercase tracking-widest text-slate-600 font-bold mt-1">Recorde Máx</div>
                </div>
            </div>
        </div>
    );
};

export const AchievementsGrid = ({ unlockedIds = [], stats = {} }) => {
    return (
        <div className="w-full">
            <div className="flex items-center gap-2 mb-6">
                <div className="px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full flex items-center gap-2">
                    <Trophy size={14} className="text-purple-400" />
                    <span className="text-xs font-bold text-purple-300">
                        {ACHIEVEMENTS.filter(a => unlockedIds.some(u => (typeof u === 'string' ? u : u?.id) === a.id) || (a.condition && a.condition(stats))).length} / {ACHIEVEMENTS.length} Desbloqueadas
                    </span>
                </div>
            </div>
            <div className="flex flex-wrap gap-4">
                {ACHIEVEMENTS.map(achievement => {
                    const manuallyUnlocked = unlockedIds.some(u => (typeof u === 'string' ? u : u?.id) === achievement.id);
                    const dynamicallyUnlocked = achievement.condition && achievement.condition(stats);
                    const unlocked = manuallyUnlocked || dynamicallyUnlocked;
                    return (
                        <div key={achievement.id} className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center text-3xl transition-all duration-300 cursor-help group relative shadow-lg ${unlocked ? 'bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20 border border-purple-500/40 hover:scale-110 hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:border-purple-400/60' : 'bg-slate-900/60 border border-white/5 grayscale opacity-50 hover:opacity-80'}`}>
                            <span className={`transition-transform duration-300 ${unlocked ? 'group-hover:scale-110 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]' : 'brightness-50'}`}>{achievement.icon}</span>
                            
                            {/* Premium Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-48 p-3 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 pointer-events-none z-50 shadow-2xl text-center">
                                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-slate-900 border-b border-r border-white/10 rotate-45"></div>
                                <div className="relative z-10 text-sm font-black text-white tracking-wide">{achievement.name}</div>
                                <div className="relative z-10 text-[11px] text-slate-400 mt-1.5 leading-relaxed">{achievement.description || 'Desbloqueie para descobrir.'}</div>
                                <div className="relative z-10 inline-block mt-2 px-2 py-1 bg-purple-500/20 rounded border border-purple-500/30 text-[10px] font-bold text-purple-300">+{achievement.xpReward} XP</div>
                                {!unlocked && (
                                    <div className="relative z-10 mt-2 text-[9px] font-bold text-red-400 uppercase tracking-widest border-t border-white/5 pt-2">Bloqueado</div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export const XPHistory = ({ user }) => {
    const xp = user?.xp || 0;
    const level = calculateLevel(xp);
    const progress = calculateProgress(xp);
    const titleInfo = getLevelTitle(level);

    return (
        <div className="rounded-2xl p-6 border border-transparent hover:border-indigo-500/20 bg-gradient-to-br from-indigo-900/10 via-slate-900/50 to-slate-900/80 backdrop-blur-sm shadow-inner transition-all duration-500 group h-full flex flex-col justify-between relative overflow-hidden">
            {/* Ambient Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-indigo-500/20 transition-colors"></div>
            
            <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="flex items-center gap-2">
                    <div className={`p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20 group-hover:scale-110 transition-transform`}>
                        <Sparkles size={18} className="text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                    </div>
                    <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest">Experiência</h3>
                </div>
                
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-white/10 shadow-sm ${titleInfo.color}`}>
                    <span className="text-[10px]">{titleInfo.icon}</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest">{titleInfo.title}</span>
                </div>
            </div>
            
            <div className="relative z-10 mb-6 flex-1 flex flex-col justify-center">
                <div className="text-center transform group-hover:scale-105 transition-transform duration-500">
                    <div className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 drop-shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                        {xp.toLocaleString()} <span className="text-lg text-purple-400/50 font-bold ml-1">XP</span>
                    </div>
                </div>
            </div>

            {/* Level Progress Bar */}
            <div className="relative z-10">
                <div className="flex items-end justify-between font-bold mb-2">
                    <span className="text-[10px] uppercase tracking-widest text-slate-500">Nível {level}</span>
                    <span className="text-[10px] text-slate-400">{progress}%</span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-1.5 border border-white/5 overflow-hidden">
                    <div 
                        className={`h-full rounded-full transition-all duration-[1500ms] ease-out bg-gradient-to-r from-indigo-500 to-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.8)]`}
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>
        </div>
    );
};
