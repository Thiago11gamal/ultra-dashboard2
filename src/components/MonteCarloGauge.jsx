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

    // Optimization: generic loop for path data
    const { pathData, areaPathData, labelsData, range, xMin } = useMemo(() => {
        // Enforce minimum SD for visualization
        const vizSd = Math.max(0.5, sd);

        // Define plot range
        let xMin = Math.max(0, mean - 3.5 * vizSd);
        let xMax = Math.min(100, mean + 3.5 * vizSd);

        xMin = Math.min(xMin, targetScore - 5);
        xMax = Math.max(xMax, targetScore + 5);
        xMin = Math.min(xMin, currentMean - 5);
        xMax = Math.max(xMax, currentMean + 5);
        xMin = Math.max(0, xMin);
        xMax = Math.min(100, xMax);

        const range = Math.max(1, xMax - xMin);

        const gaussian = (x) => Math.exp(-0.5 * Math.pow((x - mean) / vizSd, 2));

        const points = [];
        const steps = 60;
        for (let i = 0; i <= steps; i++) {
            const x = xMin + (range * (i / steps));
            const y = gaussian(x);
            points.push(`${(x - xMin) / range * 100},${100 - (y * 100)}`);
        }
        const path = `M ${points.join(' L ')}`;

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
        const areaPath = areaPoints.length > 0 ? `M ${areaPoints.join(' L ')} Z` : '';

        // Pre-calculate label positions
        const getPos = (val) => (val - xMin) / range * 100;
        const labels = [
            { id: 'mean', pos: getPos(mean), val: mean, color: 'text-blue-500', offset: 0, align: 'transform -translate-x-1/2' },
            { id: 'target', pos: getPos(targetScore), val: targetScore, color: 'text-red-500', offset: 0, align: 'transform -translate-x-1/2' },
            { id: 'high', pos: getPos(high95), val: high95, color: 'text-green-400', offset: 0, prefix: 'IC+', align: 'transform -translate-x-1/2' },
            { id: 'low', pos: getPos(low95), val: low95, color: 'text-green-400', offset: 0, prefix: 'IC-', align: 'transform -translate-x-1/2' }
        ].sort((a, b) => a.pos - b.pos);

        const minDistance = 12;
        for (let i = 1; i < labels.length; i++) {
            if (labels[i].pos - labels[i - 1].pos < minDistance) {
                labels[i].offset = labels[i - 1].offset + 12;
            }
        }

        return {
            pathData: path,
            areaPathData: areaPath,
            range,
            xMin,
            labelsData: labels
        };
    }, [mean, sd, low95, high95, targetScore, currentMean]);

    const targetPos = (targetScore - xMin) / range * 100;
    const isTargetVisible = targetPos >= 0 && targetPos <= 100;
    const currentPos = (currentMean - xMin) / range * 100;
    const isCurrentVisible = currentPos >= 0 && currentPos <= 100;

    return (
        <div
            className="relative w-full h-24 mt-1 mb-8 cursor-crosshair group/chart"
            onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
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

                <line x1="0" y1="100" x2="100" y2="100" stroke="#334155" strokeWidth="1" />
                <path d={pathData} fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" className="opacity-50 animate-path" />
                <path d={areaPathData} fill="url(#areaGradient)" stroke="#22c55e" strokeWidth="2" />

                {isCurrentVisible && (
                    <line x1={currentPos} y1="100" x2={currentPos} y2="20" stroke="white" strokeWidth="1.5" strokeDasharray="1,2" className="opacity-40" />
                )}

                <line x1={(mean - xMin) / range * 100} y1="100" x2={(mean - xMin) / range * 100} y2="0" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="3,3" className="opacity-80" />

                {isTargetVisible && (
                    <line x1={targetPos} y1="100" x2={targetPos} y2="0" stroke="#ef4444" strokeWidth="1.5" />
                )}
            </svg>

            {hover && (
                <>
                    <div className="absolute top-0 bottom-0 w-px bg-white/50 pointer-events-none transition-opacity" style={{ left: `${hover.x}%` }} />
                    <div className="absolute -top-5 transform -translate-x-1/2 bg-slate-900 border border-slate-700 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xl pointer-events-none z-50 whitespace-nowrap" style={{ left: `${hover.x}%` }}>
                        {hover.val.toFixed(1)}%
                    </div>
                </>
            )}

            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                <div className="absolute bottom-0 left-0 text-[10px] font-black text-green-500 tracking-tighter transform translate-y-full mt-1">0</div>
                <div className="absolute bottom-0 right-0 text-[10px] font-black text-green-500 tracking-tighter transform translate-y-full mt-1">100</div>

                {labelsData.map(label => (
                    <div key={label.id} className={`absolute bottom-0 text-[10px] font-black ${label.color} tracking-tighter ${label.align} translate-y-full mt-1 transition-all`} style={{ left: `${label.pos}%`, transform: `translateY(calc(100% + ${label.offset}px))` }}>
                        {label.prefix && <span className="text-[7px] opacity-70 mr-0.5">{label.prefix}</span>}
                        {label.val}%
                    </div>
                ))}
            </div>
        </div>
    );
}

// Config Modal Component
function ConfigModal({ show, onClose, targetScore, setTargetScore, equalWeightsMode, setEqualWeightsMode, getEqualWeights, setWeights, weights, updateWeight, activeCategories, categories }) {
    if (!show) return null;

    // Fallback to all categories if activeCategories is empty/undefined, or just use active
    const catsToShow = activeCategories && activeCategories.length > 0 ? activeCategories : categories;

    return (
        <div className="absolute inset-0 z-50 bg-slate-900/95 backdrop-blur-sm flex flex-col p-6 animate-in fade-in zoom-in-95 duration-200 rounded-3xl">
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
                <button onClick={() => onClose(false)} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
                    <Check size={16} className="text-white" />
                </button>
            </div>

            <div className="bg-slate-800/50 p-4 rounded-xl mb-6 border border-white/5">
                <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Meta de Aprovação</span>
                    <span className="text-xl font-black text-blue-400">{targetScore}%</span>
                </div>
                <input type="range" min="60" max="90" step="1" value={targetScore} onChange={(e) => setTargetScore(parseInt(e.target.value))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                <div className="flex justify-between mt-2 text-[10px] text-slate-500 font-mono">
                    <span>60% (Fácil)</span>
                    <span>75% (Médio)</span>
                    <span>90% (Hard)</span>
                </div>
            </div>

            <div className="bg-slate-800/50 p-1 rounded-xl flex mb-6 border border-white/5">
                <button onClick={() => { if (!equalWeightsMode) { setWeights(getEqualWeights()); } setEqualWeightsMode(true); }} className={`flex-1 py-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${equalWeightsMode ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                    <div className={`w-2 h-2 rounded-full ${equalWeightsMode ? 'bg-white' : 'bg-slate-600'}`} />
                    Pesos Iguais
                </button>
                <button onClick={() => setEqualWeightsMode(false)} className={`flex-1 py-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${!equalWeightsMode ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
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
                    catsToShow.map(cat => {
                        const weight = parseInt(weights[cat.name]) || 0;
                        return (
                            <div key={cat.id} className="bg-white/5 p-3 rounded-xl border border-white/5 flex items-center gap-4">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm" style={{ backgroundColor: `${cat.color}20`, border: `1px solid ${cat.color}30` }}>{cat.icon || '📚'}</div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-white mb-1.5">{cat.name}</p>
                                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full transition-all" style={{ width: `${weight}%`, backgroundColor: cat.color }} />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 bg-slate-900 rounded-lg p-1 border border-white/10">
                                    <button onClick={() => updateWeight(cat.name, weight - 5)} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded text-slate-400 hover:text-white transition-colors"><Minus size={14} /></button>
                                    <span className="w-9 text-center text-sm font-bold text-white">{weight}%</span>
                                    <button onClick={() => updateWeight(cat.name, weight + 5)} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded text-slate-400 hover:text-white transition-colors"><Plus size={14} /></button>
                                </div>
                            </div>
                        );
                    })
                )}
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

    // Simple weight storage - persistent
    const [weights, setWeights] = useState(() => {
        const saved = localStorage.getItem('monte_carlo_weights');
        return saved ? JSON.parse(saved) : {};
    });

    // Target Score - Persistent (Default 70)
    const [targetScore, setTargetScore] = useState(() => {
        const saved = localStorage.getItem('monte_carlo_target');
        return saved ? parseInt(saved) : 70;
    });

    // Save to LocalStorage whenever they change
    React.useEffect(() => {
        localStorage.setItem('monte_carlo_weights', JSON.stringify(weights));
    }, [weights]);

    React.useEffect(() => {
        localStorage.setItem('monte_carlo_target', targetScore.toString());
    }, [targetScore]);

    const projectDays = useMemo(() => {
        if (simulateToday) return 0; // Force 0 days if "Today" is selected
        if (!goalDate) return 30;
        const now = new Date();
        now.setHours(0, 0, 0, 0); // Normalize to midnight

        // Robust Goal Date Parsing (matches StatsCards.jsx logic)
        // If ISO string (e.g. 2026-02-01T00:00Z), new Date() shifts to local (Jan 31).
        // We want "Calendar Date", so we extract UTC components to build local date.
        let goal;
        if (typeof goalDate === 'string' && goalDate.includes('T')) {
            const g = new Date(goalDate);
            goal = new Date(g.getUTCFullYear(), g.getUTCMonth(), g.getUTCDate());
        } else {
            // Fallback for non-ISO or Date objects
            goal = new Date(goalDate);
        }
        goal.setHours(0, 0, 0, 0); // Normalize to midnight

        if (isNaN(goal.getTime())) return 30;

        const diffTime = goal - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 0; // If today or passed, 0 days projection (which means Today's mean)
    }, [goalDate, simulateToday]);

    // Function to calculate equal weights
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
        if (equalWeightsMode) {
            return getEqualWeights();
        }
        if (Object.keys(weights).length > 0) {
            return weights;
        }
        // Fallback to equal weights
        return getEqualWeights();
    }, [equalWeightsMode, weights, catCount, getEqualWeights, activeCategories]);

    const [simulationResult, setSimulationResult] = useState(null);

    // Debounced values to prevent heavy simulation on every slider drag
    const [debouncedTarget, setDebouncedTarget] = useState(targetScore);
    const [debouncedWeights, setDebouncedWeights] = useState(effectiveWeights);

    React.useEffect(() => {
        const timer = setTimeout(() => setDebouncedTarget(targetScore), 300);
        return () => clearTimeout(timer);
    }, [targetScore]);

    React.useEffect(() => {
        const timer = setTimeout(() => setDebouncedWeights(effectiveWeights), 300);
        return () => clearTimeout(timer);
    }, [effectiveWeights]);

    React.useEffect(() => {
        // 1. Gather Stats per Category with Weights & Trends
        let categoryStats = [];
        let totalWeight = 0;

        categories.forEach(cat => {
            if (cat.simuladoStats && cat.simuladoStats.history && cat.simuladoStats.history.length > 0) {
                // Sort history by date to ensure correct trend and regression
                const history = [...cat.simuladoStats.history].sort((a, b) => new Date(a.date) - new Date(b.date));
                const scores = history.map(h => h.score);

                // Calculate mean for this category (Use Last 5 exams for "Current Status", not lifetime average)
                // Lifetime average drags down current performance if user improved.
                const recentScores = scores.slice(-5);
                const mean = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;

                // Calculate SD for this category (Sample SD, n-1) based on RECENT history too (more accurate consistency)
                const n = recentScores.length;
                const variance = n > 1
                    ? recentScores.reduce((acc, score) => acc + Math.pow(score - mean, 2), 0) / (n - 1)
                    : 0;
                const sd = Math.sqrt(variance);

                // Calculate trend (compare last 3 vs previous 3)
                let trend = 'stable';
                const totalN = scores.length;
                // ... (trend logic remains same, it uses full history length for window calc)
                const windowSize = Math.min(3, Math.floor(totalN / 2));
                const recentWindow = scores.slice(totalN - windowSize).reduce((a, b) => a + b, 0) / windowSize;
                const previousWindow = scores.slice(totalN - (windowSize * 2), totalN - windowSize).reduce((a, b) => a + b, 0) / windowSize;

                if (recentWindow > previousWindow + 2) trend = 'up';
                else if (recentWindow < previousWindow - 2) trend = 'down';

                // Get weight for this category
                const weight = debouncedWeights[cat.name] !== undefined ? debouncedWeights[cat.name] : 0;

                // Only include categories with weight > 0
                if (weight > 0) {
                    totalWeight += weight;
                    categoryStats.push({
                        name: cat.name,
                        mean,
                        sd,
                        trend,
                        weight,
                        n,
                        history // Added history for regression
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
            let intercept = cat.mean; // Fallback intercept

            if (denom !== 0) {
                slope = (n * sumXY - sumX * sumY) / denom;
                intercept = (sumY - slope * sumX) / n;
            }

            // Limit slope to realistic values - increased to 2.0%
            const safeSlope = Math.max(-2.0, Math.min(2.0, slope));

            // Calculate Target Days directly from First History Date to (Now + ProjectDays)
            // This accounts for the gap between Last Simulado and Today correctly.
            const firstDate = new Date(cat.history[0].date).getTime();

            // Normalize current date to midnight to avoid intraday jitter
            const nowObj = new Date();
            nowObj.setHours(0, 0, 0, 0);
            const now = nowObj.getTime();

            const projectMs = projectDays * (1000 * 60 * 60 * 24);

            // Target Date = Now + ProjectDays
            // Target X (days from start) = (Target Date - First Date) / OneDay
            const targetX = (now + projectMs - firstDate) / (1000 * 60 * 60 * 24);

            const projectedScore = intercept + (safeSlope * targetX);

            // Clamp projection 0-100
            const safeProjection = Math.max(0, Math.min(100, projectedScore));

            return acc + (safeProjection * cat.weight);
        }, 0) / (totalWeight || 1);

        // Pooled SD - Remove the "trendFactor" hack. Trend is now in the Mean.
        const pooledVariance = categoryStats.reduce((acc, cat) => {
            return acc + (cat.weight * cat.sd * cat.sd);
        }, 0) / (totalWeight || 1);

        // Add uncertainty over time (Time-dependent variance)
        // Future predictions are naturally less certain. We add a small variance growth per day.
        const timeUncertainty = projectDays * 0.5; // Heuristic: SD grows slightly with time
        const pooledSD = Math.sqrt(pooledVariance + timeUncertainty);

        // 3. Run Monte Carlo (10,000 iterations)
        const simulations = 10000;
        let scores = [];
        const target = debouncedTarget; // Use debounced target

        // Seeded RNG (Mulberry32) - Ensures consistency between renders
        function mulberry32(a) {
            return function () {
                var t = a += 0x6D2B79F5;
                t = Math.imul(t ^ t >>> 15, t | 1);
                t ^= t + Math.imul(t ^ t >>> 7, t | 61);
                return ((t ^ t >>> 14) >>> 0) / 4294967296;
            }
        }

        // Use a fixed seed + projectDays to ensure distinct but stable patterns for Today vs Future
        const seed = 123456 + projectDays;
        const random = mulberry32(seed);

        // Box-Muller Transform with Seeded Random
        const boxMuller = (m, s) => {
            let u = 0, v = 0;
            while (u === 0) u = random();
            while (v === 0) v = random();
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
    }, [categories, debouncedWeights, debouncedTarget, projectDays]);

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
                </div>

                <ConfigModal
                    show={showConfig}
                    onClose={setShowConfig}
                    targetScore={targetScore}
                    setTargetScore={setTargetScore}
                    equalWeightsMode={equalWeightsMode}
                    setEqualWeightsMode={setEqualWeightsMode}
                    getEqualWeights={getEqualWeights}
                    setWeights={setWeights}
                    weights={weights}
                    updateWeight={updateWeight}
                    activeCategories={activeCategories}
                    categories={categories}
                />
            </div>
        );
    }

    // Visual Config with Gradient Colors
    const { probability, mean: _globalMean, sd: _globalSD, ci95Low: _ci95Low, ci95High: _ci95High, categoryStats: _categoryStats } = simulationResult;
    const prob = parseFloat(probability);

    // Gradient color function: smoothly transitions from red -> orange -> yellow -> green
    // Gradient color function: customized to make 62% appear green
    const getGradientColor = (percentage) => {
        if (percentage <= 25) {
            return 'rgb(239, 68, 68)'; // Red
        } else if (percentage <= 55) {
            // Red -> Yellow
            const t = (percentage - 25) / 30;
            const r = Math.round(239 + (234 - 239) * t);
            const g = Math.round(68 + (179 - 68) * t);
            const b = Math.round(68 + (8 - 68) * t);
            return `rgb(${r}, ${g}, ${b})`;
        } else if (percentage <= 65) {
            // Yellow -> Green (Transition faster)
            const t = (percentage - 55) / 10;
            const r = Math.round(234 + (34 - 234) * t);
            const g = Math.round(179 + (197 - 179) * t);
            const b = Math.round(8 + (94 - 8) * t);
            return `rgb(${r}, ${g}, ${b})`;
        } else {
            return 'rgb(34, 197, 94)'; // Green
        }
    };

    const gradientColor = getGradientColor(prob);

    let message = "Aprovação Improvável";
    if (simulateToday) {
        message += " Hoje";
    } else {
        message += " na Data da Prova";
    }

    if (prob > 80) {
        message = simulateToday ? "Aprovação Matematicamente Certa Hoje" : "Aprovação Matematicamente Certa";
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
                    <div className="w-full h-32 relative">
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
            </div>

            {/* --- FOOTER: Stats & Trends --- */}
            <div className="w-full mt-auto flex flex-col gap-2">

                {/* Tech Specs */}
                <div className="flex justify-between px-4 py-2 bg-black/40 rounded-lg border border-white/10 text-[9px] text-slate-400 shadow-sm">
                    <div className="flex flex-col gap-0.5">
                        <span className="flex items-center gap-1">
                            Média Pond: <b className="text-slate-300">{simulationResult.mean}%</b>
                        </span>
                        <span className="flex items-center gap-1">
                            Consistência: <b className={`${Math.abs(simulationResult.sd) > 10 ? 'text-yellow-400' : 'text-green-400'}`}>±{Math.abs(simulationResult.sd)}%</b>
                        </span>
                    </div>
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
            <ConfigModal
                show={showConfig}
                onClose={setShowConfig}
                targetScore={targetScore}
                setTargetScore={setTargetScore}
                equalWeightsMode={equalWeightsMode}
                setEqualWeightsMode={setEqualWeightsMode}
                getEqualWeights={getEqualWeights}
                setWeights={setWeights}
                weights={weights}
                updateWeight={updateWeight}
                activeCategories={activeCategories}
                categories={categories}
            />
        </div>
    );
}
