import React, { useMemo, useState, useCallback } from 'react';
import { Gauge, TrendingUp, TrendingDown, Minus, Settings2, Check, Plus, ChevronUp, ChevronDown } from 'lucide-react';
import {
    computeCategoryStats,
    monteCarloSimulation,
    calculateCurrentWeightedMean,
    calculateWeightedProjectedMean,
    computePooledSD
} from '../engine';

// Internal Component for the Gaussian Chart with Tooltip State
function GaussianChart({ mean, sd, low95, high95, targetScore, currentMean }) {
    const [hover, setHover] = useState(null); // { x: percent, val: score }

    // Optimization: generic loop for path data
    const { pathData, areaPathData, range, xMin } = useMemo(() => {
        // Optimization: generic loop for path data
        // Safety: Ensure vizSd is at least 3 to prevent division by zero or tiny ranges
        const vizSd = Math.max(3, sd || 3);

        const meanVal = mean || 0;
        const targetVal = targetScore || 70;
        const currentVal = currentMean || 0;

        // Define plot range with safety clamps
        let xMin = Math.max(0, meanVal - 3.5 * vizSd);
        let xMax = Math.min(100, meanVal + 3.5 * vizSd);

        // Expand range to include key points
        xMin = Math.min(xMin, targetVal - 5);
        xMax = Math.max(xMax, targetVal + 5);
        xMin = Math.min(xMin, currentVal - 5);
        xMax = Math.max(xMax, currentVal + 5);

        // Final safety clamp
        xMin = Math.max(0, xMin);
        xMax = Math.min(100, xMax);

        // Ensure range is non-zero
        const range = Math.max(10, xMax - xMin);

        const gaussian = (x) => Math.exp(-0.5 * Math.pow((x - meanVal) / vizSd, 2));

        const points = [];
        // Reduce steps from 60 to 40 for performance
        const steps = 40;

        for (let i = 0; i <= steps; i++) {
            const x = xMin + (range * (i / steps));
            const y = gaussian(x);
            // Ensure y is valid number
            const safeY = isNaN(y) ? 0 : y;
            points.push(`${(x - xMin) / range * 100},${100 - (safeY * 100)}`);
        }
        const path = `M ${points.join(' L ')}`;

        const areaPoints = [];
        for (let i = 0; i <= steps; i++) {
            const x = xMin + (range * (i / steps));
            if (x >= (low95 || 0) && x <= (high95 || 100)) {
                const y = gaussian(x);
                const safeY = isNaN(y) ? 0 : y;
                areaPoints.push(`${(x - xMin) / range * 100},${100 - (safeY * 100)}`);
            }
        }
        if (areaPoints.length > 0) {
            const lastX = areaPoints[areaPoints.length - 1].split(',')[0];
            const firstX = areaPoints[0].split(',')[0];
            areaPoints.push(`${lastX},100`);
            areaPoints.push(`${firstX},100`);
        }
        const areaPath = areaPoints.length > 0 ? `M ${areaPoints.join(' L ')} Z` : '';


        return {
            pathData: path,
            areaPathData: areaPath,
            range,
            xMin
        };
    }, [mean, sd, low95, high95, targetScore, currentMean]);

    const targetPos = (targetScore - xMin) / range * 100;
    const isTargetVisible = targetPos >= 0 && targetPos <= 100;
    const currentPos = (currentMean - xMin) / range * 100;
    const isCurrentVisible = currentPos >= 0 && currentPos <= 100;

    return (
        <div
            className="relative w-full h-32 mt-6 mb-4 cursor-crosshair group/chart"
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
                    <div className="absolute top-1 transform -translate-x-1/2 bg-slate-900 border border-slate-700 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xl pointer-events-none z-50 whitespace-nowrap" style={{ left: `${hover.x}%` }}>
                        {hover.val.toFixed(1)}%
                    </div>
                </>
            )}

            {/* Scale labels at bottom corners */}
            <div className="absolute bottom-0 left-1 text-[9px] font-bold text-slate-500 transform translate-y-full">{Math.round(xMin)}%</div>
            <div className="absolute bottom-0 right-1 text-[9px] font-bold text-slate-500 transform translate-y-full">{Math.round(xMin + range)}%</div>
        </div>
    );
}

// Config Modal Component
function ConfigModal({ show, onClose, targetScore, setTargetScore, equalWeightsMode, setEqualWeightsMode, getEqualWeights, setWeights, weights, updateWeight, activeCategories, categories, onWeightsChange }) {
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
                <button onClick={() => { if (!equalWeightsMode) { const ew = getEqualWeights(); setWeights(ew); if (onWeightsChange) onWeightsChange(ew); } setEqualWeightsMode(true); }} className={`flex-1 py-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${equalWeightsMode ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
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

export default function MonteCarloGauge({ categories = [], goalDate, targetScore, onTargetChange, onWeightsChange }) {
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

    // Save weights to LocalStorage whenever they change
    React.useEffect(() => {
        localStorage.setItem('monte_carlo_weights', JSON.stringify(weights));
    }, [weights]);

    // SYNC: Sync internal weights state with categories prop if weights are missing
    React.useEffect(() => {
        if (categories.length > 0) {
            setWeights(prev => {
                let hasChanges = false;
                const nextWeights = { ...prev };
                categories.forEach(cat => {
                    if (cat.weight !== undefined && cat.weight !== prev[cat.name]) {
                        nextWeights[cat.name] = cat.weight;
                        hasChanges = true;
                    }
                });
                return hasChanges ? nextWeights : prev;
            });
        }
    }, [categories]);

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
        return diffDays > 0 ? diffDays : 30; // If goal passed, fallback to 30 days (simulateToday handles "Hoje")
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

    // Initialize weights equally on first load only if none are saved
    React.useEffect(() => {
        if (catCount > 0 && Object.keys(weights).length === 0) {
            const initialWeights = getEqualWeights();
            setWeights(initialWeights);
            if (onWeightsChange) onWeightsChange(initialWeights);
        }
    }, [catCount, weights, getEqualWeights, onWeightsChange]);





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

            const updatedWeights = { ...prev, [catName]: finalValue };
            if (onWeightsChange) onWeightsChange(updatedWeights);
            return updatedWeights;
        });
    }, [equalWeightsMode, activeCategories, onWeightsChange]);

    // Effective weights for simulation - use weights if available, otherwise equal weights
    // FIX: Filter out orphan categories and ensure all active categories have weights
    const effectiveWeights = useMemo(() => {
        if (equalWeightsMode) {
            return getEqualWeights();
        }

        // Get list of active category names
        const activeCatNames = new Set(activeCategories.map(c => c.name));

        // Filter saved weights to only include active categories
        const filteredWeights = {};
        let hasValidWeights = false;

        for (const catName of activeCatNames) {
            if (weights[catName] !== undefined && weights[catName] > 0) {
                filteredWeights[catName] = weights[catName];
                hasValidWeights = true;
            }
        }

        // If we have valid weights for active categories, use them
        if (hasValidWeights) {
            // Ensure all active categories have at least 0 weight
            for (const catName of activeCatNames) {
                if (filteredWeights[catName] === undefined) {
                    filteredWeights[catName] = 0;
                }
            }
            return filteredWeights;
        }

        // Fallback to equal weights
        return getEqualWeights();
    }, [equalWeightsMode, weights, activeCategories, getEqualWeights]);

    // Simulation result is now derived from useMemo, so we don't need state
    // const [simulationResult, setSimulationResult] = useState(null);

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

    // 1. Gather Stats per Category using Engine Modules (Memoized)
    const statsData = useMemo(() => {
        let categoryStats = [];
        let totalWeight = 0;

        categories.forEach(cat => {
            if (cat.simuladoStats?.history?.length > 0) {
                // Sort history by date
                const history = [...cat.simuladoStats.history].sort((a, b) =>
                    new Date(a.date) - new Date(b.date)
                );

                // Get weight
                const weight = debouncedWeights[cat.name] ?? 0;

                // Use engine module for stats calculation
                // This applies: adaptive SD floor + trend-adjusted variance
                const stats = computeCategoryStats(history, weight);

                if (stats) {
                    if (weight > 0) {
                        totalWeight += weight;
                    }
                    categoryStats.push({
                        name: cat.name,
                        ...stats
                    });
                }
            }
        });

        if (categoryStats.length === 0 ||
            categoryStats.reduce((acc, c) => acc + c.n, 0) < 5 ||
            totalWeight === 0) {
            return null;
        }

        // Use engine modules for projection and variance
        // This applies: sublinear time uncertainty + auditable variance
        const currentWeightedMean = calculateCurrentWeightedMean(categoryStats, totalWeight);
        const weightedMean = calculateWeightedProjectedMean(categoryStats, totalWeight, projectDays);
        const pooledSD = computePooledSD(categoryStats, totalWeight, projectDays);

        return { categoryStats, weightedMean, currentWeightedMean, pooledSD, totalWeight };
    }, [categories, debouncedWeights, projectDays]);

    const [debugMode, setDebugMode] = useState(false);
    const [debugHistory, setDebugHistory] = useState([]);
    const [debugScore, setDebugScore] = useState(70);
    const [debugDayOffset, setDebugDayOffset] = useState(1);

    const handleAddDebugDay = () => {
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + debugDayOffset);

        setDebugHistory(prev => [
            ...prev,
            {
                date: nextDate.toISOString().split('T')[0],
                score: Number(debugScore),
                weight: 100 // Assume full weight for test
            }
        ]);
        setDebugDayOffset(prev => prev + 1);
    };

    const handleResetDebug = () => {
        setDebugHistory([]);
        setDebugDayOffset(1);
    };

    // 3. Run Monte Carlo using Engine Module (Adaptive simulations + Explicit seed)
    const simulationData = useMemo(() => {
        // Collect all history points
        let allHistoryPoints = [];

        categories.forEach(cat => {
            if (cat.simuladoStats?.history?.length > 0) {
                const weight = debouncedWeights[cat.name] ?? 0;
                if (weight > 0) {
                    cat.simuladoStats.history.forEach(h => {
                        if (h.score && h.date) {
                            allHistoryPoints.push({
                                date: new Date(h.date).toISOString().split('T')[0], // Normalize date
                                score: Number(h.score),
                                weight: weight
                            });
                        }
                    });
                }
            }
        });

        // Debug Mode Injection: Merge real history with debug history
        if (debugHistory.length > 0) {
            allHistoryPoints = [...allHistoryPoints, ...debugHistory];
        }

        if (allHistoryPoints.length < 5) return null;

        // Group by Date and Calculate Weighted Average
        const pointsByDate = {};
        allHistoryPoints.forEach(p => {
            if (!pointsByDate[p.date]) pointsByDate[p.date] = { sumScore: 0, sumWeight: 0 };
            pointsByDate[p.date].sumScore += p.score * p.weight;
            pointsByDate[p.date].sumWeight += p.weight;
        });

        const globalHistory = Object.keys(pointsByDate).map(date => ({
            date: date,
            score: pointsByDate[date].sumScore / pointsByDate[date].sumWeight
        })).sort((a, b) => new Date(a.date) - new Date(b.date));

        if (globalHistory.length < 2) return null;

        // Use deterministic seed for reproducibility (based on projectDays)
        // const seed = 123456 + projectDays; // Engine handles seed internally based on history

        // Run simulation with NEW engine module directly
        const result = monteCarloSimulation(
            globalHistory,
            debouncedTarget,
            projectDays,
            2000 // simulations
        );
        console.log("Monte Carlo Simulation Result:", result); // Log simulation results for debugging

        return result;
    }, [categories, debouncedWeights, projectDays, debouncedTarget]);

    const simulationResult = simulationData;


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
                    setTargetScore={onTargetChange}
                    equalWeightsMode={equalWeightsMode}
                    setEqualWeightsMode={setEqualWeightsMode}
                    getEqualWeights={getEqualWeights}
                    setWeights={setWeights}
                    weights={weights}
                    updateWeight={updateWeight}
                    activeCategories={activeCategories}
                    categories={categories}
                    onWeightsChange={onWeightsChange}
                />
            </div>
        );
    }

    // Visual Config with Gradient Colors
    const { probability } = simulationResult;
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

    // FIX: Determine base message first, then add time suffix consistently
    let baseMessage = "Aprovação Improvável";
    if (prob > 80) {
        baseMessage = "Aprovação Matematicamente Certa";
    } else if (prob > 50) {
        baseMessage = "Na Zona de Briga";
    } else if (prob > 25) {
        baseMessage = "Precisa Melhorar";
    }

    // Add time context suffix
    const timeSuffix = simulateToday ? " Hoje" : "";
    const message = baseMessage + timeSuffix;

    return (
        <div className="glass p-3 rounded-3xl relative flex flex-col border-l-4 border-blue-500 bg-gradient-to-br from-slate-900 via-slate-900 to-black/80 group transition-colors shadow-2xl overflow-hidden w-full max-w-full">

            {/* ═══════════════ BLOCO 1: HEADER FIXO ═══════════════ */}
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                        <Gauge size={16} className="text-white" />
                    </div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Monte Carlo</span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={(e) => { e.stopPropagation(); setSimulateToday(!simulateToday); }}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${simulateToday ? 'bg-green-500/20 border-green-500/40 text-green-400' : 'bg-blue-500/20 border-blue-500/40 text-blue-400'}`}
                    >
                        Projeção: {simulateToday ? 'Hoje' : 'Futura'}
                    </button>
                    {!simulateToday && simulationResult.mean === simulationResult.currentMean && projectDays > 0 && (
                        <div className="group/info relative">
                            <div className="w-5 h-5 rounded-full bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center cursor-help">
                                <span className="text-[10px] font-bold text-yellow-500">?</span>
                            </div>
                            <div className="absolute top-full right-0 mt-2 w-48 p-2 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50 opacity-0 group-hover/info:opacity-100 pointer-events-none transition-opacity">
                                <p className="text-[9px] text-slate-300 leading-tight">
                                    <span className="text-yellow-400 font-bold block mb-1">Por que igual a hoje?</span>
                                    Para projetar evolução, precisamos de simulados em <strong>dias diferentes</strong>. Com dados de apenas um dia, a tendência é neutra.
                                </p>
                            </div>
                        </div>
                    )}
                    <button
                        onClick={() => setShowConfig(true)}
                        className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-blue-500 border border-white/10 flex items-center justify-center transition-all text-slate-400 hover:text-white"
                    >
                        <Settings2 size={14} />
                    </button>
                    {/* Debug Toggle */}
                    <button
                        onClick={() => setDebugMode(!debugMode)}
                        className={`w-8 h-8 rounded-lg border border-white/10 flex items-center justify-center transition-all ${debugMode ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                    >
                        <span className="text-[10px] font-bold">🛠️</span>
                    </button>
                </div>
            </div>

            {/* DEBUG CONSOLE */}
            {debugMode && (
                <div className="mb-4 bg-purple-900/30 border border-purple-500/30 rounded-xl p-3 flex flex-col gap-2 animate-in fade-in slide-in-from-top-2">
                    <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-purple-300">Modo de Teste (Cheat Mode)</span>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-purple-400">Dia +{debugDayOffset}</span>
                            <button onClick={handleResetDebug} className="text-[10px] text-red-400 hover:text-red-300 underline">Resetar</button>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="number"
                            min="0" max="100"
                            value={debugScore}
                            onChange={(e) => setDebugScore(Number(e.target.value))}
                            className="bg-purple-900/50 border border-purple-500/30 rounded-lg px-2 py-1 text-white text-xs w-20 text-center"
                            placeholder="Nota"
                        />
                        <button
                            onClick={handleAddDebugDay}
                            className="flex-1 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold py-1 rounded-lg transition-colors shadow-lg shadow-purple-900/50"
                        >
                            Simular Dia Seguinte
                        </button>
                    </div>
                    <p className="text-[9px] text-purple-400/70 italic text-center">
                        Isso adiciona um ponto simulado no histórico para testar a projeção.
                    </p>
                </div>
            )}


            {/* ═══════════════ BLOCO 2: RESULTADO PRINCIPAL ═══════════════ */}
            <div className="w-full bg-black/30 rounded-xl p-6 mb-4 border border-white/5">
                <div className="flex flex-col items-center">
                    <div className="relative mb-6">
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 blur-2xl">
                            <div className="w-24 h-24 rounded-full" style={{ backgroundColor: gradientColor }} />
                        </div>
                        <svg width="200" height="100" viewBox="0 0 140 70" className="overflow-visible relative z-10">
                            <path d="M 10 65 A 60 60 0 0 1 130 65" fill="none" stroke="#1e293b" strokeWidth="12" strokeLinecap="round" />
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
                        <div className="absolute inset-x-0 bottom-0 flex items-end justify-center pb-0 z-20">
                            <span className="text-5xl font-black tracking-tighter drop-shadow-md" style={{ color: gradientColor }}>{prob.toFixed(1)}%</span>
                        </div>
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest px-6 py-2 rounded-full bg-black/40 border border-white/10 shadow-lg" style={{ color: gradientColor }}>
                        {message}
                    </span>
                </div>
            </div>

            {/* ═══════════════ BLOCO 3: MÉTRICAS ESTATÍSTICAS ═══════════════ */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                <div className="bg-black/40 p-2 rounded-lg border border-white/10 flex flex-col items-center">
                    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Sua Meta</span>
                    <span className="text-sm font-black text-red-400">{targetScore}%</span>
                </div>
                <div className="bg-black/40 p-2 rounded-lg border border-white/10 flex flex-col items-center">
                    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Média</span>
                    <span className="text-sm font-black text-blue-400">{simulationResult.mean}%</span>
                </div>
                <div className="bg-black/40 p-2 rounded-lg border border-white/10 flex flex-col items-center">
                    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Consistência</span>
                    <span className={`text-sm font-black ${Math.abs(parseFloat(simulationResult.sd)) <= 5 ? 'text-green-400' : Math.abs(parseFloat(simulationResult.sd)) <= 10 ? 'text-yellow-400' : 'text-red-400'}`}>
                        ±{Math.abs(parseFloat(simulationResult.sd))}%
                    </span>
                </div>
                <div className="bg-black/40 p-2 rounded-lg border border-white/10 flex flex-col items-center">
                    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">IC 95%</span>
                    <span className="text-sm font-black text-green-400 whitespace-nowrap">{simulationResult.ci95Low}-{simulationResult.ci95High}%</span>
                </div>
            </div>

            {/* ═══════════════ BLOCO 4: PROJEÇÃO DE DESEMPENHO ═══════════════ */}
            <div className="w-full bg-black/30 rounded-xl p-4 mb-4 border border-white/5">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Projeção de Desempenho</span>
                </div>
                <div className="w-full h-36 px-2">
                    {(() => {
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
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-3 pt-3 border-t border-white/10">
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-0.5 bg-red-500"></div>
                        <span className="text-[9px] text-slate-400">Meta</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-0.5 bg-blue-500 opacity-50" style={{ borderTop: '1px dashed #3b82f6' }}></div>
                        <span className="text-[9px] text-slate-400">Média</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-sm bg-green-500/30 border border-green-500/50"></div>
                        <span className="text-[9px] text-slate-400">IC 95%</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-white/40"></div>
                        <span className="text-[9px] text-slate-400">Hoje</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-0.5 bg-blue-500"></div>
                        <span className="text-[9px] text-slate-400">Projeção</span>
                    </div>
                </div>
            </div>

            {/* ═══════════════ BLOCO 5: TENDÊNCIAS POR CATEGORIA ═══════════════ */}
            <div className="w-full">
                <div className="flex flex-wrap justify-center gap-1.5">
                    {statsData.categoryStats.slice(0, 8).map((cat) => (
                        <div key={cat.name} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800/60 border border-white/5 text-[8px] text-slate-300 uppercase tracking-tight">
                            {cat.trend === 'up' && <TrendingUp size={10} className="text-green-400" />}
                            {cat.trend === 'down' && <TrendingDown size={10} className="text-red-400" />}
                            {cat.trend === 'stable' && <Minus size={10} className="text-slate-500" />}
                            <span className="max-w-[70px] truncate">{cat.name.split(' ')[0]}</span>
                        </div>
                    ))}
                    {statsData.categoryStats.length > 8 && (
                        <span className="px-2 py-1 rounded-lg bg-slate-800/60 border border-white/5 text-[8px] text-slate-500">
                            +{statsData.categoryStats.length - 8}
                        </span>
                    )}
                </div>
            </div>

            {/* Modal de Configuração */}
            <ConfigModal
                show={showConfig}
                onClose={setShowConfig}
                targetScore={targetScore}
                setTargetScore={onTargetChange}
                equalWeightsMode={equalWeightsMode}
                setEqualWeightsMode={setEqualWeightsMode}
                getEqualWeights={getEqualWeights}
                setWeights={setWeights}
                weights={weights}
                updateWeight={updateWeight}
                activeCategories={activeCategories}
                categories={categories}
                onWeightsChange={onWeightsChange}
            />
        </div>
    );
}
