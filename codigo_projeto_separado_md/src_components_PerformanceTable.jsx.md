# src\components\PerformanceTable.jsx

```jsx
import React, { useState, useMemo, useRef } from 'react';
import { TrendingUp, TrendingDown, Minus, Wallet, Trophy, Target, Hash } from 'lucide-react';
import { getSafeScore } from '../utils/scoreHelper';
import { calculateSlope, getSortedHistory } from '../engine';

const PerformanceTable = ({ categories = [] }) => {
    const [sortColumn, setSortColumn] = useState('balance');
    const [sortDirection, setSortDirection] = useState('desc');
    const [focusedRow, setFocusedRow] = useState(-1);
    const tableRef = useRef(null);

    const safeCategories = Array.isArray(categories) ? categories : Object.values(categories || {});

    // FIX 5.6a: Ordenação com estado acessível
    const sortedCategories = useMemo(() => {
        const stats = safeCategories.map(cat => {
            const statsObj = cat.simuladoStats || { history: [] };
            const historyRaw = statsObj.history || [];
            const history = Array.isArray(historyRaw) ? historyRaw : Object.values(historyRaw);

            let correct = 0, wrong = 0, totalQuestions = 0;
            const ms = cat.maxScore ?? 100;

            for (let i = 0; i < history.length; i++) {
                const h = history[i];
                const t = parseInt(h.total, 10) || 0;
                const c = (getSafeScore(h, ms) / ms * t);
                correct += c;
                wrong += (t - c);
                
                const parsedTotal = parseInt(h.total, 10);
                if (Number.isFinite(parsedTotal) && parsedTotal > 0) {
                    totalQuestions += parsedTotal;
                } else {
                    totalQuestions += Math.max(0, (Number(h.correct) || 0) + (Number(h.wrong) || 0));
                }
            }
            
            const balance = Math.max(0, Math.round(correct)) - Math.max(0, totalQuestions - Math.max(0, Math.round(correct)));

            return { ...cat, totalVolume: totalQuestions, balance, correct, wrong };
        });

        return stats.sort((a, b) => {
            let comparison = 0;
            switch (sortColumn) {
                case 'balance':
                    comparison = a.balance - b.balance;
                    break;
                case 'totalVolume':
                    comparison = a.totalVolume - b.totalVolume;
                    break;
                case 'name':
                    comparison = (a.name || '').localeCompare(b.name || '');
                    break;
                default:
                    comparison = b.balance - a.balance;
            }
            return sortDirection === 'desc' ? -comparison : comparison;
        });
    }, [safeCategories, sortColumn, sortDirection]);

    // FIX 5.6b: Navegação por teclado
    const handleKeyDown = (e) => {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setFocusedRow(prev => Math.min(prev + 1, sortedCategories.length - 1));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setFocusedRow(prev => Math.max(prev - 1, 0));
                break;
            case 'Home':
                e.preventDefault();
                setFocusedRow(0);
                break;
            case 'End':
                e.preventDefault();
                setFocusedRow(sortedCategories.length - 1);
                break;
        }
    };

    const handleSort = (column) => {
        if (sortColumn === column) {
            setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc');
        } else {
            setSortColumn(column);
            setSortDirection('desc');
        }
    };

    // FIX 5.6c: Cabeçalho acessível com aria-sort
    const renderSortableHeader = (column, children, className) => (
        <th 
            className={`p-5 cursor-pointer hover:bg-white/5 transition-colors select-none ${className}`}
            role="columnheader"
            aria-sort={sortColumn === column ? (sortDirection === 'desc' ? 'descending' : 'ascending') : 'none'}
            onClick={() => handleSort(column)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSort(column);
                }
            }}
            tabIndex={0}
        >
            <div className="flex items-center gap-2">
                {children}
            </div>
        </th>
    );

    return (
        <div 
            className="w-full rounded-2xl border border-white/5 bg-slate-950/40 backdrop-blur-xl overflow-hidden shadow-2xl mt-8"
            ref={tableRef}
            onKeyDown={handleKeyDown}
        >
            {/* FIX 5.6d: Linhas com roles e foco gerenciado */}
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto w-full custom-scrollbar">
                <table className="w-full text-left border-collapse table-fixed min-w-[900px]" role="table">
                    <thead className="bg-slate-900/50 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/5 sticky top-0 z-10">
                        <tr>
                            <th className="p-5 pl-8 w-16 text-center">#</th>
                            {renderSortableHeader('name', 'Disciplina', 'w-72 md:w-80 border-r border-white/5')}
                            {renderSortableHeader('totalVolume', <div className="flex items-center justify-center gap-2 w-full"><Hash size={12} className="text-slate-600" /> Volume</div>, 'text-center w-28 md:w-32')}
                            <th className="p-5 text-center w-32 md:w-40"><div className="flex items-center justify-center gap-2"><Target size={12} className="text-slate-600" /> Desempenho</div></th>
                            {renderSortableHeader('balance', <div className="flex items-center justify-center gap-2 w-full"><Wallet size={12} className="text-slate-600" /> Saldo</div>, 'text-center w-32 md:w-36 border-l border-white/5')}
                            <th className="p-5 text-center w-24 md:w-28">Acertos%</th>
                            <th className="p-5 text-center w-24 md:w-28 lg:w-32 rounded-tr-xl border-l border-white/5">Tendência</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03] text-xs" role="rowgroup">
                        {sortedCategories.map((category, index) => {
                            const stats = category.simuladoStats || { history: [], trend: 'stable' };
                            const historyRaw = stats.history || [];
                            const history = Array.isArray(historyRaw) ? historyRaw : Object.values(historyRaw);
                            const ms = category.maxScore ?? 100;

                            const totalQuestions = category.totalVolume;
                            const totalCorrect = Math.max(0, Math.round(category.correct));
                            const totalWrong = Math.max(0, totalQuestions - totalCorrect);
                            const netBalance = category.balance;
                            const percentCorrect = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
                            const pctBar = percentCorrect;

                            const trendHistory = getSortedHistory(history)
                                .slice(-10)
                                .map(h => ({
                                    score: getSafeScore(h, ms),
                                    date: h.date
                                }));
                            const trendValue = trendHistory.length >= 3 ? calculateSlope(trendHistory, ms) : 0;
                            const trendTolerance = 0.0167 * (ms / 100);
                            const currentTrend = trendValue > trendTolerance ? 'up' : trendValue < -trendTolerance ? 'down' : 'stable';

                            const isTopThree = index < 3 && totalQuestions > 0;
                            const rankColor = index === 0 ? 'text-yellow-400' : index === 1 ? 'text-slate-300' : index === 2 ? 'text-amber-600' : 'text-slate-600';

                            let trendIcon = <Minus size={16} className="text-slate-600 opacity-50" />;
                            if (currentTrend === 'up') trendIcon = <TrendingUp size={18} className="text-green-400 drop-shadow-[0_0_8px_rgba(34,197,94,0.4)]" />;
                            if (currentTrend === 'down') trendIcon = <TrendingDown size={18} className="text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]" />;

                            return (
                                <tr 
                                    key={category.id}
                                    role="row"
                                    className={`group hover:bg-white/[0.02] transition-all duration-300 
                                               ${focusedRow === index ? 'bg-indigo-500/10 outline outline-2 outline-indigo-400' : ''}`}
                                    tabIndex={focusedRow === index ? 0 : -1}
                                    aria-selected={focusedRow === index}
                                    onClick={() => setFocusedRow(index)}
                                >
                                    <td className="p-5 pl-8 text-center" role="gridcell">
                                        <div className={`flex items-center justify-center font-black ${rankColor}`}>
                                            {isTopThree ? <Trophy size={16} className="mr-1 drop-shadow-[0_0_5px_rgba(234,179,8,0.3)]" /> : null}
                                            {index + 1}º
                                        </div>
                                    </td>
                                    <td className="p-5 border-r border-white/5" role="gridcell">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-slate-900/50 flex items-center justify-center border border-white/5 group-hover:border-white/10 group-hover:scale-110 transition-all duration-500 shadow-inner">
                                                <span className="text-xl">{category.icon || '📚'}</span>
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="font-bold text-sm break-words line-clamp-2 uppercase tracking-tight min-w-0 block pb-0.5" style={{ color: category.color }}>
                                                    {category.name}
                                                </span>
                                                <span className="text-[10px] text-slate-500 font-medium tracking-tight">Level {category.level || 0} Scholar</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-5 text-center" role="gridcell">
                                        <div className="flex flex-col items-center">
                                            <span className="font-mono text-sm font-black text-slate-300">{totalQuestions}</span>
                                            <span className="text-[8px] text-slate-500 uppercase tracking-widest font-black opacity-60">Questões</span>
                                        </div>
                                    </td>
                                    <td className="p-5" role="gridcell">
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
                                                <span className="text-green-500">{totalCorrect} AC</span>
                                                <span className="text-red-500">{Math.round(totalWrong)} ER</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-5 text-center border-l border-white/5" role="gridcell">
                                        <div className={`inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg border font-black font-mono shadow-xl transition-all duration-500 group-hover:scale-110 ${netBalance > 0 ? 'bg-green-500/10 border-green-500/20 text-green-400 shadow-green-500/5' :
                                            netBalance < 0 ? 'bg-red-500/10 border-red-500/20 text-red-400 shadow-red-500/5' :
                                                'bg-slate-800/50 border-white/5 text-slate-500'
                                            }`}>
                                            <span className="text-[11px]">{netBalance > 0 ? '+' : ''}{netBalance}</span>
                                            <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${netBalance > 0 ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.8)]' : netBalance < 0 ? 'bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.8)]' : 'bg-slate-600'}`} />
                                        </div>
                                    </td>
                                    <td className="p-5 text-center" role="gridcell">
                                        <div className={`relative inline-block px-3 py-1.5 rounded-lg font-black font-mono transition-all duration-500 ${percentCorrect >= 80 ? 'text-green-400 drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]' :
                                            percentCorrect >= 60 ? 'text-yellow-400' :
                                                percentCorrect > 0 ? 'text-red-500' :
                                                    'text-slate-500'
                                            }`}>
                                            <span className="text-sm tracking-tight">{percentCorrect}%</span>
                                            {percentCorrect >= 80 && <div className="absolute -top-1 -right-0.5 w-2 h-2 bg-green-500 rounded-full animate-ping opacity-75" />}
                                        </div>
                                    </td>
                                    <td className="p-5 text-center border-l border-white/5" role="gridcell">
                                        <div className="flex justify-center">
                                            <div className="w-12 h-12 rounded-xl bg-black/40 flex items-center justify-center border border-white/5 group-hover:border-white/20 group-hover:bg-black/60 transition-all duration-500 shadow-2xl relative overflow-hidden" title={`Tendência recente: ${trendValue > 0 ? '+' : ''}${trendValue.toFixed(3)} pts/registro`}>
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
                {[
                    { label: 'Dominante', dot: 'bg-green-500', hover: 'group-hover:text-green-400', glow: 'shadow-[0_0_10px_rgba(34,197,94,0.6)]' },
                    { label: 'Em Evolução', dot: 'bg-yellow-500', hover: 'group-hover:text-yellow-400', glow: 'shadow-[0_0_10px_rgba(234,179,8,0.6)]' },
                    { label: 'Crítico', dot: 'bg-red-500', hover: 'group-hover:text-red-400', glow: 'shadow-[0_0_10px_rgba(239,68,68,0.6)]' }
                ].map((item) => (
                    <div key={item.label} className="flex items-center gap-2.5 group cursor-help">
                        <div className={`w-2.5 h-2.5 rounded-full ${item.dot} ${item.glow} group-hover:scale-125 transition-transform`} />
                        <span className={`${item.hover} transition-colors`}>{item.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PerformanceTable;


```
