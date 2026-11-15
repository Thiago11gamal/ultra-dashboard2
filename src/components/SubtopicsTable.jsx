import React, { useState, useMemo } from 'react';
import { Target, Hash, Wallet, Minus, TrendingUp, TrendingDown, Search, Filter, X, ArrowUpDown, ChevronUp, ChevronDown, CheckCircle2 } from 'lucide-react';
import { getSafeScore } from '../utils/scoreHelper';
import { calculateSlope, getSortedHistory } from '../engine';
import { resolveCategoryDomain, extractQuestionCounts, toSafeArray } from '../utils/tasksStatsHelper';

const normalizeTopicKey = (value) =>
    String(value || '')
        .trim()
        .replace(/\s+/g, ' ')
        .toLowerCase();

const SubtopicsTable = ({ categories = [], maxScore = 100, minScore = 0 }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [sortColumn, setSortColumn] = useState('balance');
    const [sortDirection, setSortDirection] = useState('desc');

    const safeCategories = useMemo(() => {
        return toSafeArray(categories);
    }, [categories]);

    // 1. Normalizar e estabilizar categories
    const stableCategories = useMemo(() => {
        return safeCategories.map(cat => ({
            ...cat,
            tasks: toSafeArray(cat?.tasks),
        }));
    }, [safeCategories]);

    // 2. Criar fingerprint abrangente (inclui tarefas, status e tópicos do histórico)
    const categoriesFingerprint = useMemo(() => {
        return stableCategories.map(c => {
        const history = toSafeArray(c.simuladoStats?.history);
        const tasksHash = (c.tasks || []).map(tsk =>
            `${tsk?.id ?? ''}:${tsk?.title || tsk?.text || ''}:${tsk?.completed ? 1 : 0}`
        ).join(',');
        const scoresHash = history.map(item => {
            const topicsList = toSafeArray(item?.topics);
            const topicsPart = topicsList.map(t =>
                `${t?.taskId ?? ''}:${t?.name ?? ''}:${t?.score ?? ''}:${t?.correct ?? ''}:${t?.wrong ?? ''}:${t?.total ?? ''}`
            ).join(';');
            return `${item?.date || item?.createdAt || ''}:${item?.score ?? ''}:${item?.correct ?? ''}:${item?.total ?? ''}:[${topicsPart}]`;
        }).join('|');
        return `${c.id ?? c.name}:${c.name || ''}:${c.color || ''}:${c.icon || ''}:${c.maxScore ?? ''}:${c.minScore ?? ''}:${tasksHash}:${scoresHash}`;
    }).join('||');
}, [stableCategories]);

// 3. useMemo com fingerprint estável e escopo seguro por disciplina
const subtopics = useMemo(() => {
    const topicMap = {};
    const taskIdToKeyMap = {};

    stableCategories.forEach(cat => {
        const { maxScore: catMaxScore, minScore: catMinScore, range: catRange } = resolveCategoryDomain(
            cat,
            maxScore,
            minScore
        );
        const catId = String(cat.id ?? cat.name ?? 'default');

        const tasks = cat.tasks || [];
        tasks.forEach(tsk => {
            const rawName = String(tsk?.title || tsk?.text || '').trim();
            if (!rawName) return;
            const normName = normalizeTopicKey(rawName);
            const key = `${catId}:::${normName}`;
            if (tsk?.id) {
                taskIdToKeyMap[`${catId}:::${String(tsk.id).trim()}`] = key;
            }
            if (!topicMap[key]) {
                topicMap[key] = {
                    id: key,
                    taskId: tsk?.id || null,
                    name: rawName,
                    completed: Boolean(tsk?.completed),
                    priority: tsk?.priority || null,
                    categoryId: catId,
                    parentCategory: cat.name || 'Disciplina',
                    categoryColor: cat.color,
                    categoryIcon: cat.icon,
                    catMaxScore,
                    catMinScore,
                    catRange,
                    correct: 0,
                    wrong: 0,
                    total: 0,
                    trendHistory: [],
                };
            } else if (tsk?.completed) {
                topicMap[key].completed = true;
            }
        });

        const history = toSafeArray(cat.simuladoStats?.history).filter(
            h => h && typeof h === 'object' && h.valid !== false && h.validated !== false
        );

        history.forEach(h => {
            const histDate = h.date || h.createdAt;
                const topicsList = toSafeArray(h.topics);

                topicsList.forEach(t => {
                    if (!t || typeof t !== 'object') return;
                    const rawName = String(t.name || t.topic || t.title || '').trim();
                    const rawTaskId = t.taskId || t.topicId || null;

                    let key = null;
                    if (rawTaskId && taskIdToKeyMap[`${catId}:::${String(rawTaskId).trim()}`]) {
                        key = taskIdToKeyMap[`${catId}:::${String(rawTaskId).trim()}`];
                    } else if (rawName) {
                        key = `${catId}:::${normalizeTopicKey(rawName)}`;
                    }

                    if (!key) return;

                    if (!topicMap[key]) {
                        topicMap[key] = {
                            id: key,
                            taskId: rawTaskId,
                            name: rawName,
                            completed: false,
                            priority: null,
                            categoryId: catId,
                            parentCategory: cat.name || 'Disciplina',
                            categoryColor: cat.color,
                            categoryIcon: cat.icon,
                            catMaxScore,
                            catMinScore,
                            catRange,
                            correct: 0,
                            wrong: 0,
                            total: 0,
                            trendHistory: [],
                        };
                    }

                        const counts = extractQuestionCounts(t, catMaxScore, catMinScore);
                        if (counts.valid && counts.total > 0) {
                            topicMap[key].correct += counts.correct;
                            topicMap[key].wrong += counts.wrong;
                            topicMap[key].total += counts.total;
                        }

                            const topicScore = getSafeScore(t, catMaxScore, catMinScore);
                            if (histDate && Number.isFinite(topicScore)) {
                                topicMap[key].trendHistory.push({ date: histDate, score: topicScore });
                            }
                        });
            });
        });

        return Object.values(topicMap)
            .map(t => {
                const balance = t.correct - t.wrong;
                const percent = t.total > 0 ? Math.round((t.correct / t.total) * 100) : 0;
                const sortedTrend = getSortedHistory(t.trendHistory || []).slice(-10);
                const trendValue = sortedTrend.length >= 3
                    ? calculateSlope(sortedTrend, t.catMaxScore, { minScore: t.catMinScore })
                    : 0;
                const safeCatRange = Number.isFinite(t.catRange) && t.catRange > 0
                    ? t.catRange
                    : Math.max(1e-9, t.catMaxScore - (t.catMinScore || 0));
                const trendTolerance = 0.0167 * (safeCatRange / 100);
                const trend = trendValue > trendTolerance
                    ? 'up'
                    : trendValue < -trendTolerance
                        ? 'down'
                        : 'stable';
                return { ...t, balance, percent, trendValue, trend };
            })
            .sort((a, b) => b.balance - a.balance || b.percent - a.percent || b.total - a.total || (a.name || '').localeCompare(b.name || ''));
    // eslint-disable-next-line react-hooks/exhaustive-deps
}, [stableCategories, categoriesFingerprint, maxScore, minScore]);

// Opções de disciplinas para o filtro
const categoryOptions = useMemo(() => {
    return stableCategories.map(c => ({
        id: String(c.id ?? c.name),
        name: c.name || 'Sem Nome'
    }));
}, [stableCategories]);

// Resolver categoria selecionada válida sem setState em useEffect
const effectiveSelectedCategory = useMemo(() => {
    if (selectedCategory === 'ALL') return 'ALL';
    return categoryOptions.some(opt => opt.id === selectedCategory) ? selectedCategory : 'ALL';
}, [selectedCategory, categoryOptions]);

// Filtragem e ordenação dinâmica
const filteredSubtopics = useMemo(() => {
    return subtopics.filter(item => {
        const term = searchTerm.trim().toLowerCase();
        const matchesSearch = !term ||
            item.name.toLowerCase().includes(term) ||
            (item.parentCategory || '').toLowerCase().includes(term);

        const matchesCategory = effectiveSelectedCategory === 'ALL' ||
            item.categoryId === effectiveSelectedCategory ||
            item.parentCategory === effectiveSelectedCategory;

        let matchesStatus = true;
        if (statusFilter === 'WITH_DATA') {
            matchesStatus = item.total > 0;
        } else if (statusFilter === 'COMPLETED') {
            matchesStatus = Boolean(item.completed);
        } else if (statusFilter === 'PENDING') {
            matchesStatus = !item.completed;
        }

        return matchesSearch && matchesCategory && matchesStatus;
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
                comparison = a.balance - b.balance;
        }
        if (comparison !== 0) {
            return sortDirection === 'desc' ? -comparison : comparison;
        }
        if (b.percent !== a.percent) return b.percent - a.percent;
        if (b.total !== a.total) return b.total - a.total;
        return (a.name || '').localeCompare(b.name || '');
    });
    }, [subtopics, searchTerm, effectiveSelectedCategory, statusFilter, sortColumn, sortDirection]);

const handleSort = (column) => {
    if (!column) return;
    if (sortColumn === column) {
        setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
        setSortColumn(column);
        setSortDirection(column === 'name' ? 'asc' : 'desc');
    }
};

    const renderSortableHeader = (column, title, className = '', alignCenter = true) => (
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
                <div className={`flex items-center gap-1.5 ${alignCenter ? 'justify-center' : ''}`}>
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

const hasActiveFilters = Boolean(searchTerm || effectiveSelectedCategory !== 'ALL' || statusFilter !== 'ALL');

return (
    <div className="w-full rounded-2xl border border-white/5 bg-slate-950/40 backdrop-blur-xl overflow-hidden shadow-2xl">
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

            {/* Controles: Busca e Filtros */}
            <div className="flex flex-wrap items-center gap-2.5">
                {/* Campo de Busca */}
                    <div className="relative flex-1 sm:w-56 min-w-[170px]">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar assunto..."
                            aria-label="Buscar assunto"
                            className="w-full bg-slate-950/80 border border-white/10 rounded-xl pl-9 pr-8 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50 transition-colors"
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() => setSearchTerm('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-0.5 cursor-pointer"
                                title="Limpar busca"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>

                    {/* Filtro por Status */}
                    <div className="relative min-w-[140px]">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            aria-label="Filtrar por status do assunto"
                            className="w-full appearance-none bg-slate-950/80 border border-white/10 rounded-xl pl-3 pr-8 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500/50 transition-colors cursor-pointer"
                        >
                            <option value="ALL">Todos os Status</option>
                            <option value="WITH_DATA">Com Questões</option>
                            <option value="COMPLETED">Concluídos</option>
                            <option value="PENDING">Pendentes</option>
                        </select>
                        <Filter size={11} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                    </div>

                    {/* Filtro por Disciplina */}
                    {categoryOptions.length > 1 && (
                        <div className="relative min-w-[150px]">
                            <select
                                value={effectiveSelectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                aria-label="Filtrar por disciplina"
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
                            {renderSortableHeader('name', 'Assunto', 'w-72 md:w-80 border-r border-white/5', false)}
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
                            const isTopThree = index < 3 && totalQuestions > 0;
                            const rankColor = isTopThree
                                ? (index === 0 ? 'text-yellow-400' : index === 1 ? 'text-slate-300' : 'text-amber-600')
                                : 'text-slate-600';

                            return (
                                <tr key={item.id} className="group hover:bg-white/[0.02] transition-all duration-300">
                                    <td className="p-5 pl-8 text-center align-middle text-slate-500 font-black">
                                        <span className={rankColor}>{index + 1}º</span>
                                    </td>
                                    <td className="p-5 border-r border-white/5 align-middle">
                                        <div className="flex flex-col justify-center min-w-0">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <span className="font-bold text-sm truncate text-slate-300" title={item.name}>
                                                    {item.name}
                                                </span>
                                                {item.completed && (
                                                    <span title="Tópico concluído no edital" className="inline-flex flex-shrink-0">
                                                        <CheckCircle2
                                                            size={13}
                                                            className="text-emerald-400"
                                                            aria-hidden="true"
                                                        />
                                                    </span>
                                                )}
                                            </div>
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
                                            <div className="w-12 h-12 rounded-xl bg-black/40 flex items-center justify-center border border-white/5 shadow-inner" title={`Tendência recente: ${item.trendValue > 0 ? '+' : ''}${(item.trendValue || 0).toFixed(3)} pts/dia`}>
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
                                            {hasActiveFilters
                                                ? 'Nenhum assunto encontrado para os filtros selecionados'
                                                : 'Nenhum assunto registrado na base'}
                                        </span>
                                            { hasActiveFilters && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSearchTerm('');
                                                        setSelectedCategory('ALL');
                                                        setStatusFilter('ALL');
                                                    }}
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

        export default React.memo(SubtopicsTable);
