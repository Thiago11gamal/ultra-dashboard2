import React, { useMemo, useState, useCallback } from 'react';
import { Gauge, TrendingUp, TrendingDown, Minus, Settings2, Check, Plus, ChevronUp, ChevronDown } from 'lucide-react';

// Default weights for subjects (can be customized)
const DEFAULT_WEIGHTS = {
    'Língua Portuguesa': 20,
    'Raciocínio Lógico': 20,
    'Informática': 15,
    'Geografia': 15,
    'Conhecimentos Específicos': 30
};

export default function MonteCarloGauge({ categories = [] }) {
    const [showConfig, setShowConfig] = useState(false);
    const [equalWeightsMode, setEqualWeightsMode] = useState(true); // Toggle for equal weights

    // Get categories that have simulado data
    const activeCategories = categories.filter(c => c.simuladoStats?.history?.length > 0);
    const catCount = activeCategories.length;

    // Simple weight storage - just stores what user sets
    const [weights, setWeights] = useState({});

    // Function to calculate equal weights
    const getEqualWeights = () => {
        if (catCount === 0) return {};
        const equalWeight = Math.round(100 / catCount / 10) * 10;
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
    };

    // Initialize weights equally on first load only
    React.useEffect(() => {
        if (catCount > 0 && Object.keys(weights).length === 0) {
            setWeights(getEqualWeights());
        }
    }, [catCount]);

    // When equal mode turns ON, reset to equal weights
    const handleEqualModeChange = () => {
        if (!equalWeightsMode) {
            // Turning ON - set equal weights
            setWeights(getEqualWeights());
        }
        setEqualWeightsMode(!equalWeightsMode);
    };

    // Calculate total
    const currentTotal = activeCategories.reduce((sum, cat) => sum + (weights[cat.name] || 0), 0);

    // Update weight with validation to keep total <= 100% - optimized with useCallback
    const updateWeight = useCallback((catName, value) => {
        if (equalWeightsMode) return;

        setWeights(prev => {
            const newValue = Math.max(0, Math.min(100, parseInt(value) || 0));

            // Quick calculation of other weights
            let otherTotal = 0;
            for (const cat of activeCategories) {
                if (cat.name !== catName) {
                    otherTotal += prev[cat.name] || 0;
                }
            }

            // Limit so total doesn't exceed 100%
            const maxAllowed = Math.max(0, 100 - otherTotal);
            const finalValue = Math.min(newValue, maxAllowed);

            // Only update if value actually changed
            if (finalValue === (prev[catName] || 0)) return prev;

            return { ...prev, [catName]: finalValue };
        });
    }, [equalWeightsMode, activeCategories]);

    // Effective weights for simulation - use weights if available, otherwise equal weights
    const effectiveWeights = useMemo(() => {
        const equalW = getEqualWeights();
        console.log('DEBUG catCount:', catCount, 'activeCategories:', activeCategories.map(c => c.name).join(', '));
        console.log('DEBUG weights:', JSON.stringify(weights));
        console.log('DEBUG equalW:', JSON.stringify(equalW));
        if (Object.keys(weights).length > 0) {
            return weights;
        }
        // Fallback to equal weights
        return equalW;
    }, [weights, catCount]);

    const simulationResult = useMemo(() => {
        console.log('Simulation effectiveWeights:', JSON.stringify(effectiveWeights));
        // 1. Gather Stats per Category with Weights & Trends
        let categoryStats = [];
        let totalWeight = 0;

        categories.forEach(cat => {
            if (cat.simuladoStats && cat.simuladoStats.history && cat.simuladoStats.history.length > 0) {
                const history = cat.simuladoStats.history;
                const scores = history.map(h => h.score);

                // Calculate mean for this category
                const n = scores.length;
                const mean = scores.reduce((a, b) => a + b, 0) / n;

                // Calculate SD for this category
                const variance = scores.reduce((acc, score) => acc + Math.pow(score - mean, 2), 0) / n;
                const sd = Math.sqrt(variance);

                // Calculate trend (compare last 2 vs first 2 entries)
                let trend = 'stable';
                if (n >= 4) {
                    const firstTwo = (scores[0] + scores[1]) / 2;
                    const lastTwo = (scores[n - 1] + scores[n - 2]) / 2;
                    if (lastTwo > firstTwo + 5) trend = 'up';
                    else if (lastTwo < firstTwo - 5) trend = 'down';
                } else if (n >= 2) {
                    if (scores[n - 1] > scores[0] + 5) trend = 'up';
                    else if (scores[n - 1] < scores[0] - 5) trend = 'down';
                }

                // Get weight for this category
                const weight = effectiveWeights[cat.name] !== undefined ? effectiveWeights[cat.name] : 0;

                // Only include categories with weight > 0
                if (weight > 0) {
                    totalWeight += weight;
                    categoryStats.push({
                        name: cat.name,
                        mean,
                        sd,
                        trend,
                        weight,
                        n
                    });
                }
            }
        });

        if (categoryStats.length === 0 || categoryStats.reduce((acc, c) => acc + c.n, 0) < 5 || totalWeight === 0) {
            return null; // Not enough data or no weights set
        }

        // 2. Calculate Weighted Mean & Pooled SD
        const weightedMean = categoryStats.reduce((acc, cat) => {
            return acc + (cat.mean * cat.weight);
        }, 0) / totalWeight;

        // Pooled SD with trend adjustment (rising trends reduce effective SD)
        const pooledVariance = categoryStats.reduce((acc, cat) => {
            let trendFactor = 1;
            if (cat.trend === 'up') trendFactor = 0.85; // Reduce variance if improving
            if (cat.trend === 'down') trendFactor = 1.15; // Increase variance if declining
            return acc + (cat.weight * cat.sd * cat.sd * trendFactor);
        }, 0) / totalWeight;
        const pooledSD = Math.sqrt(pooledVariance);

        // 3. Run Monte Carlo (10,000 iterations)
        const simulations = 10000;
        let scores = [];
        const target = 70; // Passing threshold (70% is more realistic)

        console.log('Simulation values: weightedMean=', weightedMean.toFixed(1), 'pooledSD=', pooledSD.toFixed(1), 'totalWeight=', totalWeight, 'target=', target);

        // Box-Muller Transform for Gaussian Random
        const boxMuller = (m, s) => {
            let u = 0, v = 0;
            while (u === 0) u = Math.random();
            while (v === 0) v = Math.random();
            const num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
            return Math.max(0, Math.min(100, num * s + m)); // Clamp to 0-100
        };

        for (let i = 0; i < simulations; i++) {
            scores.push(boxMuller(weightedMean, pooledSD));
        }

        scores.sort((a, b) => a - b);
        const successCount = scores.filter(s => s >= target).length;
        const probability = (successCount / simulations) * 100;

        // Calculate 95% Confidence Interval
        const ci95Low = scores[Math.floor(simulations * 0.025)];
        const ci95High = scores[Math.floor(simulations * 0.975)];

        return {
            probability: probability.toFixed(1),
            mean: weightedMean.toFixed(1),
            sd: pooledSD.toFixed(1),
            ci95Low: ci95Low.toFixed(0),
            ci95High: ci95High.toFixed(0),
            categoryStats
        };
    }, [categories, effectiveWeights]);

    // Show placeholder if not enough data
    if (!simulationResult) {
        return (
            <div className="glass px-6 pb-6 pt-10 rounded-3xl relative overflow-hidden flex flex-col items-center justify-between border-l-4 border-slate-600 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800/20">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                    <Gauge size={80} />
                </div>

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

                <div className="text-center w-full mt-4">
                    <p className="text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Aguardando Dados</p>
                    <p className="text-[9px] text-slate-600 leading-tight">
                        Faça pelo menos 5 simulados para ativar a previsão
                    </p>
                </div>
            </div>
        );
    }

    // Visual Config with Gradient Colors
    const prob = parseFloat(simulationResult.probability);

    // Gradient color function: smoothly transitions from red -> orange -> yellow -> green
    const getGradientColor = (percentage) => {
        if (percentage <= 25) {
            return 'rgb(239, 68, 68)'; // Red
        } else if (percentage <= 50) {
            const t = (percentage - 25) / 25;
            const r = Math.round(239 + (251 - 239) * t);
            const g = Math.round(68 + (146 - 68) * t);
            const b = Math.round(68 + (39 - 68) * t);
            return `rgb(${r}, ${g}, ${b})`; // Red -> Orange
        } else if (percentage <= 75) {
            const t = (percentage - 50) / 25;
            const r = Math.round(251 + (234 - 251) * t);
            const g = Math.round(146 + (179 - 146) * t);
            const b = Math.round(39 + (8 - 39) * t);
            return `rgb(${r}, ${g}, ${b})`; // Orange -> Yellow
        } else {
            const t = (percentage - 75) / 25;
            const r = Math.round(234 + (34 - 234) * t);
            const g = Math.round(179 + (197 - 179) * t);
            const b = Math.round(8 + (94 - 8) * t);
            return `rgb(${r}, ${g}, ${b})`; // Yellow -> Green
        }
    };

    const gradientColor = getGradientColor(prob);

    let message = "Aprovação Improvável Hoje";
    if (prob > 80) {
        message = "Aprovação Matematicamente Certa";
    } else if (prob > 50) {
        message = "Na Zona de Briga";
    } else if (prob > 25) {
        message = "Precisa Melhorar";
    }

    return (
        <div className="glass px-6 pb-6 pt-10 rounded-3xl relative overflow-hidden flex flex-col items-center justify-between border-l-4 border-blue-500 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-900/20 group hover:bg-white/5 transition-colors">

            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
                <Gauge size={80} />
            </div>

            {/* Settings Toggle */}
            <button
                onClick={() => setShowConfig(!showConfig)}
                className="absolute top-3 right-3 p-2 rounded-lg hover:bg-white/10 transition-colors z-10"
            >
                {showConfig ? <Check size={14} className="text-green-400" /> : <Settings2 size={14} className="text-slate-500" />}
            </button>

            <div className="w-full flex justify-between items-center mb-2 pt-2">
                <div className="flex items-center gap-2">
                    <Gauge size={16} className="text-blue-400" />
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Monte Carlo</span>
                </div>
                <span className="text-[9px] text-slate-600">Ponderado</span>
            </div>

            {/* Config Panel - Expanded View */}
            {showConfig && (
                <div className="w-full mb-4 p-4 bg-gradient-to-br from-slate-800/95 to-slate-900/95 rounded-2xl border border-white/10 shadow-xl">
                    {/* Header with Toggle */}
                    <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/10">
                        <div className="flex items-center gap-2">
                            <Settings2 size={14} className="text-blue-400" />
                            <p className="text-xs text-white font-bold">Configurar Pesos</p>
                        </div>

                        {/* Equal Weights Toggle */}
                        <button
                            onClick={handleEqualModeChange}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${equalWeightsMode
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                : 'bg-slate-700 text-slate-400 border border-white/10'
                                }`}
                        >
                            <div className={`w-8 h-4 rounded-full relative transition-all ${equalWeightsMode ? 'bg-green-500' : 'bg-slate-600'}`}>
                                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${equalWeightsMode ? 'left-4' : 'left-0.5'}`} />
                            </div>
                            Pesos Iguais
                        </button>
                    </div>

                    {/* Status message */}
                    {equalWeightsMode && (
                        <div className="mb-3 p-2 bg-green-500/10 border border-green-500/20 rounded-lg">
                            <p className="text-[10px] text-green-400 text-center">
                                ✓ Pesos distribuídos igualmente ({catCount > 0 ? Math.round(100 / catCount) : 0}% cada)
                            </p>
                        </div>
                    )}

                    {/* Progress Bar Visual */}
                    <div className="mb-4">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-slate-400">Distribuição Total</span>
                            <span className={`text-xs font-bold ${currentTotal === 100 ? 'text-green-400' : currentTotal < 100 ? 'text-amber-400' : 'text-red-400'}`}>
                                {currentTotal}% / 100%
                            </span>
                        </div>
                        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-300 ${currentTotal === 100 ? 'bg-green-500' : currentTotal < 100 ? 'bg-amber-500' : 'bg-red-500'}`}
                                style={{ width: `${Math.min(currentTotal, 100)}%` }}
                            />
                        </div>
                    </div>

                    {/* Weights Grid */}
                    <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                        {activeCategories.map(cat => {
                            const weight = parseInt(weights[cat.name]) || 0;
                            const otherWeights = currentTotal - weight;
                            const maxAllowed = 100 - otherWeights;
                            const canIncrease = maxAllowed > weight;
                            return (
                                <div
                                    key={cat.id}
                                    className="flex items-center gap-3 p-2.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all group"
                                >
                                    {/* Category Icon & Name */}
                                    <div
                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                                        style={{ backgroundColor: `${cat.color}25`, border: `1px solid ${cat.color}40` }}
                                    >
                                        {cat.icon || '📚'}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <span className="text-[11px] text-white font-medium block truncate">{cat.name}</span>
                                        {/* Mini progress bar */}
                                        <div className="h-1 bg-slate-700 rounded-full mt-1 overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-300"
                                                style={{ width: `${weight}%`, backgroundColor: cat.color || '#3b82f6' }}
                                            />
                                        </div>
                                    </div>

                                    {/* Weight Controls - Buttons + Value */}
                                    <div className="flex items-center gap-1">
                                        {/* Minus Button */}
                                        <button
                                            onClick={() => updateWeight(cat.name, weight - 10)}
                                            disabled={equalWeightsMode}
                                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold transition-all ${equalWeightsMode
                                                ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                                                : 'bg-red-500/20 text-red-400 hover:bg-red-500/40 active:scale-95 cursor-pointer'
                                                }`}
                                        >
                                            −
                                        </button>

                                        {/* Value Display */}
                                        <div className={`w-14 h-8 flex items-center justify-center rounded-lg text-sm font-bold ${equalWeightsMode
                                            ? 'bg-slate-800 text-slate-400'
                                            : 'bg-slate-900 text-white border border-white/20'
                                            }`}>
                                            {weight}%
                                        </div>

                                        {/* Plus Button */}
                                        <button
                                            onClick={() => updateWeight(cat.name, weight + 10)}
                                            disabled={equalWeightsMode}
                                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold transition-all ${equalWeightsMode
                                                ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                                                : 'bg-green-500/20 text-green-400 hover:bg-green-500/40 active:scale-95 cursor-pointer'
                                                }`}
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Footer Tips */}
                    <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                        <p className="text-[9px] text-slate-500">
                            💡 Use pesos do edital do concurso
                        </p>
                        <button
                            onClick={() => {
                                // Reset to equal weights (multiples of 10)
                                const equalWeight = Math.round(100 / catCount / 10) * 10;
                                const newWeights = {};
                                let usedWeight = 0;
                                activeCategories.forEach((cat, idx) => {
                                    if (idx === catCount - 1) {
                                        newWeights[cat.name] = 100 - usedWeight;
                                    } else {
                                        newWeights[cat.name] = equalWeight;
                                        usedWeight += equalWeight;
                                    }
                                });
                                setWeights(newWeights);
                            }}
                            className="text-[9px] text-blue-400 hover:text-blue-300 transition-colors"
                        >
                            ⚖️ Equalizar
                        </button>
                    </div>
                </div>
            )}


            <div className="relative flex flex-col items-center justify-center py-2 h-full">
                <svg width="140" height="70" viewBox="0 0 140 70" className="overflow-visible">
                    {/* Background Arc */}
                    <path d="M 10 65 A 60 60 0 0 1 130 65" fill="none" stroke="#1e293b" strokeWidth="10" strokeLinecap="round" />

                    {/* Data Arc */}
                    <path
                        d="M 10 65 A 60 60 0 0 1 130 65"
                        fill="none"
                        stroke={gradientColor}
                        strokeWidth="10"
                        strokeLinecap="round"
                        strokeDasharray={188}
                        strokeDashoffset={188 - (188 * (prob / 100))}
                        style={{ transition: 'stroke-dashoffset 1.5s ease-out, stroke 0.5s ease-out' }}
                    />
                </svg>

                <div className="absolute inset-0 flex items-end justify-center pb-2">
                    <span className="text-3xl font-black tracking-tighter drop-shadow-lg" style={{ color: gradientColor }}>{prob}%</span>
                </div>
            </div>

            <div className="text-center w-full mt-4">
                <p className="text-[10px] font-bold mb-1 leading-tight uppercase tracking-wider" style={{ color: gradientColor }}>{message}</p>

                {/* Confidence Interval */}
                <p className="text-[9px] text-slate-400 mb-2">
                    IC 95%: <span className="text-blue-400 font-bold">{simulationResult.ci95Low}% - {simulationResult.ci95High}%</span>
                </p>

                <p className="text-[9px] text-slate-500 leading-tight">
                    Média ponderada: {simulationResult.mean}% | Consistência: ±{simulationResult.sd}%
                </p>

                {/* Trend Indicators */}
                <div className="flex flex-wrap justify-center gap-1 mt-2">
                    {simulationResult.categoryStats.map((cat, idx) => (
                        <span key={idx} className="flex items-center gap-0.5 px-2 py-1 rounded bg-white/5 text-[9px] text-slate-400">
                            {cat.trend === 'up' && <TrendingUp size={10} className="text-green-400" />}
                            {cat.trend === 'down' && <TrendingDown size={10} className="text-red-400" />}
                            {cat.trend === 'stable' && <Minus size={10} className="text-slate-500" />}
                            <span className="max-w-[100px] truncate">{cat.name}</span>
                        </span>
                    ))}
                </div>
            </div>
        </div >
    );
}

