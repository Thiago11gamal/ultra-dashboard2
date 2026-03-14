import React, { useRef } from 'react';
import { Settings2, Check, Minus, Plus, Activity } from 'lucide-react';

export const MonteCarloConfig = ({
    show, onClose, targetScore, setTargetScore,
    equalWeightsMode, setEqualWeightsMode, getEqualWeights,
    setWeights, weights, updateWeight, categories, onWeightsChange
}) => {
    const savedCustomWeights = useRef(null);
    if (!show) return null;

    const manualTotal = categories.reduce((acc, cat) => acc + Math.max(1, parseInt(weights?.[cat.name], 10) || 1), 0);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 lg:p-8 animate-in fade-in duration-300">
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
                        className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-500 active:scale-90 flex flex-col items-center justify-center transition-all shadow-xl shadow-emerald-500/20 group/close z-30 ml-4"
                        title="Salvar Alterações e Fechar"
                    >
                        <Check size={32} className="text-white group-hover/close:scale-110 transition-transform" />
                        <span className="text-[8px] font-black text-white/80 uppercase mt-0.5">Salvar</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pt-2">
                    <div className="bg-slate-800/50 p-6 rounded-2xl mb-8 border border-white/5 shadow-inner">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-xs font-bold text-white uppercase tracking-wider">Meta de Aprovação</span>
                            <span className="text-xl font-black text-blue-400">{targetScore}%</span>
                        </div>
                        <input type="range" min="60" max="90" step="1" value={targetScore} onChange={(e) => setTargetScore(parseInt(e.target.value, 10))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
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
                                categories.map(cat => {
                                    const weight = weights ? (parseInt(weights[cat.name], 10) || 1) : 1;
                                    const normalizedShare = manualTotal > 0 ? Math.round((weight / manualTotal) * 100) : 0;
                                    return (
                                        <div key={cat.id || cat.name} className="bg-white/5 p-3 rounded-xl border border-white/5 flex items-center gap-4">
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm" style={{ backgroundColor: `${cat.color || '#3b82f6'}20`, border: `1px solid ${cat.color || '#3b82f6'}30` }}>{cat.icon || '📚'}</div>
                                            <div className="flex-1">
                                                <p className="text-sm font-bold text-white mb-1.5">{cat.name || 'Matéria'}</p>
                                                <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                                    <div className="h-full rounded-full transition-all" style={{ width: `${normalizedShare}%`, backgroundColor: cat.color || '#3b82f6' }} />
                                                </div>
                                                <p className="text-[10px] text-slate-400 mt-1">Participação: {normalizedShare}%</p>
                                            </div>
                                            <div className="flex items-center gap-1 bg-slate-900/50 rounded-lg p-1 border border-white/5">
                                                {[1, 2, 3].map(p => (
                                                    <button
                                                        key={p}
                                                        onClick={() => updateWeight(cat.name, p)}
                                                        className={`w-8 h-8 rounded-md text-[10px] font-black transition-all ${weight === p ? 'bg-white text-slate-900' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                                                    >
                                                        P{p}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })
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
