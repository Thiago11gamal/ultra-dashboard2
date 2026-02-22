import React from 'react';
import { TrendingUp, TrendingDown, Minus, Wallet } from 'lucide-react';

const PerformanceTable = ({ categories = [] }) => {
    // Sort by Net Balance (Saldo) descending
    const sortedCategories = [...categories].sort((a, b) => {
        const statsA = a.simuladoStats || { history: [] };
        const statsB = b.simuladoStats || { history: [] };

        const historyA = statsA.history || [];
        const historyB = statsB.history || [];

        const totalQA = historyA.reduce((acc, h) => acc + (parseInt(h.total, 10) || 0), 0);
        const correctA = historyA.reduce((acc, h) => acc + (parseInt(h.correct, 10) || 0), 0);
        const wrongA = totalQA - correctA;
        const balanceA = correctA - wrongA;

        const totalQB = historyB.reduce((acc, h) => acc + (parseInt(h.total, 10) || 0), 0);
        const correctB = historyB.reduce((acc, h) => acc + (parseInt(h.correct, 10) || 0), 0);
        const wrongB = totalQB - correctB;
        const balanceB = correctB - wrongB;

        return balanceB - balanceA;
    });

    return (
        <div className="w-full rounded-xl border border-white/10 bg-slate-900/50 glass p-6">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-white/5 uppercase text-[10px] font-bold text-slate-400 tracking-wider">
                        <tr>
                            <th className="p-4 pl-10 rounded-tl-xl text-left">Disciplina</th>
                            <th className="p-4 text-left w-1/3">Desempenho (Acertos x Erros)</th>
                            <th className="p-4 text-center">Saldo Líquido</th>
                            <th className="p-4 text-center">Taxa de Acerto</th>
                            <th className="p-4 text-center rounded-tr-xl">Tendência</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs">
                        {sortedCategories.map((category) => {
                            const stats = category.simuladoStats || { history: [], trend: 'stable' };
                            const history = stats.history || [];

                            const totalQuestions = history.reduce((acc, h) => acc + (parseInt(h.total, 10) || 0), 0);
                            const totalCorrect = history.reduce((acc, h) => acc + (parseInt(h.correct, 10) || 0), 0);
                            const totalWrong = totalQuestions - totalCorrect;
                            const netBalance = totalCorrect - totalWrong;
                            const percentCorrect = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

                            let trendIcon = <Minus size={14} className="text-slate-500" />;
                            if (stats.trend === 'up') trendIcon = <TrendingUp size={14} className="text-green-400 drop-shadow-[0_0_5px_rgba(34,197,94,0.5)]" />;
                            if (stats.trend === 'down') trendIcon = <TrendingDown size={14} className="text-red-400 drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]" />;

                            return (
                                <tr key={category.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="p-4 pl-10">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xl opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-transform duration-300 drop-shadow-sm">{category.icon || '📚'}</span>
                                            <span className="font-bold text-sm tracking-wide" style={{ color: category.color }}>{category.name}</span>
                                        </div>
                                    </td>

                                    <td className="p-4 text-left w-1/3">
                                        <div className="flex flex-col gap-1.5 w-full max-w-sm">
                                            <div className="flex justify-between text-[10px] font-mono tracking-tight">
                                                <span className="text-green-400 font-bold">{totalCorrect} acertos</span>
                                                <span className="text-slate-500">{totalQuestions} total</span>
                                                <span className="text-red-400 font-bold">{totalWrong} erros</span>
                                            </div>
                                            {/* Stacked Bar Flow */}
                                            <div className="h-1.5 w-full bg-slate-800/80 rounded-full overflow-hidden flex shadow-inner group-hover:h-2 transition-all duration-300">
                                                <div
                                                    className="h-full bg-green-500 hover:bg-green-400 transition-colors shadow-[0_0_10px_rgba(34,197,94,0.3)]"
                                                    style={{ width: `${percentCorrect}%` }}
                                                    title={`${percentCorrect}% Acertos`}
                                                />
                                                <div
                                                    className="h-full bg-red-500 hover:bg-red-400 transition-colors shadow-[0_0_10px_rgba(239,68,68,0.3)]"
                                                    style={{ width: `${totalQuestions > 0 ? 100 - percentCorrect : 0}%` }}
                                                    title={`${100 - percentCorrect}% Erros`}
                                                />
                                            </div>
                                        </div>
                                    </td>

                                    <td className="p-4 text-center">
                                        <div className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-lg border font-black font-mono shadow-sm ${netBalance > 0 ? 'bg-green-500/10 border-green-500/30 text-green-400' :
                                            netBalance < 0 ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                                                'bg-slate-500/10 border-slate-500/30 text-slate-400'
                                            }`}>
                                            <Wallet size={12} className="opacity-80" />
                                            {netBalance > 0 ? `+${netBalance}` : netBalance}
                                        </div>
                                    </td>

                                    <td className="p-4 text-center">
                                        <span className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-black font-mono tracking-wider shadow-sm ${percentCorrect >= 80 ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                                                percentCorrect >= 60 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                                                    percentCorrect > 0 ? 'bg-red-500/20 text-red-500 border border-red-500/30' :
                                                        'bg-slate-800 text-slate-500 border border-white/5'
                                            }`}>
                                            {percentCorrect}%
                                        </span>
                                    </td>

                                    <td className="p-4 text-center">
                                        <div className="flex justify-center p-2 rounded-lg bg-black/30 w-10 h-10 mx-auto items-center border border-white/5 group-hover:border-white/10 transition-colors">
                                            {trendIcon}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}

                        {sortedCategories.length === 0 && (
                            <tr>
                                <td colSpan="7" className="p-8 text-center text-slate-500">
                                    Nenhuma disciplina cadastrada.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PerformanceTable;
