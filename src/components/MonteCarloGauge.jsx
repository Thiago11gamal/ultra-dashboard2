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

// Internal Component for the Gaussian Chart with Tooltip State
function GaussianChart({ mean, sd, low95, high95, targetScore, currentMean }) {
    const [hover, setHover] = useState(null); // { x: percent, val: score }

    // Enforce minimum SD for visualization to prevent divide-by-zero or flat line
    const vizSd = Math.max(0.5, sd);

    // Define plot range: mean +/- 3.5 SDs for full curve context
    const xMin = Math.max(0, mean - 3.5 * vizSd);
    const xMax = Math.min(100, mean + 3.5 * vizSd);
    const range = Math.max(1, xMax - xMin); // Ensure range is never 0

    // Gaussian function
    const gaussian = (x) => {
        return Math.exp(-0.5 * Math.pow((x - mean) / vizSd, 2));
    };

    // Generate path data
    const points = [];
    const steps = 60;
    for (let i = 0; i <= steps; i++) {
        const x = xMin + (range * (i / steps));
        const y = gaussian(x);
        points.push(`${(x - xMin) / range * 100},${100 - (y * 100)}`); // Flip Y for SVG
    }
    const pathData = `M ${points.join(' L ')}`;

    // Generate Area under curve for 95% CI
    const areaPoints = [];
    for (let i = 0; i <= steps; i++) {
        const x = xMin + (range * (i / steps));
        if (x >= low95 && x <= high95) {
            const y = gaussian(x);
            areaPoints.push(`${(x - xMin) / range * 100},${100 - (y * 100)}`);
        }
    }
    if (areaPoints.length > 0) {
        const lastX = areaPoints[areaPoints.length - 1].split(',')[0];
        const firstX = areaPoints[0].split(',')[0];
        areaPoints.push(`${lastX},100`);
        areaPoints.push(`${firstX},100`);
    }
    const areaPathData = areaPoints.length > 0 ? `M ${areaPoints.join(' L ')} Z` : '';

    // Target Line Position
    const targetPos = (targetScore - xMin) / range * 100;
    const isTargetVisible = targetPos >= 0 && targetPos <= 100;

    // Current Mean Position
    const currentPos = (currentMean - xMin) / range * 100;
    const isCurrentVisible = currentPos >= 0 && currentPos <= 100;

    return (
        <div
            className="relative w-full h-24 mt-1 mb-6 cursor-crosshair group/chart"
            onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
                // Calculate actual value based on percentage
                const val = xMin + (percentage / 100 * range);
                setHover({ x: percentage, val });
            }}
            onMouseLeave={() => setHover(null)}
        >
            <style>
                {`
                    @keyframes dash {
                        from { stroke-dashoffset: 1000; }
                        to { stroke-dashoffset: 0; }
                    }
                    .animate-path {
                        stroke-dasharray: 1000;
                        stroke-dashoffset: 0;
                        animation: dash 2s ease-out forwards;
                    }
                `}
            </style>
            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" className="overflow-visible">
                {/* Gradients */}
                <defs>
                    <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(59, 130, 246, 0.5)" />
                        <stop offset="100%" stopColor="rgba(59, 130, 246, 0.0)" />
                    </linearGradient>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(34, 197, 94, 0.6)" />
                        <stop offset="100%" stopColor="rgba(34, 197, 94, 0.1)" />
                    </linearGradient>
                </defs>

                {/* Base Line */}
                <line x1="0" y1="100" x2="100" y2="100" stroke="#334155" strokeWidth="1" />

                {/* Full Curve Line with Animation */}
                <path d={pathData} fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" className="opacity-50 animate-path" />

                {/* 95% CI Area */}
                <path d={areaPathData} fill="url(#areaGradient)" stroke="#22c55e" strokeWidth="2" />

                {/* Current Mean Line (Today) */}
                {isCurrentVisible && (
                    <line
                        x1={currentPos}
                        y1="100"
                        x2={currentPos}
                        y2="20"
                        stroke="white"
                        strokeWidth="1.5"
                        strokeDasharray="1,2"
                        className="opacity-40"
                    />
                )}

                {/* Mean Line (Projected) - Blue Dashed */}
                <line
                    x1={(mean - xMin) / range * 100}
                    y1="100"
                    x2={(mean - xMin) / range * 100}
                    y2="0"
                    stroke="#3b82f6"
                    strokeWidth="1.5"
                    strokeDasharray="3,3"
                    className="opacity-80"
                />

                {/* Target Line - Red Solid */}
                {isTargetVisible && (
                    <line
                        x1={targetPos}
                        y1="100"
                        x2={targetPos}
                        y2="0"
                        stroke="#ef4444"
                        strokeWidth="1.5"
                    />
                )}
            </svg>

            {/* Interactive Tooltip & Hover Line */}
            {hover && (
                <>
                    <div
                        className="absolute top-0 bottom-0 w-px bg-white/50 pointer-events-none transition-opacity"
                        style={{ left: `${hover.x}%` }}
                    />
                    <div
                        className="absolute -top-5 transform -translate-x-1/2 bg-slate-900 border border-slate-700 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xl pointer-events-none z-50 whitespace-nowrap"
                        style={{ left: `${hover.x}%` }}
                    >
                        {hover.val.toFixed(1)}%
                    </div>
                </>
            )}

            {/* Static Labels overlay with Collision Detection */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                {(() => {
                    // Calculate positions (0-100%)
                    const getPos = (val) => (val - xMin) / range * 100;
                    const meanPos = getPos(mean);
                    const targetPos = getPos(targetScore);
                    const lowPos = getPos(low95);
                    const highPos = getPos(high95);

                    // Collision Threshold (approx 12% width for labels)
                    const threshold = 12;

                    // Determine staggering (0 = standard line, 10px = lower, 20px = lowest)
                    let meanOffset = 0;
                    let targetOffset = 0;
                    let lowOffset = 0;
                    let highOffset = 0;

                    // Priority 1: Prevent Mean/Target overlap (Center)
                    if (Math.abs(meanPos - targetPos) < threshold) {
                        targetOffset = 12; // Push Target down
                    }

                    // Priority 2: Prevent Low/Mean overlap
                    if (Math.abs(lowPos - meanPos) < threshold) {
                        lowOffset = 12;
                        // Determine if Low clashes with pushed Target? Unlikely if Mean/Target close
                    }

                    // Priority 3: Prevent High/Target overlap
                    if (Math.abs(highPos - targetPos) < threshold) {
                        highOffset = 12;
                        // If Target was already pushed down, push High even further? 
                        if (targetOffset > 0) highOffset = 24;
                    }

                    return (
                        <>
                            {/* Mean Label - Bottom */}
                            <div
                                className="absolute bottom-0 text-[10px] font-black text-blue-500 tracking-tighter transform -translate-x-1/2 translate-y-full mt-1 transition-all"
                                style={{ left: `${meanPos}%`, marginBottom: `-${meanOffset}px` }}
                            >
                                {mean}%
                            </div>

                            {/* Target Label - Bottom */}
                            <div
                                className="absolute bottom-0 text-[10px] font-black text-red-500 tracking-tighter transform -translate-x-1/2 translate-y-full mt-1 transition-all"
                                style={{ left: `${Math.max(5, Math.min(95, targetPos))}%`, marginBottom: `-${targetOffset}px` }}
                            >
                                {targetScore}%
                            </div>

                            {/* Optimistic Label - Bottom */}
                            <div
                                className="absolute bottom-0 text-[10px] font-black text-green-400 tracking-tighter transform -translate-x-1/2 translate-y-full mt-1 transition-all"
                                style={{ left: `${Math.max(5, Math.min(95, highPos))}%`, marginBottom: `-${highOffset}px` }}
                            >
                                {high95}%
                            </div>

                            {/* Pessimistic Label - Bottom */}
                            <div
                                className="absolute bottom-0 text-[10px] font-black text-red-400 tracking-tighter transform -translate-x-1/2 translate-y-full mt-1 transition-all"
                                style={{ left: `${Math.max(5, Math.min(95, lowPos))}%`, marginBottom: `-${lowOffset}px` }}
                            >
                                {low95}%
                            </div>
                        </>
                    );
                })()}
            </div>
        </div>
    );
}

export default function MonteCarloGauge({ categories = [], goalDate }) {
    const [showConfig, setShowConfig] = useState(false);
    const [equalWeightsMode, setEqualWeightsMode] = useState(true); // Toggle for equal weights
    const [simulateToday, setSimulateToday] = useState(false); // Toggle for "Today" simulation

    // Get categories that have simulado data
    const activeCategories = categories.filter(c => c.simuladoStats?.history?.length > 0);
    const catCount = activeCategories.length;

    // Simple weight storage - just stores what user sets
    const [weights, setWeights] = useState({});
    const [targetScore, setTargetScore] = useState(70); // Configurable passing target

    const projectDays = useMemo(() => {
        if (simulateToday) return 0; // Force 0 days if "Today" is selected
        if (!goalDate) return 30;
        const now = new Date();
        const goal = new Date(goalDate);
        if (isNaN(goal.getTime())) return 30;

        const diffTime = goal - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 30; // Fallback to 30 if passed or invalid
    }, [goalDate, simulateToday]);

    // Function to calculate equal weights
    const getEqualWeights = useCallback(() => {
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
    }, [catCount, activeCategories]);

    // Initialize weights equally on first load only
    React.useEffect(() => {
        if (catCount > 0 && Object.keys(weights).length === 0) {
            setWeights(getEqualWeights());
        }
    }, [catCount, weights, getEqualWeights]);





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
        if (Object.keys(weights).length > 0) {
            return weights;
        }
        // Fallback to equal weights
        return equalW;
    }, [weights, catCount, getEqualWeights, activeCategories]);

    const [simulationResult, setSimulationResult] = useState(null);

    React.useEffect(() => {
        // 1. Gather Stats per Category with Weights & Trends
        let categoryStats = [];
        let totalWeight = 0;

        categories.forEach(cat => {
            if (cat.simuladoStats && cat.simuladoStats.history && cat.simuladoStats.history.length > 0) {
                // Sort history by date to ensure correct trend and regression
                const history = [...cat.simuladoStats.history].sort((a, b) => new Date(a.date) - new Date(b.date));
                const scores = history.map(h => h.score);

                // Calculate mean for this category
                const n = scores.length;
                const mean = scores.reduce((a, b) => a + b, 0) / n;

                // Calculate SD for this category (Sample SD, n-1)
                const variance = n > 1
                    ? scores.reduce((acc, score) => acc + Math.pow(score - mean, 2), 0) / (n - 1)
                    : 0;
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
            setSimulationResult(null);
            return;
        }

        // 2. Linear Regression Projection (The "Speed" of learning)
        // Instead of static mean, we project where the user will be in X days
        // const PROJECT_DAYS = 30; // Old static value

        const currentWeightedMean = categoryStats.reduce((acc, cat) => {
            return acc + (cat.mean * cat.weight);
        }, 0) / (totalWeight || 1);

        const weightedMean = categoryStats.reduce((acc, cat) => {
            // Calculate Linear Regression for this category
            if (!cat.history || cat.history.length < 2) return acc + (cat.mean * cat.weight);

            const dataPoints = cat.history.map(h => ({
                x: (new Date(h.date).getTime() - new Date(cat.history[0].date).getTime()) / (1000 * 60 * 60 * 24),
                y: h.score
            }));

            const n = dataPoints.length;
            const sumX = dataPoints.reduce((a, b) => a + b.x, 0);
            const sumY = dataPoints.reduce((a, b) => a + b.y, 0);
            const sumXY = dataPoints.reduce((a, b) => a + b.x * b.y, 0);
            const sumXX = dataPoints.reduce((a, b) => a + b.x * b.x, 0);

            const denom = (n * sumXX - sumX * sumX);
            let slope = 0; // Improvement per day
            let intercept = cat.mean;

            if (denom !== 0) {
                slope = (n * sumXY - sumX * sumY) / denom;
                intercept = (sumY - slope * sumX) / n;
            }

            // Limit slope to realistic values (-1% to +1% per day is already huge)
            const safeSlope = Math.max(-1.5, Math.min(1.5, slope));
            const currentDay = dataPoints[dataPoints.length - 1].x;
            const projectedScore = intercept + (safeSlope * (currentDay + projectDays));

            // Clamp projection 0-100
            const safeProjection = Math.max(0, Math.min(100, projectedScore));

            return acc + (safeProjection * cat.weight);
        }, 0) / (totalWeight || 1);

        // Pooled SD - Remove the "trendFactor" hack. Trend is now in the Mean.
        const pooledVariance = categoryStats.reduce((acc, cat) => {
            return acc + (cat.weight * cat.sd * cat.sd);
        }, 0) / (totalWeight || 1);
        const pooledSD = Math.sqrt(pooledVariance);

        // 3. Run Monte Carlo (10,000 iterations)
        const simulations = 10000;
        let scores = [];
        const target = targetScore;

        // Box-Muller Transform
        const boxMuller = (m, s) => {
            let u = 0, v = 0;
            while (u === 0) u = Math.random();
            while (v === 0) v = Math.random();
            const num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
            return Math.max(0, Math.min(100, num * s + m));
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

        setSimulationResult({
            probability: probability.toFixed(1),
            mean: weightedMean.toFixed(1),
            currentMean: currentWeightedMean.toFixed(1), // Added Current Mean
            sd: pooledSD.toFixed(1),
            ci95Low: ci95Low.toFixed(0),
            ci95High: ci95High.toFixed(0),
            categoryStats
        });
    }, [categories, effectiveWeights, targetScore, projectDays]);

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

                <div className="text-center w-full mt-2">
                    <p className="text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Aguardando Dados</p>
                    <p className="text-[9px] text-slate-600 leading-tight">
                        Faça pelo menos 5 simulados para ativar a previsão
                    </p>
                </div>

                {/* Weights Configuration Footer Trigger (Placeholder) */}
                <div className="mt-2 w-full pt-2 border-t border-white/5 flex justify-center opacity-50 hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => setShowConfig(true)}
                        className="flex flex-col items-center gap-1 group/btn"
                    >
                        <div className="w-8 h-8 rounded-lg bg-slate-800/50 border border-white/5 flex items-center justify-center group-hover/btn:bg-slate-700/50 group-hover/btn:border-white/10 transition-all">
                            <Settings2 size={16} className="text-slate-600 group-hover/btn:text-slate-400" />
                        </div>
                    </button>
                    {/* Reuse Modal - Modal is rendered outside this block? No, Modal is rendered in main return. */}
                </div>

                {/* We need to render the Modal here too or move it outside the if-else blocks?
                    The best way is to move the Modal JSX to a helper function or render it at the top level.
                    Refactoring to render Modal via Portal or common component would be best, but for now duplicate the modal logic or move placeholder return.
                    
                    Actually, if I return here, the Modal code at the bottom won't run.
                    I must include the Modal JSX in this return if showConfig is true.
                */}
                {showConfig && (
                    <div className="absolute inset-0 z-50 bg-slate-900/95 backdrop-blur-sm flex flex-col p-6 animate-in fade-in zoom-in-95 duration-200">
                        {/* Simplified Modal for Placeholder (or same one) */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                                    <Settings2 size={20} className="text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-white">Configuração de Pesos</h3>
                                    <p className="text-[10px] text-slate-400">Personalize a relevância de cada matéria</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowConfig(false)}
                                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                            >
                                <Check size={16} className="text-white" />
                            </button>
                        </div>

                        {/* Reuse logic... Wait, activeCategories might be empty? 
                             The placeholder appears if activeCategories.length < 5?
                             Line 18 CHECK: const activeCategories = categories.filter(c => c.simuladoStats?.history?.length > 0);
                             Line 150 CHECK: if (categoryStats.length === 0 ... ) setSimulationResult(null).
                             
                             So activeCategories MIGHT exist, but not enough data for simulation.
                             So we can still render the config menu!
                         */}

                        {/* Mode Toggle Checkbox Style */}
                        <div className="bg-slate-800/50 p-1 rounded-xl flex mb-6 border border-white/5">
                            <button
                                onClick={() => {
                                    if (!equalWeightsMode) { setWeights(getEqualWeights()); }
                                    setEqualWeightsMode(true);
                                }}
                                className={`flex-1 py-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${equalWeightsMode ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                <div className={`w-2 h-2 rounded-full ${equalWeightsMode ? 'bg-white' : 'bg-slate-600'}`} />
                                Pesos Iguais
                            </button>
                            <button
                                onClick={() => setEqualWeightsMode(false)}
                                className={`flex-1 py-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${!equalWeightsMode ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                <div className={`w-2 h-2 rounded-full ${!equalWeightsMode ? 'bg-white' : 'bg-slate-600'}`} />
                                Manual
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                            {equalWeightsMode ? (
                                <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                                    <Minus size={40} className="text-slate-600 mb-2" />
                                    <p className="text-sm text-slate-500 px-10">No modo automático, todas as matérias possuem o mesmo peso de relevância.</p>
                                </div>
                            ) : (
                                (activeCategories.length > 0 ? activeCategories : categories).map(cat => {
                                    // Fallback to all categories if none active
                                    const weight = parseInt(weights[cat.name]) || 0;
                                    return (
                                        <div key={cat.id} className="bg-white/5 p-3 rounded-xl border border-white/5 flex items-center gap-4">
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm" style={{ backgroundColor: `${cat.color}20`, border: `1px solid ${cat.color}30` }}>
                                                {cat.icon || '📚'}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-bold text-white mb-1.5">{cat.name}</p>
                                                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                                    <div className="h-full rounded-full transition-all" style={{ width: `${weight}%`, backgroundColor: cat.color }} />
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 bg-slate-900 rounded-lg p-1 border border-white/10">
                                                <button
                                                    onClick={() => updateWeight(cat.name, weight - 5)}
                                                    className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded text-slate-400 hover:text-white transition-colors"
                                                >
                                                    <Minus size={14} />
                                                </button>
                                                <span className="w-9 text-center text-sm font-bold text-white">{weight}%</span>
                                                <button
                                                    onClick={() => updateWeight(cat.name, weight + 5)}
                                                    className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded text-slate-400 hover:text-white transition-colors"
                                                >
                                                    <Plus size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Visual Config with Gradient Colors
    const { probability, mean: _globalMean, sd: _globalSD, ci95Low: _ci95Low, ci95High: _ci95High, categoryStats: _categoryStats } = simulationResult;
    const prob = parseFloat(probability);

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
        <div className="glass h-full p-3 rounded-3xl relative flex flex-col items-center border-l-4 border-blue-500 bg-gradient-to-br from-slate-900 via-slate-900 to-black/80 group hover:bg-black/40 transition-colors shadow-2xl">

            {/* --- HEADER: Title & Today Button --- */}
            <div className="w-full flex justify-between items-start mb-1">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-500/10 rounded-lg border border-blue-500/20">
                        <Gauge size={16} className="text-blue-400" />
                    </div>
                </div>

                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setSimulateToday(!simulateToday);
                    }}
                    className={`
                        px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider transition-all border shadow-sm
                        ${simulateToday
                            ? 'bg-green-500 text-white border-green-400 shadow-[0_0_8px_rgba(34,197,94,0.4)]'
                            : 'bg-slate-800 text-slate-400 border-white/5 hover:bg-slate-700 hover:text-white'}
                    `}
                    title="Alternar entre projeção futura e análise imediata"
                >
                    {simulateToday ? 'PROJEÇÃO: HOJE' : 'PROJEÇÃO: FUTURA'}
                </button>
            </div>


            {/* --- CENTER: Main Gauge & Probability --- */}
            <div className="relative flex flex-col items-center justify-center py-2 shrink-0">
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 blur-2xl">
                    <div className="w-32 h-32 rounded-full" style={{ backgroundColor: gradientColor }} />
                </div>

                <svg width="168" height="84" viewBox="0 0 140 70" className="overflow-visible relative z-10">
                    <path d="M 10 65 A 60 60 0 0 1 130 65" fill="none" stroke="#0f172a" strokeWidth="12" strokeLinecap="round" />
                    <path
                        d="M 10 65 A 60 60 0 0 1 130 65"
                        fill="none"
                        stroke={gradientColor}
                        strokeWidth="12"
                        strokeLinecap="round"
                        strokeDasharray={188}
                        strokeDashoffset={188 - (188 * (prob / 100))}
                        style={{ transition: 'stroke-dashoffset 1.5s ease-out, stroke 0.5s ease-out' }}
                    />
                </svg>

                <div className="absolute inset-x-0 bottom-0 flex items-end justify-center pb-1 z-20">
                    <span className="text-[2.5rem] font-black tracking-tighter drop-shadow-md" style={{ color: gradientColor }}>{prob}%</span>
                </div>
            </div>

            {/* Verse / Verdict */}
            <div className="text-center w-full mb-3 -mt-1 relative z-20">
                <h2 className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full inline-block bg-black/40 backdrop-blur-sm border border-white/10 shadow-sm" style={{ color: gradientColor }}>
                    {message}
                </h2>
            </div>



            {/* --- METRICS GRID (Highlighted Stats) --- */}
            <div className="grid grid-cols-2 gap-1 w-full mb-3 px-0">
                {/* Metric 1: Target */}
                <div className="bg-black/40 p-1 rounded-lg border border-white/10 flex flex-col items-center relative overflow-hidden group/item hover:bg-black/60 transition-colors shadow-inner">
                    <div className="absolute top-0 right-0 w-6 h-6 bg-white/5 rounded-full blur-xl -translate-y-1/2 translate-x-1/2" />
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Sua Meta</span>
                    <span className="text-xs font-black text-white">{targetScore}%</span>
                </div>

                {/* Metric 2: Projection Days */}
                <div className="bg-black/40 p-1 rounded-lg border border-white/10 flex flex-col items-center relative overflow-hidden group/item hover:bg-black/60 transition-colors shadow-inner">
                    <div className="absolute top-0 left-0 w-6 h-6 bg-blue-500/5 rounded-full blur-xl -translate-x-1/2 -translate-y-1/2" />
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Tempo</span>
                    <span className={`text-xs font-black ${simulateToday ? 'text-green-400' : 'text-blue-400'}`}>
                        {simulateToday ? 'AGORA' : `${projectDays}d`}
                    </span>
                </div>

                {/* Metric 3: Cenários Projetados (Curva de Distribuição Interativa) */}
                <div className="col-span-2 bg-black/40 p-2 pb-4 rounded-lg border border-white/10 flex flex-col hover:bg-black/60 transition-colors shadow-inner h-full group/estimate relative">
                    {/* Header */}
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between z-10 relative">
                        Projeção de Desempenho
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-white opacity-40"></div>
                                <span className="text-[8px] text-slate-500">Hoje</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                <span className="text-[8px] text-slate-500">Projeção</span>
                            </div>
                        </div>
                    </span>

                    {/* Gaussian Curve Visualization Component */}
                    {(() => {
                        // Extract values safely
                        const mean = parseFloat(simulationResult.mean);
                        const sd = parseFloat(simulationResult.sd);
                        const low95 = parseFloat(simulationResult.ci95Low);
                        const high95 = parseFloat(simulationResult.ci95High);
                        const currentMean = simulationResult.currentMean ? parseFloat(simulationResult.currentMean) : mean;

                        return (
                            <GaussianChart
                                mean={mean}
                                sd={sd}
                                low95={low95}
                                high95={high95}
                                targetScore={targetScore}
                                currentMean={currentMean}
                            />
                        );
                    })()}


                </div>
            </div>


            {/* --- FOOTER: Stats & Trends --- */}
            <div className="w-full mt-auto flex flex-col gap-2">
                {/* Tech Specs */}
                <div className="flex justify-between px-4 py-1.5 bg-black/40 rounded-lg border border-white/10 text-[9px] text-slate-400 shadow-sm">
                    <span className="flex items-center gap-1">
                        Média Pond: <b className="text-slate-300">{simulationResult.mean}%</b>
                    </span>
                    <span className="w-px h-3 bg-slate-700/50" />
                    <span className="flex items-center gap-1">
                        Consistência: <b className={`${Math.abs(simulationResult.sd) > 10 ? 'text-yellow-400' : 'text-green-400'}`}>±{Math.abs(simulationResult.sd)}%</b>
                    </span>
                </div>

                {/* Trend Chips */}
                <div className="flex flex-wrap justify-center gap-1">
                    {simulationResult.categoryStats.slice(0, 5).map((cat, idx) => (
                        <span key={idx} className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800/80 border border-white/10 text-[8px] text-slate-300 uppercase tracking-tight shadow-sm">
                            {cat.trend === 'up' && <TrendingUp size={8} className="text-green-400" />}
                            {cat.trend === 'down' && <TrendingDown size={8} className="text-red-400" />}
                            {cat.trend === 'stable' && <Minus size={8} className="text-slate-500" />}
                            <span className="max-w-[60px] truncate">{cat.name.split(' ')[0]}</span>
                        </span>
                    ))}
                    {simulationResult.categoryStats.length > 5 && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-800/80 border border-white/10 text-[8px] text-slate-500">
                            +{simulationResult.categoryStats.length - 5}
                        </span>
                    )}
                </div>
            </div>


            {/* Config Trigger (Floating or Bottom) */}
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={() => setShowConfig(true)}
                    className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-blue-500 border border-white/10 flex items-center justify-center transition-all shadow-lg text-slate-400 hover:text-white"
                    title="Configurar Pesos e Metas"
                >
                    <Settings2 size={12} />
                </button>
            </div>

            {/* Dedicated Configuration Modal/Overlay */}
            {
                showConfig && (

                    <div className="absolute inset-0 z-50 bg-slate-900/95 backdrop-blur-sm flex flex-col p-6 animate-in fade-in zoom-in-95 duration-200 rounded-3xl">

                        {/* Modal Header */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                                    <Settings2 size={20} className="text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-white">Configuração</h3>
                                    <p className="text-[10px] text-slate-400">Ajuste os parâmetros da simulação</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowConfig(false)}
                                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                            >
                                <Check size={16} className="text-white" />
                            </button>
                        </div>



                        {/* Target Score Slider */}
                        <div className="bg-slate-800/50 p-4 rounded-xl mb-6 border border-white/5">
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-xs font-bold text-white uppercase tracking-wider">Meta de Aprovação</span>
                                <span className="text-xl font-black text-blue-400">{targetScore}%</span>
                            </div>
                            <input
                                type="range"
                                min="60"
                                max="90"
                                step="1"
                                value={targetScore}
                                onChange={(e) => setTargetScore(parseInt(e.target.value))}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            />
                            <div className="flex justify-between mt-2 text-[10px] text-slate-500 font-mono">
                                <span>60% (Fácil)</span>
                                <span>75% (Médio)</span>
                                <span>90% (Hard)</span>
                            </div>
                        </div>

                        {/* Mode Toggle Checkbox Style */}
                        <div className="bg-slate-800/50 p-1 rounded-xl flex mb-6 border border-white/5">
                            <button
                                onClick={() => {
                                    if (!equalWeightsMode) { setWeights(getEqualWeights()); }
                                    setEqualWeightsMode(true);
                                }}
                                className={`flex-1 py-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${equalWeightsMode ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                <div className={`w-2 h-2 rounded-full ${equalWeightsMode ? 'bg-white' : 'bg-slate-600'}`} />
                                Pesos Iguais
                            </button>
                            <button
                                onClick={() => setEqualWeightsMode(false)}
                                className={`flex-1 py-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${!equalWeightsMode ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                <div className={`w-2 h-2 rounded-full ${!equalWeightsMode ? 'bg-white' : 'bg-slate-600'}`} />
                                Manual
                            </button>
                        </div>

                        {/* Weights List - Large */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                            {equalWeightsMode ? (
                                <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                                    <Minus size={40} className="text-slate-600 mb-2" />
                                    <p className="text-sm text-slate-500 px-10">No modo automático, todas as matérias possuem o mesmo peso de relevância.</p>
                                </div>
                            ) : (
                                activeCategories.map(cat => {
                                    const weight = parseInt(weights[cat.name]) || 0;
                                    return (
                                        <div key={cat.id} className="bg-white/5 p-3 rounded-xl border border-white/5 flex items-center gap-4">
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm" style={{ backgroundColor: `${cat.color}20`, border: `1px solid ${cat.color}30` }}>
                                                {cat.icon || '📚'}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-bold text-white mb-1.5">{cat.name}</p>
                                                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                                    <div className="h-full rounded-full transition-all" style={{ width: `${weight}%`, backgroundColor: cat.color }} />
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 bg-slate-900 rounded-lg p-1 border border-white/10">
                                                <button
                                                    onClick={() => updateWeight(cat.name, weight - 5)}
                                                    className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded text-slate-400 hover:text-white transition-colors"
                                                >
                                                    <Minus size={14} />
                                                </button>
                                                <span className="w-9 text-center text-sm font-bold text-white">{weight}%</span>
                                                <button
                                                    onClick={() => updateWeight(cat.name, weight + 5)}
                                                    className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded text-slate-400 hover:text-white transition-colors"
                                                >
                                                    <Plus size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )
            }
        </div>
    );
}
