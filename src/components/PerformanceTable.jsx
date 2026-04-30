import React from 'react';
import { TrendingUp, TrendingDown, Minus, Wallet, Trophy, Target, Hash } from 'lucide-react';
import { getSafeScore } from '../utils/scoreHelper';
import { calculateSlope } from '../engine';

const PerformanceTable = ({ categories = [] }) => {

    // Sort by Net Balance (Saldo) descending
    const sortedCategories = [...categories].sort((a, b) => {
        const statsA = a.simuladoStats || { history: [] };
        const statsB = b.simuladoStats || { history: [] };

        const historyA = statsA.history || [];
        const historyB = statsB.history || [];

        let correctA = 0, wrongA = 0;
        for (let i = 0; i < historyA.length; i++) {
            const h = historyA[i];
            const ms = a.maxScore ?? 100;
            const t = parseInt(h.total, 10) || 0;
            const c = (getSafeScore(h, ms) / ms * t);
            correctA += c;
            wrongA += (t - c);
        }
        const balanceA = correctA - wrongA;

        let correctB = 0, wrongB = 0;
        for (let i = 0; i < historyB.length; i++) {
            const h = historyB[i];
            const ms = b.maxScore ?? 100;
            const t = parseInt(h.total, 10) || 0;
            const c = (getSafeScore(h, ms) / ms * t);
            correctB += c;
            wrongB += (t - c);
        }
        const balanceB = correctB - wrongB;

        return balanceB - balanceA;
    });

    return (
        <div className="w-full rounded-2xl border border-white/5 bg-slate-950/40 backdrop-blur-xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto overflow-y-hidden">
                <table className="w-full text-left border-collapse table-fixed min-w-[900px]">
                    <thead className="bg-slate-900/50 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/5">
                        <tr>
                            <th className="p-5 pl-8 w-16 text-center">#</th>
                            <th className="p-5 w-72 md:w-80 border-r border-white/5">Disciplina</th>
                            <th className="p-5 text-center w-28 md:w-32"><div className="flex items-center justify-center gap-2"><Hash size={12} className="text-slate-600" /> Volume</div></th>
                            <th className="p-5 text-center w-32 md:w-40"><div className="flex items-center justify-center gap-2"><Target size={12} className="text-slate-600" /> Desempenho</div></th>
                            <th className="p-5 text-center w-32 md:w-36 border-l border-white/5"><div className="flex items-center justify-center gap-2"><Wallet size={12} className="text-slate-600" /> Saldo</div></th>
                            <th className="p-5 text-center w-24 md:w-28">Taxa</th>
                            <th className="p-5 text-center w-24 md:w-28 lg:w-32 rounded-tr-xl border-l border-white/5">Tendência</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03] text-xs">
                        {sortedCategories.map((category, index) => {
                            const stats = category.simuladoStats || { history: [], trend: 'stable' };
                            const history = stats.history || [];
                            const ms = category.maxScore ?? 100;

                            const totalQuestions = history.reduce((acc, h) => acc + (parseInt(h.total, 10) || 0), 0);
                            const totalCorrect = history.reduce((acc, h) => acc + (getSafeScore(h, ms) / ms * (Number(h.total) || 0)), 0);
                            const totalWrong = Math.max(0, totalQuestions - totalCorrect);
                            const netBalance = Math.round(totalCorrect - totalWrong);
                            const percentCorrect = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
                            const pctBar = percentCorrect;

                            // Dynamic Trend calculation instead of relying on static store value
                            const trendHistory = [...history]
                                .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)) // FIX: String compare safe for YYYY-MM-DD keys
                                .slice(-10).map(h => ({
                                    score: getSafeScore(h, ms),
                                    date: h.date
                                }));
                            const trendValue = history.length >= 3 ? calculateSlope(trendHistory) : 0;
                            const currentTrend = trendValue > 0.0167 ? 'up' : trendValue < -0.0167 ? 'down' : 'stable';

                            const isTopThree = index < 3 && totalQuestions > 0;
                            const rankColor = index === 0 ? 'text-yellow-400' : index === 1 ? 'text-slate-300' : index === 2 ? 'text-amber-600' : 'text-slate-600';

                            let trendIcon = <Minus size={16} className="text-slate-600 opacity-50" />;
                            if (currentTrend === 'up') trendIcon = <TrendingUp size={18} className="text-green-400 drop-shadow-[0_0_8px_rgba(34,197,94,0.4)]" />;
                            if (currentTrend === 'down') trendIcon = <TrendingDown size={18} className="text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]" />;

                            return (
                                <tr key={category.id} className="group hover:bg-white/[0.02] transition-all duration-300">
                                    {/* Ranking */}
                                    <td className="p-5 pl-8 text-center">
                                        <div className={`flex items-center justify-center font-black ${rankColor}`}>
                                            {isTopThree ? <Trophy size={16} className="mr-1 drop-shadow-[0_0_5px_rgba(234,179,8,0.3)]" /> : null}
                                            {index + 1}º
                                        </div>
                                    </td>

                                    {/* Disciplina */}
                                    <td className="p-5 border-r border-white/5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-slate-900/50 flex items-center justify-center border border-white/5 group-hover:border-white/10 group-hover:scale-110 transition-all duration-500 shadow-inner">
                                                <span className="text-xl">{category.icon || '📚'}</span>
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="font-bold text-sm truncate uppercase tracking-tight max-w-[120px] sm:max-w-[180px] md:max-w-[250px] min-w-0" style={{ color: category.color }}>
                                                    {category.name}
                                                </span>
                                                <span className="text-[10px] text-slate-500 font-medium tracking-tight">Level {category.level || 0} Scholar</span>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Volume */}
                                    <td className="p-5 text-center">
                                        <div className="flex flex-col items-center">
                                            <span className="font-mono text-sm font-black text-slate-300">{totalQuestions}</span>
                                            <span className="text-[8px] text-slate-500 uppercase tracking-widest font-black opacity-60">Questões</span>
                                        </div>
                                    </td>

                                    {/* Desempenho Bar */}
                                    <td className="p-5">
                                        <div className="flex flex-col gap-2 px-2">
                                            {totalQuestions > 0 ? (
                                                <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden flex border border-white/5 shadow-inner">
                                                    {pctBar > 0 && (
                                                        <div
                                                            className="h-full bg-gradient-to-r from-green-600 to-green-400 shadow-[0_0_10px_rgba(34,197,94,0.3)]"
                                                            style={{ width: `${pctBar}%` }}
                                                        />
                                                    )}
                                                    {pctBar < 100 && (
                                                        <div
                                                            className="h-full bg-gradient-to-r from-red-600 to-red-400 opacity-80"
                                                            style={{ width: `${100 - pctBar}%` }}
                                                        />
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="h-1.5 w-full bg-slate-900/50 rounded-full overflow-hidden opacity-50"></div>
                                            )}
                                            <div className="flex justify-between text-[8px] font-black uppercase tracking-tighter opacity-80">
                                                <span className="text-green-500">{Math.round(totalCorrect)} AC</span>
                                                <span className="text-red-500">{Math.round(totalWrong)} ER</span>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Saldo Badge */}
                                    <td className="p-5 text-center border-l border-white/5">
                                        <div className={`inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg border font-black font-mono shadow-xl transition-all duration-500 group-hover:scale-110 ${netBalance > 0 ? 'bg-green-500/10 border-green-500/20 text-green-400 shadow-green-500/5' :
                                            netBalance < 0 ? 'bg-red-500/10 border-red-500/20 text-red-400 shadow-red-500/5' :
                                                'bg-slate-800/50 border-white/5 text-slate-500'
                                            }`}>
                                            <span className="text-[11px]">{netBalance > 0 ? '+' : ''}{netBalance}</span>
                                            <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${netBalance > 0 ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.8)]' : netBalance < 0 ? 'bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.8)]' : 'bg-slate-600'}`} />
                                        </div>
                                    </td>

                                    {/* Taxa Badge */}
                                    <td className="p-5 text-center">
                                        <div className={`relative inline-block px-3 py-1.5 rounded-lg font-black font-mono transition-all duration-500 ${percentCorrect >= 80 ? 'text-green-400 drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]' :
                                            percentCorrect >= 60 ? 'text-yellow-400' :
                                                percentCorrect > 0 ? 'text-red-500' :
                                                    'text-slate-500'
                                            }`}>
                                            <span className="text-sm tracking-tight">{percentCorrect}%</span>
                                            {percentCorrect >= 80 && <div className="absolute -top-1 -right-0.5 w-2 h-2 bg-green-500 rounded-full animate-ping opacity-75" />}
                                        </div>
                                    </td>

                                    {/* Tendência Icon Box */}
                                    <td className="p-5 text-center border-l border-white/5">
                                        <div className="flex justify-center">
                                            <div className="w-12 h-12 rounded-xl bg-black/40 flex items-center justify-center border border-white/5 group-hover:border-white/20 group-hover:bg-black/60 transition-all duration-500 shadow-2xl relative overflow-hidden">
                                                <div className="z-10 relative">{trendIcon}</div>
                                                {currentTrend !== 'stable' && (
                                                    <div className={`absolute inset-0 blur-lg transition-opacity duration-700 opacity-0 group-hover:opacity-30 ${currentTrend === 'up' ? 'bg-green-500' : 'bg-red-500'
                                                        }`} />
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}

                        {sortedCategories.length === 0 && (
                            <tr>
                                <td colSpan="7" className="p-20 text-center">
                                    <div className="flex flex-col items-center gap-4 opacity-30">
                                        <Target size={48} className="text-slate-500" />
                                        <span className="text-sm font-bold uppercase tracking-widest">Nenhuma disciplina carregada</span>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer Stats Summary */}
            <div className="bg-slate-950/60 p-5 border-t border-white/5 flex items-center justify-center gap-12 text-[10px] uppercase font-black tracking-[0.15em] text-slate-500">
                <div className="flex items-center gap-2.5 group cursor-help">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)] group-hover:scale-125 transition-transform" />
                    <span className="group-hover:text-green-400 transition-colors">Dominante</span>
                </div>
                <div className="flex items-center gap-2.5 group cursor-help">
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.6)] group-hover:scale-125 transition-transform" />
                    <span className="group-hover:text-yellow-400 transition-colors">Em Evolução</span>
                </div>
                <div className="flex items-center gap-2.5 group cursor-help">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)] group-hover:scale-125 transition-transform" />
                    <span className="group-hover:text-red-400 transition-colors">Crítico</span>
                </div>
            </div>
        </div>
    );
};

export default PerformanceTable;
