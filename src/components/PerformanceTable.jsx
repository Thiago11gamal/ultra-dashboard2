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
                            <th className="p-3 pl-10">Disciplina</th>
                            <th className="p-3 text-center">Questões</th>
                            <th className="p-3 text-center text-green-400">Acertos</th>
                            <th className="p-3 text-center text-red-400">Erros</th>
                            <th className="p-3 text-center text-yellow-400">Saldo</th>
                            <th className="p-3 text-center text-orange-400">% ACERTOS</th>
                            <th className="p-3 text-center">Tendência</th>
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
                            if (stats.trend === 'up') trendIcon = <TrendingUp size={14} className="text-green-400" />;
                            if (stats.trend === 'down') trendIcon = <TrendingDown size={14} className="text-red-400" />;

                            return (
                                <tr key={category.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="p-3 pl-10">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xl opacity-80 group-hover:opacity-100 transition-opacity">{category.icon || '📚'}</span>
                                            <span className="font-semibold text-sm" style={{ color: category.color }}>{category.name}</span>
                                        </div>
                                    </td>
                                    <td className="p-3 text-center font-mono text-slate-300">{totalQuestions}</td>
                                    <td className="p-3 text-center font-mono text-green-400 font-bold">{totalCorrect}</td>
                                    <td className="p-3 text-center font-mono text-red-400 font-bold">{totalWrong}</td>
                                    <td className="p-3 text-center">
                                        <div className={`inline-flex items-center justify-center gap-1.5 px-2 py-0.5 rounded-lg border font-bold font-mono ${netBalance > 0 ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                                            netBalance < 0 ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                                                'bg-slate-500/10 border-slate-500/20 text-slate-400'
                                            }`}>
                                            <Wallet size={12} />
                                            {netBalance > 0 ? `+${netBalance}` : netBalance}
                                        </div>
                                    </td>
                                    <td className={`p-3 text-center font-mono font-bold ${percentCorrect >= 80 ? 'text-green-400' : 'text-red-400'}`}>{percentCorrect}%</td>
                                    <td className="p-3 text-center">
                                        <div className="flex justify-center">{trendIcon}</div>
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
