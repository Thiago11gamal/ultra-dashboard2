import React, { useState, useMemo } from 'react';
import { Target, Hash, Wallet, Minus, TrendingUp, TrendingDown, Search, Filter, X, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { getSafeScore } from '../utils/scoreHelper';
import { calculateSlope, getSortedHistory } from '../engine';

const SubtopicsTable = ({ categories = [], maxScore = 100, minScore = 0 }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('ALL');
    const [sortColumn, setSortColumn] = useState('balance');
    const [sortDirection, setSortDirection] = useState('desc');

    const safeCategories = useMemo(() => {
        return Array.isArray(categories) ? categories.filter(Boolean) : Object.values(categories || {}).filter(Boolean);
    }, [categories]);

    // 1. Normalizar e estabilizar categories
    const stableCategories = useMemo(() => {
        return safeCategories.map(cat => ({
            ...cat,
            tasks: Array.isArray(cat?.tasks) ? cat.tasks : Object.values(cat?.tasks || {}),
        }));
    }, [safeCategories]);

    // 2. Criar fingerprint estável para evitar re-execução por referência
    const categoriesFingerprint = useMemo(() => {
        return stableCategories.map(c => {
            const h = c.simuladoStats?.history || [];
            const history = Array.isArray(h) ? h : Object.values(h || {});
            const scoresHash = history.map(item =>
                `${item?.score ?? ''}:${item?.correct ?? ''}:${item?.total ?? ''}`
            ).join('|');
            return `${c.id || c.name}:${c.name || ''}:${(c.tasks || []).length}:${history.length}:${scoresHash}`;
        }).join('|');
    }, [stableCategories]);

    // 3. useMemo com fingerprint estável e escopo seguro por disciplina
    const subtopics = useMemo(() => {
        const topicMap = {};
        stableCategories.forEach(cat => {
            const catMinScore = Number.isFinite(Number(cat.minScore))
                ? Number(cat.minScore)
                : (Number.isFinite(Number(minScore)) ? Number(minScore) : 0);
            const catMaxScore = Number(cat.maxScore) > 0
                ? Number(cat.maxScore)
                : (Number(maxScore) || 100);
            const catId = cat.id || cat.name || 'default';

            const tasks = cat.tasks || [];
            tasks.forEach(tsk => {
                const name = String(tsk?.title || tsk?.text || '').trim();
                if (!name) return;
                // FIX: Chave escopada pela categoria para evitar colisão entre disciplinas distintas
                const key = `${catId}:::${name.toLowerCase()}`;
                if (!topicMap[key]) {
                    topicMap[key] = {
                        id: key,
                        name,
                        categoryId: catId,
                        parentCategory: cat.name || 'Disciplina',
                        categoryColor: cat.color,
                        categoryIcon: cat.icon,
                        catMaxScore,
                        catMinScore,
                        correct: 0,
                        wrong: 0,
                        total: 0,
                        trendHistory: [],
                    };
                }
            });

            const historyRaw = cat.simuladoStats?.history;
            const history = historyRaw
                ? (Array.isArray(historyRaw) ? historyRaw : Object.values(historyRaw))
                : [];

            history.forEach(h => {
                const histDate = h.date || h.createdAt;
                (h.topics || []).forEach(t => {
                    const name = String(t.name || '').trim();
                    if (!name) return;
                    const key = `${catId}:::${name.toLowerCase()}`;
                    if (!topicMap[key]) {
                        topicMap[key] = {
                            id: key,
                            name,
                            categoryId: catId,
                            parentCategory: cat.name || 'Disciplina',
                            categoryColor: cat.color,
                            categoryIcon: cat.icon,
                            catMaxScore,
                            catMinScore,
                            correct: 0,
                            wrong: 0,
                            total: 0,
                            trendHistory: [],
                        };
                    }
                    const totalParsed = Number.isFinite(parseInt(t.total, 10)) ? parseInt(t.total, 10) : 0;
                    const total = totalParsed > 0 ? totalParsed : Math.max(0, (Number(t.correct) || 0) + (Number(t.wrong) || 0));
                    const catRange = Math.max(1e-9, catMaxScore - catMinScore);

                    const rawC = Number(t.correct);
                    let correctCount = (Number.isFinite(rawC) && !t.isPercentage) ? rawC : NaN;
                    if (!Number.isFinite(correctCount)) {
                        const score = getSafeScore(t, catMaxScore, catMinScore);
                        if (Number.isFinite(score) && total > 0) {
                            correctCount = Math.round(((score - catMinScore) / catRange) * total);
                        } else {
                            correctCount = 0;
                        }
                    }
                    correctCount = Math.max(0, Math.min(total, Number.isFinite(correctCount) ? correctCount : 0));
                    const wrongCount = Math.max(0, total - correctCount);
                    topicMap[key].correct += correctCount;
                    topicMap[key].wrong += wrongCount;
                    topicMap[key].total += total;

                    // FIX: Aceita h.date ou h.createdAt para não perder histórico de tendência
                    if (histDate && Number.isFinite(Number(getSafeScore(t, catMaxScore, catMinScore)))) {
                        topicMap[key].trendHistory.push({ date: histDate, score: getSafeScore(t, catMaxScore, catMinScore) });
                    }
                });
            });
        });

        return Object.values(topicMap)
            .map(t => {
                const balance = t.correct - t.wrong;
                const percent = t.total > 0 ? Math.round((t.correct / t.total) * 100) : 0;
                const sortedTrend = getSortedHistory(t.trendHistory || []).slice(-10);
                // FIX: Passa catMinScore para calculateSlope para não distorcer escalas com piso != 0
                const trendValue = sortedTrend.length >= 3 ? calculateSlope(sortedTrend, t.catMaxScore, { minScore: t.catMinScore }) : 0;
                const trendTolerance = 0.0167 * (t.catMaxScore / 100);
                const trend = trendValue > trendTolerance ? 'up' : trendValue < -trendTolerance ? 'down' : 'stable';
                return { ...t, balance, percent, trendValue, trend };
            })
            .sort((a, b) => b.balance - a.balance);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stableCategories, categoriesFingerprint, maxScore, minScore]);

    // Opções de disciplinas para o filtro
    const categoryOptions = useMemo(() => {
        return stableCategories.map(c => ({
            id: c.id || c.name,
            name: c.name || 'Sem Nome'
        }));
    }, [stableCategories]);

    // Filtragem e ordenação dinâmica
    const filteredSubtopics = useMemo(() => {
        return subtopics.filter(item => {
            const term = searchTerm.trim().toLowerCase();
            const matchesSearch = !term ||
                item.name.toLowerCase().includes(term) ||
                (item.parentCategory || '').toLowerCase().includes(term);

            const matchesCategory = selectedCategory === 'ALL' ||
                item.categoryId === selectedCategory ||
                item.parentCategory === selectedCategory;

            return matchesSearch && matchesCategory;
        }).sort((a, b) => {
            let comparison = 0;
            switch (sortColumn) {
                case 'name':
                    comparison = (a.name || '').localeCompare(b.name || '');
                    break;
                case 'parentCategory':
                    comparison = (a.parentCategory || '').localeCompare(b.parentCategory || '');
                    break;
                case 'total':
                    comparison = a.total - b.total;
                    break;
                case 'balance':
                    comparison = a.balance - b.balance;
                    break;
                case 'percent':
                    comparison = a.percent - b.percent;
                    break;
                case 'trendValue':
                    comparison = a.trendValue - b.trendValue;
                    break;
                default:
                    comparison = b.balance - a.balance;
            }
            return sortDirection === 'desc' ? -comparison : comparison;
        });
    }, [subtopics, searchTerm, selectedCategory, sortColumn, sortDirection]);

    const handleSort = (column) => {
        if (!column) return;
        if (sortColumn === column) {
            setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc');
        } else {
            setSortColumn(column);
            setSortDirection('desc');
        }
    };

    const renderSortableHeader = (column, title, className = '') => (
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
            <div className="flex items-center gap-1.5 justify-center">
                <span>{title}</span>
                {sortColumn === column ? (
                    sortDirection === 'desc' ? <ChevronDown size={12} className="text-amber-400" /> : <ChevronUp size={12} className="text-amber-400" />
                ) : (
                    <ArrowUpDown size={10} className="text-slate-600 opacity-60" />
                )}
            </div>
        </th>
    );

    if (safeCategories.length === 0) {
        return (
            <div className="flex items-center justify-center p-12 text-slate-500 w-full rounded-2xl border border-white/5 bg-slate-950/40">
                Nenhuma disciplina cadastrada ainda.
            </div>
        );
    }

    return (
        <div className="w-full rounded-2xl border border-white/5 bg-slate-950/40 backdrop-blur-xl overflow-hidden shadow-2xl mt-8">
            {/* Header da Tabela com Barra de Pesquisa e Filtros */}
            <div className="bg-slate-900/80 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 text-amber-500 shadow-sm">
                        <Target size={18} />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-200 text-sm md:text-base flex items-center gap-2">
                            Rendimento por Assuntos Específicos
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-white/5">
                                {filteredSubtopics.length} {filteredSubtopics.length === 1 ? 'assunto' : 'assuntos'}
                            </span>
                        </h3>
                        <p className="text-[11px] text-slate-500">Métricas analíticas consolidadas por tópico do edital</p>
                    </div>
                </div>

                {/* Controles: Busca e Filtro de Matéria */}
                <div className="flex flex-wrap items-center gap-2.5">
                    {/* Campo de Busca */}
                    <div className="relative flex-1 sm:w-60 min-w-[180px]">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar assunto..."
                            className="w-full bg-slate-950/80 border border-white/10 rounded-xl pl-9 pr-8 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50 transition-colors"
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() => setSearchTerm('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-0.5"
                                title="Limpar busca"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>

                    {/* Filtro por Disciplina */}
                    {categoryOptions.length > 1 && (
                        <div className="relative min-w-[150px]">
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="w-full appearance-none bg-slate-950/80 border border-white/10 rounded-xl pl-3 pr-8 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500/50 transition-colors cursor-pointer"
                            >
                                <option value="ALL">Todas as Matérias</option>
                                {categoryOptions.map(cat => (
                                    <option key={cat.id} value={cat.id}>
                                        {cat.name}
                                    </option>
                                ))}
                            </select>
                            <Filter size={11} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                        </div>
                    )}
                </div>
            </div>

            <div className="overflow-x-auto max-h-[500px] overflow-y-auto w-full custom-scrollbar">
                <table className="w-full text-left border-collapse table-fixed min-w-[900px]" role="grid">
                    <thead className="bg-slate-900/50 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/5 sticky top-0 z-10">
                        <tr>
                            <th className="p-5 pl-8 w-16 text-center">#</th>
                            <th
                                className="p-5 w-72 md:w-80 border-r border-white/5 cursor-pointer hover:bg-white/5 transition-colors select-none"
                                role="columnheader"
                                aria-sort={sortColumn === 'name' ? (sortDirection === 'desc' ? 'descending' : 'ascending') : 'none'}
                                onClick={() => handleSort('name')}
                                tabIndex={0}
                            >
                                <div className="flex items-center gap-1.5">
                                    <span>Assunto</span>
                                    {sortColumn === 'name' ? (
                                        sortDirection === 'desc' ? <ChevronDown size={12} className="text-amber-400" /> : <ChevronUp size={12} className="text-amber-400" />
                                    ) : (
                                        <ArrowUpDown size={10} className="text-slate-600 opacity-60" />
                                    )}
                                </div>
                            </th>
                            {renderSortableHeader('total', <div className="flex items-center justify-center gap-1.5"><Hash size={12} className="text-slate-600" /> Volume</div>, 'text-center w-28 md:w-32')}
                            <th className="p-5 text-center w-32 md:w-40"><div className="flex items-center justify-center gap-2"><Target size={12} className="text-slate-600" /> Desempenho</div></th>
                            {renderSortableHeader('balance', <div className="flex items-center justify-center gap-1.5"><Wallet size={12} className="text-slate-600" /> Saldo</div>, 'text-center w-32 md:w-36 border-l border-white/5')}
                            {renderSortableHeader('percent', 'Acertos%', 'text-center w-24 md:w-28')}
                            {renderSortableHeader('trendValue', 'Tendência', 'text-center w-24 md:w-28 lg:w-32 rounded-tr-xl border-l border-white/5')}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03] text-xs" role="rowgroup">
                        {filteredSubtopics.map((item, index) => {
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
                                                {item.categoryIcon || '📚'} {item.parentCategory}
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
                                                        const scorePct = Math.max(0, Math.min(100, Number(percentCorrect) || 0));
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
                                        <div className={`relative inline-block px-3 py-1.5 rounded-lg font-black font-mono transition-all duration-500 ${percentCorrect >= 80 ? 'text-green-400' :
                                            percentCorrect >= 60 ? 'text-yellow-400' : percentCorrect > 0 ? 'text-red-500' : 'text-slate-500'}`}>
                                            <span className="text-sm tracking-tight">{percentCorrect}%</span>
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

                        {filteredSubtopics.length === 0 && (
                            <tr>
                                <td colSpan="7" className="p-16 text-center">
                                    <div className="flex flex-col items-center gap-3 opacity-40">
                                        <Target size={40} className="text-slate-500" />
                                        <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                                            {searchTerm || selectedCategory !== 'ALL'
                                                ? 'Nenhum assunto encontrado para os filtros selecionados'
                                                : 'Nenhum assunto registrado na base'}
                                        </span>
                                        {(searchTerm || selectedCategory !== 'ALL') && (
                                            <button
                                                type="button"
                                                onClick={() => { setSearchTerm(''); setSelectedCategory('ALL'); }}
                                                className="text-[11px] text-amber-400 hover:underline cursor-pointer"
                                            >
                                                Limpar filtros de busca
                                            </button>
                                        )}
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
