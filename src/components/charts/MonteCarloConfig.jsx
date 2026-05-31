import React, { useRef } from 'react';
import { Settings2, Check, Minus, Plus, Activity } from 'lucide-react';

const WeightRow = React.memo(({ cat, weight, manualTotal, updateWeight }) => {
    const normalizedShare = manualTotal > 0 ? Math.round((weight / manualTotal) * 100) : 0;
    return (
        <div key={cat.id || cat.name} className={`bg-slate-800/40 backdrop-blur-md p-3 rounded-2xl border border-white/[0.03] flex flex-col sm:flex-row items-center gap-4 hover:border-indigo-500/20 transition-all ${weight === 0 ? 'opacity-50 grayscale' : ''}`}>
            <div className="flex items-center gap-4 w-full sm:w-auto">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm shadow-inner shrink-0" style={{ backgroundColor: `${cat.color || '#3b82f6'}15`, border: `1px solid ${cat.color || '#3b82f6'}20` }}>{cat.icon || '📚'}</div>
                <div className="flex-1 sm:hidden">
                    <p className="text-[11px] font-black text-slate-200 uppercase tracking-tight mb-0.5 truncate">{cat.name || 'Matéria'}</p>
                    <p className="text-[9px] font-black text-slate-500">{normalizedShare}% da Classificação</p>
                </div>
            </div>
            <div className="hidden sm:block flex-1 min-w-0">
                <p className="text-[11px] font-black text-slate-200 uppercase tracking-tight mb-1.5 truncate">{cat.name || 'Matéria'}</p>
                <div className="h-1.5 bg-slate-950/50 rounded-full overflow-hidden shadow-inner border border-black/20">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${normalizedShare}%`, backgroundColor: cat.color || '#3b82f6' }} />
                </div>
                <div className="flex items-center justify-between mt-1.5">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Share</p>
                    <p className="text-[9px] font-black text-slate-400">{normalizedShare}%</p>
                </div>
            </div>
            <div className="flex items-center gap-1 bg-slate-950/40 rounded-xl p-1 border border-white/5 w-full sm:w-auto justify-between sm:justify-start">
                {[0, 1, 2, 3].map(p => (
                    <button
                        type="button"
                        key={p}
                        onClick={() => updateWeight(cat.id || cat.name, p)}
                        className={`flex-1 sm:flex-none w-10 sm:w-8 h-10 sm:h-8 rounded-lg text-[10px] font-black transition-all ${weight === p ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                    >
                        P{p}
                    </button>
                ))}
            </div>
        </div>
    );
});

export const MonteCarloConfig = ({
    show, onClose, targetScore, setTargetScore,
    equalWeightsMode, setEqualWeightsMode, getEqualWeights,
    setWeights, weights, updateWeight, categories,
    historicalCutoffs = [], setHistoricalCutoffs,
    minScore = 0, maxScore = 100
}) => {
    const savedCustomWeights = useRef(null);
    const [newCutoff, setNewCutoff] = React.useState('');
    
    // 🔒 PADRÃO CONTROLADO: O componente agora é 'burro'. 
    // A lógica de trava (lock) e debounce reside no pai (VerifiedStats).

    // FIX: Permitir que o peso manual possa ser 0 sem assumir Math.max(1)
    const safeMinScore = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
    const safeMaxScore = Number.isFinite(Number(maxScore)) && Number(maxScore) > safeMinScore ? Number(maxScore) : Math.max(safeMinScore + 1, 100);
    const sliderMin = Math.max(safeMinScore, Math.round(safeMaxScore * 0.1));
    const sliderRange = Math.max(1, safeMaxScore - sliderMin);
    const clampedTarget = Math.min(safeMaxScore, Math.max(sliderMin, Number(targetScore) || sliderMin));
    
    const [localTarget, setLocalTarget] = React.useState(clampedTarget);
    const isDragging = useRef(false);
    const debounceTimeout = useRef(null);
    const sliderRef = useRef(null);

    React.useEffect(() => {
        if (!isDragging.current) {
            setLocalTarget(clampedTarget);
            if (sliderRef.current && sliderRef.current.value !== String(clampedTarget)) {
                sliderRef.current.value = clampedTarget;
            }
        }
    }, [clampedTarget]);

    React.useEffect(() => {
        if (show) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
            document.body.style.overflow = '';
        };
    }, [show]);

    const displayTarget = localTarget;
    const sliderPercent = ((displayTarget - sliderMin) / sliderRange) * 100;

    const manualTotal = categories.reduce((acc, cat) => {
        const val = weights?.[cat.id || cat.name];
        return acc + Math.max(0, parseInt(val !== undefined ? val : 1, 10) || 0);
    }, 0);

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 lg:p-8 animate-in fade-in duration-300"
            style={{ display: show ? 'flex' : 'none' }}
        >
            {/* Backdrop com clique para fechar opcional (stopPropagation adicionado para evitar bubbling ao fundo) */}
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={(e) => { e.stopPropagation(); onClose(false); }} />

            <div className="relative w-full max-w-2xl h-full max-h-[90vh] bg-slate-900 border border-white/10 shadow-2xl rounded-3xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-md flex items-center justify-between gap-3 p-4 sm:p-6 border-b border-white/5">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 shadow-inner flex items-center justify-center">
                            <Activity className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-sm font-bold text-slate-200 truncate">Engine configuration</h3>
                            <p className="text-[10px] text-slate-400 truncate">Monte Carlo & Classificações das Matérias</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onClose(false);
                        }}
                        className="shrink-0 flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-all shadow-lg shadow-emerald-500/20 group/close focus:outline-none focus:ring-2 focus:ring-emerald-300/70"
                        title="Salvar e Fechar"
                    >
                        <Check size={18} className="text-white group-hover/close:scale-110 transition-transform" />
                        <span className="hidden sm:inline text-[10px] font-black text-white uppercase tracking-wider">Salvar</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pt-2">
                    <div className="bg-slate-950/40 backdrop-blur-xl p-6 rounded-3xl mb-8 border border-white/[0.03] shadow-2xl relative overflow-hidden group/target">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover/target:opacity-20 transition-opacity">
                            <Activity size={48} className="text-blue-500" />
                        </div>
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-1">Target Achievement</span>
                                <span className="text-3xl font-black text-white tracking-tighter italic">
                                    <span>{displayTarget}</span>
                                    <span className="text-blue-500">%</span>
                                </span>
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] font-black text-blue-500/60 uppercase tracking-widest block">Min. Viability</span>
                                <span className="text-xs font-bold text-slate-400">Competitive Goal</span>
                            </div>
                        </div>
                        <div className="relative h-6 flex items-center mb-4">
                            <input
                                ref={sliderRef}
                                type="range"
                                min={sliderMin}
                                max={safeMaxScore}
                                step="1"
                                defaultValue={clampedTarget}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value, 10);
                                    setLocalTarget(val);
                                    
                                    isDragging.current = true;
                                    if (window.mcConfigDragTimeout) clearTimeout(window.mcConfigDragTimeout);
                                    window.mcConfigDragTimeout = setTimeout(() => { isDragging.current = false; }, 500);

                                    if (setTargetScore) {
                                        if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
                                        debounceTimeout.current = setTimeout(() => {
                                            if (React.startTransition) {
                                                React.startTransition(() => {
                                                    setTargetScore(val);
                                                });
                                            } else {
                                                setTargetScore(val);
                                            }
                                        }, 40);
                                    }
                                }}
                                onPointerDown={() => {
                                    isDragging.current = true;
                                }}
                                onPointerUp={() => {
                                    isDragging.current = false;
                                    if (window.mcConfigDragTimeout) clearTimeout(window.mcConfigDragTimeout);
                                }}
                                onTouchStart={() => { isDragging.current = true; }}
                                onTouchEnd={() => {
                                    isDragging.current = false;
                                    if (window.mcConfigDragTimeout) clearTimeout(window.mcConfigDragTimeout);
                                }}
                                className="custom-slider w-full h-1.5 rounded-full outline-none"
                                style={{
                                    background: `linear-gradient(to right, #3b82f6 ${sliderPercent}%, rgba(255,255,255,0.1) ${sliderPercent}%)`,
                                    touchAction: 'none'
                                }}
                            />
                        </div>
                        <div className="relative h-6 mt-2 w-full px-1">
                            {[
                                { ratio: 0.6, label: 'Baseline', color: 'text-slate-600' },
                                { ratio: 0.75, label: 'Optimized', color: 'text-blue-500/60' },
                                { ratio: 0.9, label: 'Elite', color: 'text-slate-600' }
                            ].map(({ ratio, label, color }, i) => {
                                const val = Math.round(maxScore * ratio);
                                const percent = Math.max(0, Math.min(100, ((val - sliderMin) / sliderRange) * 100));
                                return (
                                    <div key={i} className="absolute flex flex-col items-center" style={{ left: `calc(${percent}% + ${8 - percent * 0.16}px)`, transform: 'translateX(-50%)' }}>
                                        <div className="w-0.5 h-1.5 bg-slate-600/50 mb-1 rounded-full"></div>
                                        <span className={`text-[8px] font-black uppercase tracking-widest ${color}`}>{label} ({val})</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="bg-slate-950/40 p-5 rounded-3xl mb-8 border border-white/[0.03] shadow-inner relative overflow-hidden">
                        <div className="flex items-center gap-2 mb-4">
                            <Activity size={18} className="text-purple-400" />
                            <div>
                                <h4 className="text-sm font-black text-white uppercase tracking-tight">Cortes Históricos</h4>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Sorteio Inteligente no Monte Carlo</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 mb-4">
                            <input
                                type="number"
                                placeholder="Nota de Corte (Ex: 82)"
                                value={newCutoff}
                                onChange={(e) => setNewCutoff(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        const val = parseFloat(newCutoff);
                                        if (!isNaN(val) && val >= 0 && val <= maxScore) {
                                            setHistoricalCutoffs([...historicalCutoffs, val]);
                                            setNewCutoff('');
                                        }
                                    }
                                }}
                                className="bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white font-bold w-full outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all placeholder:text-slate-600"
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    const val = parseFloat(newCutoff);
                                    if (!isNaN(val) && val >= 0 && val <= maxScore) {
                                        setHistoricalCutoffs([...historicalCutoffs, val]);
                                        setNewCutoff('');
                                    }
                                }}
                                className="bg-purple-600 hover:bg-purple-500 text-white rounded-xl px-4 py-2.5 transition-all shadow-lg shadow-purple-500/20 shrink-0 font-black flex items-center justify-center active:scale-95"
                            >
                                <Plus size={20} />
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {historicalCutoffs.length === 0 ? (
                                <p className="text-xs font-bold text-slate-500 italic w-full text-center py-2 bg-slate-900/50 rounded-lg">
                                    Adicione notas de corte anteriores para simular incerteza real na prova.
                                </p>
                            ) : (
                                historicalCutoffs.map((cutoff, idx) => (
                                    <div key={idx} className="bg-slate-800/80 border border-white/5 rounded-lg px-3 py-1.5 flex items-center gap-2 group/tag">
                                        <span className="text-sm font-black text-slate-200">{cutoff}%</span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const newArr = [...historicalCutoffs];
                                                newArr.splice(idx, 1);
                                                setHistoricalCutoffs(newArr);
                                            }}
                                            className="text-slate-500 hover:text-red-400 opacity-50 group-hover/tag:opacity-100 transition-all"
                                        >
                                            <Minus size={14} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-4 leading-relaxed font-medium bg-black/20 p-3 rounded-xl border border-white/[0.02]">
                            Se você inserir notas aqui, o motor Monte Carlo irá <b>sortear a nota de corte alvo</b> a cada simulação a partir de uma Distribuição Normal baseada nestes valores, ignorando o Target fixo do slider. Isso gera previsões hiper-realistas para bancas voláteis.
                        </p>
                    </div>

                    <div className="bg-slate-800/50 p-1 rounded-xl flex flex-col sm:flex-row mb-6 border border-white/5 gap-1 sm:gap-0">
                        <button
                            type="button"
                            onClick={() => {
                                if (!equalWeightsMode) {
                                    savedCustomWeights.current = weights;
                                    const ew = getEqualWeights();
                                    setWeights(ew);
                                }
                                setEqualWeightsMode(true);
                            }}
                            className={`flex-1 py-3 rounded-lg text-[10px] sm:text-xs font-bold transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-300/60 ${equalWeightsMode ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            <div className={`w-2 h-2 rounded-full ${equalWeightsMode ? 'bg-white' : 'bg-slate-600'}`} />
                            Pesos Iguais
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                if (equalWeightsMode && savedCustomWeights.current) {
                                    setWeights(savedCustomWeights.current);
                                }
                                setEqualWeightsMode(false);
                            }}
                            className={`flex-1 py-3 rounded-lg text-[10px] sm:text-xs font-bold transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-purple-300/60 ${!equalWeightsMode ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            <div className={`w-2 h-2 rounded-full ${!equalWeightsMode ? 'bg-white' : 'bg-slate-600'}`} />
                            Manual (1, 2, 3...)
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                        {equalWeightsMode ? (
                            <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                                <Minus size={40} className="text-slate-600 mb-2" />
                                <p className="text-sm text-slate-500 px-10">No modo automático, todas as matérias possuem o mesmo peso de relevância.</p>
                            </div>
                        ) : (
                            Array.isArray(categories) && categories.length > 0 ? (
                                categories.map(cat => (
                                    <WeightRow
                                        key={cat.id || cat.name}
                                        cat={cat}
                                        weight={weights ? (weights[cat.id || cat.name] !== undefined ? (parseInt(weights[cat.id || cat.name], 10) || 0) : 1) : 1}
                                        manualTotal={manualTotal}
                                        updateWeight={updateWeight}
                                    />
                                ))
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center opacity-50 space-y-2 py-10">
                                    <Activity size={40} className="text-slate-600 mb-2" />
                                    <p className="text-sm text-slate-500 px-10">Nenhuma matéria encontrada no concurso atual.</p>
                                    <p className="text-[10px] text-slate-600">Adicione matérias na Planilha ou menu Categorias para configurar os pesos.</p>
                                </div>
                            )
                        )}
                    </div>

                    {!equalWeightsMode && (
                        <p className="text-[10px] text-slate-400 mt-3">No modo manual, você define pesos relativos (1, 2, 3...). O sistema converte automaticamente para percentual.</p>
                    )}
                </div>
            </div>
        </div>
    );
};
