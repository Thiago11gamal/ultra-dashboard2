import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { Gauge, TrendingUp, TrendingDown, Minus, Settings2 } from 'lucide-react';
import {
    computeCategoryStats,
    monteCarloSimulation,
    calculateCurrentWeightedMean,
    calculateWeightedProjectedMean,
    computePooledSD
} from '../engine';
import { useAppStore } from '../store/useAppStore';
import { getSafeScore } from '../utils/scoreHelper';
import { GaussianPlot } from './charts/GaussianPlot';
import { MonteCarloConfig } from './charts/MonteCarloConfig';

export default function MonteCarloGauge({ categories = [], goalDate, targetScore, onTargetChange, onWeightsChange }) {
    const [showConfig, setShowConfig] = useState(false);
    const [equalWeightsMode, setEqualWeightsMode] = useState(true);
    const [simulateToday, setSimulateToday] = useState(false);

    const activeId = useAppStore(state => state.appState.activeId);
    const weights = useAppStore(state => state.appState.contests[activeId]?.mcWeights || null);
    const setWeights = useAppStore(state => state.setMonteCarloWeights);

    const activeCategories = useMemo(() =>
        categories.filter(c => c.simuladoStats?.history?.length > 0),
        [categories]);

    const catCount = activeCategories.length;

    const projectDays = useMemo(() => {
        if (simulateToday) return 0;
        if (!goalDate) return 30;
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        let goal;
        if (typeof goalDate === 'string' && goalDate.includes('T')) {
            const g = new Date(goalDate);
            goal = new Date(g.getUTCFullYear(), g.getUTCMonth(), g.getUTCDate());
        } else {
            goal = new Date(goalDate);
        }
        goal.setHours(0, 0, 0, 0);

        if (isNaN(goal.getTime())) return 30;
        const diffTime = goal - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 30;
    }, [goalDate, simulateToday]);

    const getEqualWeights = useCallback(() => {
        if (catCount === 0) return {};
        const equalWeight = Math.floor(100 / catCount);
        const newWeights = {};
        let total = 0;
        activeCategories.forEach((cat, idx) => {
            if (idx === catCount - 1) {
                newWeights[cat.name] = 100 - total;
            } else {
                newWeights[cat.name] = equalWeight;
                total += equalWeight;
            }
        });
        return newWeights;
    }, [catCount, activeCategories]);

    useEffect(() => {
        if (catCount > 0 && (!weights || Object.keys(weights).length === 0)) {
            const initialWeights = getEqualWeights();
            setWeights(initialWeights);
            if (onWeightsChange) onWeightsChange(initialWeights);
        }
    }, [catCount, weights, getEqualWeights, setWeights, onWeightsChange]);

    const updateWeight = useCallback((catName, value) => {
        if (equalWeightsMode) return;
        const newValue = Math.max(0, Math.min(100, parseInt(value) || 0));
        let otherTotal = 0;
        for (const cat of activeCategories) {
            if (cat.name !== catName) otherTotal += weights[cat.name] || 0;
        }
        const maxAllowed = Math.max(0, 100 - otherTotal);
        const finalValue = Math.min(newValue, maxAllowed);
        const updatedWeights = { ...weights, [catName]: finalValue };
        setWeights(updatedWeights);
        if (onWeightsChange) onWeightsChange(updatedWeights);
    }, [equalWeightsMode, activeCategories, weights, setWeights, onWeightsChange]);

    const effectiveWeights = useMemo(() => {
        if (equalWeightsMode) return getEqualWeights();
        if (!weights) return getEqualWeights();

        const activeCatNames = new Set(activeCategories.map(c => c.name));
        const filteredWeights = {};
        let hasValidWeights = false;

        for (const catName of activeCatNames) {
            if (weights[catName] !== undefined && weights[catName] > 0) {
                filteredWeights[catName] = weights[catName];
                hasValidWeights = true;
            }
        }
        if (hasValidWeights) {
            for (const catName of activeCatNames) {
                if (filteredWeights[catName] === undefined) filteredWeights[catName] = 0;
            }
            return filteredWeights;
        }
        return getEqualWeights();
    }, [equalWeightsMode, weights, activeCategories, getEqualWeights]);

    const [debouncedTarget, setDebouncedTarget] = useState(targetScore);
    const [debouncedWeights, setDebouncedWeights] = useState(effectiveWeights);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedTarget(targetScore), 300);
        return () => clearTimeout(timer);
    }, [targetScore]);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedWeights(effectiveWeights), 300);
        return () => clearTimeout(timer);
    }, [effectiveWeights]);

    const statsData = useMemo(() => {
        let categoryStats = [];
        let totalWeight = 0;

        categories.forEach(cat => {
            if (cat.simuladoStats?.history?.length > 0) {
                const history = [...cat.simuladoStats.history].sort((a, b) => new Date(a.date) - new Date(b.date));
                const weight = debouncedWeights[cat.name] ?? 0;
                const stats = computeCategoryStats(history, weight);
                if (stats) {
                    if (weight > 0) totalWeight += weight;
                    categoryStats.push({ name: cat.name, ...stats });
                }
            }
        });

        if (categoryStats.length === 0 || categoryStats.reduce((acc, c) => acc + c.n, 0) < 5 || totalWeight === 0) return null;

        const currentWeightedMean = calculateCurrentWeightedMean(categoryStats, totalWeight);
        const weightedMean = calculateWeightedProjectedMean(categoryStats, totalWeight, projectDays);
        const pooledSD = computePooledSD(categoryStats, totalWeight, projectDays);

        return { categoryStats, weightedMean, currentWeightedMean, pooledSD, totalWeight };
    }, [categories, debouncedWeights, projectDays]);

    const simulationData = useMemo(() => {
        let allHistoryPoints = [];
        categories.forEach(cat => {
            if (cat.simuladoStats?.history?.length > 0) {
                const weight = debouncedWeights[cat.name] ?? 0;
                if (weight > 0) {
                    cat.simuladoStats.history.forEach(h => {
                        if (score != null && !isNaN(score) && h.date) {
                            allHistoryPoints.push({
                                date: new Date(h.date).toISOString().split('T')[0],
                                score,
                                category: cat.name,
                                weight
                            });
                        }
                    });
                }
            }
        });

        if (allHistoryPoints.length < 5) return { status: 'waiting', missing: 'count', count: allHistoryPoints.length };

        // Sort chronologically
        allHistoryPoints.sort((a, b) => new Date(a.date) - new Date(b.date));

        // Track cumulative knowledge state per category
        const categoryState = {};
        const pointsByDate = {}; // End-of-day cumulative global score

        allHistoryPoints.forEach(p => {
            // Update the latest known score for this specific subject
            categoryState[p.category] = { score: p.score, weight: p.weight };

            // Calculate the global weighted average of ALL subjects studied so far
            let totalScore = 0;
            let totalWeight = 0;

            Object.values(categoryState).forEach(state => {
                totalScore += state.score * state.weight;
                totalWeight += state.weight;
            });

            if (totalWeight > 0) {
                // Overwrites within the same day are fine, keeps the End-of-Day state
                pointsByDate[p.date] = totalScore / totalWeight;
            }
        });

        const globalHistory = Object.keys(pointsByDate)
            .sort((a, b) => new Date(a) - new Date(b))
            .map(date => ({
                date: date,
                score: pointsByDate[date]
            }));

        if (globalHistory.length < 1) return { status: 'waiting', missing: 'days', days: globalHistory.length };

        const simResult = monteCarloSimulation(globalHistory, debouncedTarget, projectDays, 2000);
        return { status: 'ready', data: simResult };
    }, [categories, debouncedWeights, projectDays, debouncedTarget]);

    if (!simulationData || simulationData.status === 'waiting') {
        const waitingSubtext = simulationData?.missing === 'days'
            ? "Você precisa de simulados em pelo menos 2 dias diferentes para calcularmos uma tendência de evolução."
            : "Faça pelo menos 5 simulados para a IA traçar a sua curva de aprovação.";
        return (
            <div className="glass px-6 pb-6 pt-10 rounded-3xl relative overflow-hidden flex flex-col items-center justify-between border-l-4 border-slate-600 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800/20">
                <div className="absolute top-0 right-0 p-4 opacity-5"><Gauge size={80} /></div>
                <div className="w-full flex justify-between items-center mb-2 pt-2">
                    <div className="flex items-center gap-2">
                        <Gauge size={16} className="text-slate-600" />
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Monte Carlo</span>
                    </div>
                </div>
                <div className="relative flex flex-col items-center justify-center py-2 h-full">
                    <svg width="140" height="70" viewBox="0 0 140 70" className="overflow-visible">
                        <path d="M 10 65 A 60 60 0 0 1 130 65" fill="none" stroke="#1e293b" strokeWidth="10" strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-end justify-center pb-2">
                        <span className="text-2xl font-black text-slate-600 tracking-tighter">--%</span>
                    </div>
                </div>
                <div className="text-center w-full mt-2">
                    <p className="text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Aguardando Dados</p>
                    <p className="text-[9px] text-slate-600 leading-tight px-4">{waitingSubtext}</p>
                </div>
                <div className="mt-2 w-full pt-2 border-t border-white/5 flex justify-center gap-4 opacity-50 hover:opacity-100 transition-opacity">
                    <button onClick={() => setShowConfig(true)} className="flex flex-col items-center gap-1 group/btn" title="Configurar Pesos">
                        <div className="w-8 h-8 rounded-lg bg-slate-800/50 border border-white/5 flex items-center justify-center group-hover/btn:bg-slate-700/50 group-hover/btn:border-white/10 transition-all">
                            <Settings2 size={16} className="text-slate-600 group-hover/btn:text-slate-400" />
                        </div>
                    </button>
                </div>
                <MonteCarloConfig show={showConfig} onClose={setShowConfig} targetScore={targetScore} setTargetScore={onTargetChange} equalWeightsMode={equalWeightsMode} setEqualWeightsMode={setEqualWeightsMode} getEqualWeights={getEqualWeights} setWeights={setWeights} weights={weights} updateWeight={updateWeight} activeCategories={activeCategories} categories={categories} onWeightsChange={onWeightsChange} />
            </div>
        );
    }

    const { probability, mean, sd, ci95Low, ci95High, currentMean } = simulationData.data;
    const prob = parseFloat(probability);

    const getGradientColor = (percentage) => {
        if (percentage <= 25) return 'rgb(239, 68, 68)';
        if (percentage <= 55) {
            const t = (percentage - 25) / 30;
            return `rgb(${Math.round(239 + (234 - 239) * t)}, ${Math.round(68 + (179 - 68) * t)}, ${Math.round(68 + (8 - 68) * t)})`;
        }
        if (percentage <= 65) {
            const t = (percentage - 55) / 10;
            return `rgb(${Math.round(234 + (34 - 234) * t)}, ${Math.round(179 + (197 - 179) * t)}, ${Math.round(8 + (94 - 8) * t)})`;
        }
        return 'rgb(34, 197, 94)';
    };

    const gradientColor = getGradientColor(prob);
    let baseMessage = prob > 80 ? "Aprovação Matematicamente Certa" : prob > 50 ? "Na Zona de Briga" : prob > 25 ? "Precisa Melhorar" : "Aprovação Improvável";
    const message = baseMessage + (simulateToday ? " Hoje" : "");

    return (
        <div className="glass p-3 rounded-3xl relative flex flex-col border-l-4 border-blue-500 bg-gradient-to-br from-slate-900 via-slate-900 to-black/80 group transition-colors shadow-2xl overflow-hidden w-full max-w-full">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg"><Gauge size={16} className="text-white" /></div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Monte Carlo</span>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={(e) => { e.stopPropagation(); setSimulateToday(!simulateToday); }} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${simulateToday ? 'bg-green-500/20 border-green-500/40 text-green-400' : 'bg-blue-500/20 border-blue-500/40 text-blue-400'}`}>Projeção: {simulateToday ? 'Hoje' : 'Futura'}</button>
                    {!simulateToday && mean === currentMean && projectDays > 0 && (
                        <div className="group/info relative">
                            <div className="w-5 h-5 rounded-full bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center cursor-help"><span className="text-[10px] font-bold text-yellow-500">?</span></div>
                            <div className="absolute top-full right-0 mt-2 w-48 p-2 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50 opacity-0 group-hover/info:opacity-100 pointer-events-none transition-opacity text-[9px] text-slate-300 leading-tight"><span className="text-yellow-400 font-bold block mb-1">Por que igual a hoje?</span>Para projetar evolução, precisamos de simulados em <strong>dias diferentes</strong>. Com dados de apenas um dia, a tendência é neutra.</div>
                        </div>
                    )}
                    <button onClick={() => setShowConfig(true)} className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-blue-500 border border-white/10 flex items-center justify-center transition-all text-slate-400 hover:text-white"><Settings2 size={14} /></button>
                </div>
            </div>

            <div className="w-full bg-black/30 rounded-xl p-6 mb-4 border border-white/5 flex flex-col items-center">
                <div className="relative mb-6">
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 blur-2xl"><div className="w-24 h-24 rounded-full" style={{ backgroundColor: gradientColor }} /></div>
                    <svg width="200" height="100" viewBox="0 0 140 70" className="overflow-visible relative z-10">
                        <path d="M 10 65 A 60 60 0 0 1 130 65" fill="none" stroke="#1e293b" strokeWidth="12" strokeLinecap="round" />
                        {prob >= 1 && (
                            <path
                                d="M 10 65 A 60 60 0 0 1 130 65"
                                fill="none"
                                stroke={gradientColor}
                                strokeWidth="12"
                                strokeLinecap="round"
                                pathLength="100"
                                strokeDasharray={`${prob} 100`}
                                strokeDashoffset={0}
                                style={{ transition: 'stroke-dasharray 1.5s ease-out' }}
                            />
                        )}
                    </svg>
                    <div className="absolute inset-x-0 bottom-0 flex items-end justify-center pb-0 z-20"><span className="text-5xl font-black tracking-tighter drop-shadow-md" style={{ color: gradientColor }}>{prob.toFixed(1)}%</span></div>
                </div>
                <span className="text-xs font-black uppercase tracking-widest px-6 py-2 rounded-full bg-black/40 border border-white/10 shadow-lg" style={{ color: gradientColor }}>{message}</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                {[
                    { label: "Sua Meta", val: `${targetScore}%`, color: "text-red-400" },
                    { label: "Média", val: `${parseFloat(mean).toFixed(1)}%`, color: "text-blue-400" },
                    { label: "Consistência", val: `±${Math.abs(parseFloat(sd))}%`, color: Math.abs(parseFloat(sd)) <= 5 ? 'text-green-400' : Math.abs(parseFloat(sd)) <= 10 ? 'text-yellow-400' : 'text-red-400' },
                    { label: "IC 95%", val: `${ci95Low}-${ci95High}%`, color: "text-green-400" }
                ].map((m, i) => (
                    <div key={i} className="bg-black/40 p-2 rounded-lg border border-white/10 flex flex-col items-center">
                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">{m.label}</span>
                        <span className={`text-sm font-black ${m.color}`}>{m.val}</span>
                    </div>
                ))}
            </div>

            <div className="w-full bg-black/30 rounded-xl p-4 mb-4 border border-white/5">
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-2 block">Projeção de Desempenho</span>
                <div className="w-full h-36 px-2">
                    <GaussianPlot mean={parseFloat(mean)} sd={parseFloat(sd)} low95={parseFloat(ci95Low)} high95={parseFloat(ci95High)} targetScore={targetScore} currentMean={currentMean ? parseFloat(currentMean) : parseFloat(mean)} />
                </div>
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-3 pt-3 border-t border-white/10">
                    {[{ bg: "bg-red-500", lbl: "Meta" }, { bg: "bg-blue-500 opacity-50", lbl: "Média", dash: true }, { bg: "bg-green-500/30 border border-green-500/50", lbl: "IC 95%" }, { bg: "bg-white/40 rounded-full", lbl: "Hoje", dot: true }, { bg: "bg-blue-500", lbl: "Projeção" }].map((l, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                            <div className={`${l.bg} ${l.dot ? 'w-2 h-2' : 'w-3 h-0.5'}`} style={l.dash ? { borderTop: '1px dashed #3b82f6' } : {}}></div>
                            <span className="text-[9px] text-slate-400">{l.lbl}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="w-full flex flex-wrap justify-center gap-1.5">
                {statsData?.categoryStats?.slice(0, 8).map((cat) => (
                    <div key={cat.name} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800/60 border border-white/5 text-[8px] text-slate-300 uppercase tracking-tight">
                        {cat.trend === 'up' && <TrendingUp size={10} className="text-green-400" />}
                        {cat.trend === 'down' && <TrendingDown size={10} className="text-red-400" />}
                        {cat.trend === 'stable' && <Minus size={10} className="text-slate-500" />}
                        <span className="max-w-[70px] truncate">{cat.name.split(' ')[0]}</span>
                    </div>
                ))}
                {(statsData?.categoryStats?.length || 0) > 8 && <span className="px-2 py-1 rounded-lg bg-slate-800/60 border border-white/5 text-[8px] text-slate-500">+{statsData.categoryStats.length - 8}</span>}
            </div>

            <MonteCarloConfig show={showConfig} onClose={setShowConfig} targetScore={targetScore} setTargetScore={onTargetChange} equalWeightsMode={equalWeightsMode} setEqualWeightsMode={setEqualWeightsMode} getEqualWeights={getEqualWeights} setWeights={setWeights} weights={weights} updateWeight={updateWeight} activeCategories={activeCategories} categories={categories} onWeightsChange={onWeightsChange} />
        </div>
    );
}
