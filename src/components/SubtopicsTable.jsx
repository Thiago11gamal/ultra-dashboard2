import React, { useMemo } from 'react';
import { Target, Hash, Wallet, Minus, TrendingUp, TrendingDown } from 'lucide-react';
import { getSafeScore, formatValue, formatPercent } from '../utils/scoreHelper';
import { calculateSlope, getSortedHistory } from '../engine';

const SubtopicsTable = ({ categories = [], maxScore = 100 }) => {

    const subtopics = useMemo(() => {
        const topicMap = {};

        categories.forEach(cat => {
            const tasks = cat.tasks || [];
            tasks.forEach(tsk => {
                const name = String(tsk.title || tsk.text || '').trim();
                if (!name) return;

                const key = name.toLowerCase();
                if (!topicMap[key]) {
                    topicMap[key] = {
                        id: key,
                        name: name,
                        parentCategory: cat.name,
                        categoryColor: cat.color,
                        categoryIcon: cat.icon,
                        correct: 0,
                        wrong: 0,
                        total: 0,
                        trendHistory: []
                    };
                }
            });

            const history = cat.simuladoStats?.history || [];

            history.forEach(h => {
                (h.topics || []).forEach(t => {
                    const name = String(t.name || '').trim();
                    if (!name) return;

                    const key = name.toLowerCase();
                    if (!topicMap[key]) {
                        topicMap[key] = {
                            id: key,
                            name: name,
                            parentCategory: cat.name,
                            categoryColor: cat.color,
                            categoryIcon: cat.icon,
                            correct: 0,
                            wrong: 0,
                            total: 0,
                            trendHistory: []
                        };
                    }

                    const totalParsed = Number.isFinite(parseInt(t.total, 10)) ? parseInt(t.total, 10) : 0;
                    const total = totalParsed > 0 ? totalParsed : Math.max(0, (Number(t.correct) || 0) + (Number(t.wrong) || 0));
                    const correctCount = total > 0
                        ? Math.round((getSafeScore(t, maxScore) / maxScore) * total)
                        : (Number(t.correct) || 0);

                    const wrongCount = Math.max(0, total - correctCount);

                    topicMap[key].correct += correctCount;
                    topicMap[key].wrong += wrongCount;
                    topicMap[key].total += total;
                    if (h.date && Number.isFinite(Number(getSafeScore(t, maxScore)))) {
                        topicMap[key].trendHistory.push({ date: h.date, score: getSafeScore(t, maxScore) });
                    }
                });
            });
        });

        return Object.values(topicMap)
            .map(t => {
                const balance = t.correct - t.wrong;
                const percent = t.total > 0 ? Math.round((t.correct / t.total) * maxScore) : 0;
                const sortedTrend = getSortedHistory(t.trendHistory || []).slice(-10);
                const trendValue = sortedTrend.length >= 3 ? calculateSlope(sortedTrend, maxScore) : 0;
                const trendTolerance = 0.0167 * (maxScore / 100);
                const trend = trendValue > trendTolerance ? 'up' : trendValue < -trendTolerance ? 'down' : 'stable';
                return { ...t, balance, percent, trendValue, trend };
            })
            .sort((a, b) => b.balance - a.balance);

    }, [categories, maxScore]);

    return (
        <div className="w-full rounded-2xl border border-white/5 bg-slate-950/40 backdrop-blur-xl overflow-hidden shadow-2xl mt-8">
            <div className="bg-slate-900/80 px-6 py-4 flex items-center border-b border-white/5">
                <Target className="text-amber-500 mr-3" size={20} />
                <h3 className="font-bold text-slate-200">Rendimento por Assuntos Específicos</h3>
            </div>
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto w-full custom-scrollbar">
                <table className="w-full text-left border-collapse table-fixed min-w-[900px]">
                    <thead className="bg-slate-900/50 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/5 sticky top-0 z-10">
                        <tr>
                            <th className="p-5 pl-8 w-16 text-center">#</th>
                            <th className="p-5 w-72 md:w-80 border-r border-white/5">Assunto</th>
                            <th className="p-5 text-center w-28 md:w-32"><div className="flex items-center justify-center gap-2"><Hash size={12} className="text-slate-600" /> Volume</div></th>
                            <th className="p-5 text-center w-32 md:w-40"><div className="flex items-center justify-center gap-2"><Target size={12} className="text-slate-600" /> Desempenho</div></th>
                            <th className="p-5 text-center w-32 md:w-36 border-l border-white/5"><div className="flex items-center justify-center gap-2"><Wallet size={12} className="text-slate-600" /> Saldo</div></th>
                            <th className="p-5 text-center w-24 md:w-28">Taxa</th>
                            <th className="p-5 text-center w-24 md:w-28 lg:w-32 rounded-tr-xl border-l border-white/5">Tendência</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03] text-xs">
                        {subtopics.map((item, index) => {
                            const { total: totalQuestions, correct: totalCorrect, wrong: totalWrong, balance: netBalance, percent: percentCorrect } = item;
                            const rankColor = index === 0 ? 'text-yellow-400' : index === 1 ? 'text-slate-300' : index === 2 ? 'text-amber-600' : 'text-slate-600';

                            return (
                                <tr key={item.id} className="group hover:bg-white/[0.02] transition-all duration-300">
                                    <td className="p-5 pl-8 text-center align-middle text-slate-500 font-black">
                                        <span className={rankColor}>{index + 1}º</span>
                                    </td>
                                    <td className="p-5 border-r border-white/5 align-middle">
                                        <div className="flex flex-col justify-center min-w-0">
                                            <span className="font-bold text-sm truncate text-slate-300" title={item.name}>
                                                {item.name}
                                            </span>
                                            <span className="text-[10px] text-slate-500 font-medium tracking-tight truncate mt-0.5 max-w-[250px]" style={{ color: item.categoryColor || '#cbd5e1' }}>
                                                {item.categoryIcon} {item.parentCategory}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-5 text-center align-middle">
                                        <div className="flex flex-col items-center justify-center">
                                            <span className="font-mono text-sm font-black text-slate-300">{totalQuestions}</span>
                                        </div>
                                    </td>
                                    <td className="p-5 align-middle">
                                        <div className="flex flex-col justify-center gap-2 px-2">
                                            {totalQuestions > 0 ? (
                                                <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden flex border border-white/5 shadow-inner">
                                                    {(() => {
                                                        const safeMax = Math.max(1, Number(maxScore) || 1);
                                                        const scorePct = Math.max(0, Math.min(100, (Number(percentCorrect) / safeMax) * 100));
                                                        return (
                                                            <>
                                                                {scorePct > 0 && (
                                                                    <div className="h-full bg-gradient-to-r from-green-600 to-green-400 shadow-[0_0_10px_rgba(34,197,94,0.3)]" style={{ width: `${scorePct}%` }} />
                                                                )}
                                                                {scorePct < 100 && (
                                                                    <div className="h-full bg-gradient-to-r from-red-600 to-red-400 opacity-80" style={{ width: `${100 - scorePct}%` }} />
                                                                )}
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            ) : (
                                                <div className="h-1.5 w-full bg-slate-900/50 rounded-full overflow-hidden opacity-50"></div>
                                            )}
                                            <div className="flex justify-between text-[8px] font-black uppercase tracking-tighter opacity-80">
                                                <span className="text-green-500">{totalCorrect} AC</span>
                                                <span className="text-red-500">{totalWrong} ER</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-5 text-center align-middle border-l border-white/5">
                                        <div className={`inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg border font-black font-mono shadow-xl transition-all duration-500 ${netBalance > 0 ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                                            netBalance < 0 ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-slate-800/50 border-white/5 text-slate-500'}`}>
                                            <span className="text-[11px]">{netBalance > 0 ? '+' : ''}{netBalance}</span>
                                        </div>
                                    </td>
                                    <td className="p-5 text-center align-middle">
                                        <div className={`relative inline-block px-3 py-1.5 rounded-lg font-black font-mono transition-all duration-500 ${percentCorrect >= (maxScore * 0.8) ? 'text-green-400' :
                                            percentCorrect >= (maxScore * 0.6) ? 'text-yellow-400' : percentCorrect > 0 ? 'text-red-500' : 'text-slate-500'}`}>
                                            <span className="text-sm tracking-tight">{maxScore === 100 ? formatPercent(percentCorrect) : formatValue(percentCorrect)}</span>
                                        </div>
                                    </td>
                                    <td className="p-5 text-center align-middle border-l border-white/5">
                                        <div className="flex justify-center">
                                            <div className="w-12 h-12 rounded-xl bg-black/40 flex items-center justify-center border border-white/5 shadow-inner" title={`Tendência recente: ${item.trendValue > 0 ? '+' : ''}${(item.trendValue || 0).toFixed(3)} pts/registro`}>
                                                {item.trend === 'up' ? (
                                                    <TrendingUp size={16} className="text-emerald-400" />
                                                ) : item.trend === 'down' ? (
                                                    <TrendingDown size={16} className="text-rose-400" />
                                                ) : (
                                                    <Minus size={16} className="text-slate-600 opacity-50" />
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}

                        {subtopics.length === 0 && (
                            <tr>
                                <td colSpan="7" className="p-20 text-center">
                                    <div className="flex flex-col items-center gap-4 opacity-30">
                                        <Target size={48} className="text-slate-500" />
                                        <span className="text-sm font-bold uppercase tracking-widest">Nenhum assunto registrado na base</span>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default SubtopicsTable;
