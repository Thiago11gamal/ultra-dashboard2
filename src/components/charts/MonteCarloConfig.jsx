import React from 'react';
import { Settings2, Check, Minus, Plus } from 'lucide-react';

export const MonteCarloConfig = ({
    show, onClose, targetScore, setTargetScore,
    equalWeightsMode, setEqualWeightsMode, getEqualWeights,
    setWeights, weights, updateWeight, activeCategories, categories, onWeightsChange
}) => {
    if (!show) return null;

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
                <button
                    onClick={() => {
                        if (!equalWeightsMode) {
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
};
