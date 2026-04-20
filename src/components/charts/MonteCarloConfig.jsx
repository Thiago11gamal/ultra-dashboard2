import React, { useRef } from 'react';
import { Settings2, Check, Minus, Plus, Activity } from 'lucide-react';

const WeightRow = React.memo(({ cat, weight, manualTotal, updateWeight }) => {
    const normalizedShare = manualTotal > 0 ? Math.round((weight / manualTotal) * 100) : 0;
    return (
        <div key={cat.id || cat.name} className={`bg-slate-800/40 backdrop-blur-md p-3 rounded-2xl border border-white/[0.03] flex items-center gap-4 hover:border-indigo-500/20 transition-all ${weight === 0 ? 'opacity-50 grayscale' : ''}`}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm shadow-inner" style={{ backgroundColor: `${cat.color || '#3b82f6'}15`, border: `1px solid ${cat.color || '#3b82f6'}20` }}>{cat.icon || '📚'}</div>
            <div className="flex-1">
                <p className="text-[11px] font-black text-slate-200 uppercase tracking-tight mb-1.5">{cat.name || 'Matéria'}</p>
                <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${normalizedShare}%`, backgroundColor: cat.color || '#3b82f6' }} />
                </div>
                <div className="flex items-center justify-between mt-1">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Share</p>
                    <p className="text-[9px] font-black text-slate-400">{normalizedShare}%</p>
                </div>
            </div>
            <div className="flex items-center gap-1 bg-slate-950/40 rounded-xl p-1 border border-white/5">
                {/* FIX: Adicionar o 0 \u00e0 lista de pesos permitidos */}
                {[0, 1, 2, 3].map(p => (
                    <button
                        key={p}
                        onClick={() => updateWeight(cat.id || cat.name, p)}
                        className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${weight === p ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
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
    setWeights, weights, updateWeight, categories, onWeightsChange, user
}) => {
    const savedCustomWeights = useRef(null);
    const [localTarget, setLocalTarget] = React.useState(Number(targetScore));

    // Sync local state when external targetScore changes (e.g. on load)
    React.useEffect(() => {
        const next = Number(targetScore);
        if (!isNaN(next) && Math.abs(localTarget - next) > 0.1) {
            setLocalTarget(next);
        }
    }, [targetScore, localTarget]);

    // 🔒 BUGFIX BUG-4: Não desmontar o componente para preservar o ref savedCustomWeights
    // if (!show) return null;

    // FIX: Permitir que o peso manual possa ser 0 sem assumir Math.max(1)
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
                <div className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-md flex items-center justify-between p-6 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                            <Settings2 size={20} className="text-blue-400" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-white">Configuração</h3>
                            <p className="text-[10px] text-slate-400">Monte Carlo & Pesos das Matérias</p>
                        </div>
                    </div>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onClose(false);
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-all shadow-lg shadow-emerald-500/20 group/close"
                        title="Salvar e Fechar"
                    >
                        <Check size={18} className="text-white group-hover/close:scale-110 transition-transform" />
                        <span className="text-[10px] font-black text-white uppercase tracking-wider">Salvar</span>
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
                                <span className="text-3xl font-black text-white tracking-tighter italic">{localTarget}<span className="text-blue-500">%</span></span>
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] font-black text-blue-500/60 uppercase tracking-widest block">Min. Viability</span>
                                <span className="text-xs font-bold text-slate-400">Competitive Goal</span>
                            </div>
                        </div>
                        <div className="relative h-6 flex items-center mb-4">
                            <input 
                                type="range" 
                                min="10" 
                                max="100" 
                                step="1" 
                                value={localTarget} 
                                onChange={(e) => {
                                    const val = parseInt(e.target.value, 10);
                                    setLocalTarget(val);
                                }}
                                onMouseUp={() => {
                                    if (setTargetScore) setTargetScore(localTarget);
                                }}
                                onTouchEnd={() => {
                                    if (setTargetScore) setTargetScore(localTarget);
                                }}
                                className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-blue-500 transition-all hover:accent-blue-400" 
                                style={{
                                    background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((localTarget - 10) / (100 - 10)) * 100}%, #1e293b ${((localTarget - 10) / (100 - 10)) * 100}%, #1e293b 100%)`
                                }}
                            />
                        </div>
                        <div className="flex justify-between px-1">
                            <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Baseline (60%)</span>
                            <span className="text-[8px] font-black text-blue-500/40 uppercase tracking-widest">Optimized (75%)</span>
                            <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Elite (90%)</span>
                        </div>
                    </div>

                    <div className="bg-slate-800/50 p-1 rounded-xl flex mb-6 border border-white/5">
                        <button
                            onClick={() => {
                                if (!equalWeightsMode) {
                                    savedCustomWeights.current = weights;
                                    const ew = getEqualWeights();
                                    setWeights(ew);
                                    if (onWeightsChange) onWeightsChange(ew);
                                }
                                setEqualWeightsMode(true);
                            }}
                            className={`flex-1 py-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${equalWeightsMode ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            <div className={`w-2 h-2 rounded-full ${equalWeightsMode ? 'bg-white' : 'bg-slate-600'}`} />
                            Pesos Iguais
                        </button>
                        <button
                            onClick={() => {
                                if (equalWeightsMode && savedCustomWeights.current) {
                                    setWeights(savedCustomWeights.current);
                                    if (onWeightsChange) onWeightsChange(savedCustomWeights.current);
                                }
                                setEqualWeightsMode(false);
                            }}
                            className={`flex-1 py-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${!equalWeightsMode ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            <div className={`w-2 h-2 rounded-full ${!equalWeightsMode ? 'bg-white' : 'bg-slate-600'}`} />
                            Manual (Peso 1, 2, 3...)
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
