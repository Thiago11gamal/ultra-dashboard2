import React, { useState, useRef, useEffect } from 'react';
import { FlaskConical as BeakerIcon, ChevronDown as ChevronDownIcon, ChevronUp as ChevronUpIcon } from 'lucide-react';

export default function MonteCarloDebugger({ stats }) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    // Auto-close when clicking outside the widget
    useEffect(() => {
        function handleClickOutside(event) {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (!stats) return null;

    const {
        statsData,
        probability,
        calibrationPenalty,
    } = stats;

    const rawProbability = stats.simulationData?.data?.probability ?? 0;
    const isOverconfident = (calibrationPenalty || 0) > 0.05;

    return (
        <div ref={containerRef} className="relative font-mono text-[11px] select-none shrink-0">
            {/* QuickStat native layout, fully interactive */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="flex flex-col min-w-[78px] sm:min-w-[80px] text-left hover:opacity-85 transition-all active:scale-95 group focus:outline-none"
            >
                <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-emerald-400 opacity-80 group-hover:animate-pulse">
                        <BeakerIcon size={14} />
                    </span>
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">MC AUDIT</span>
                </div>
                <div className="flex items-center gap-1">
                    <span className="text-sm font-black text-emerald-400 tracking-tighter">
                        {Number(probability).toFixed(0)}%
                    </span>
                    {isOpen ? (
                        <ChevronUpIcon size={12} className="text-slate-500" />
                    ) : (
                        <ChevronDownIcon size={12} className="text-slate-500 group-hover:text-emerald-400 transition-colors" />
                    )}
                </div>
            </button>
            
            {isOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 bg-slate-950/95 backdrop-blur-md text-slate-300 p-4 rounded-2xl border border-white/10 shadow-2xl w-64 space-y-2 z-[9999] animate-fade-in">
                    <div className="grid grid-cols-2 gap-x-2 gap-y-2 items-center text-[10px]">
                        <span className="text-slate-500">Probabilidade Bruta</span>
                        <span className="text-right font-medium text-emerald-400">{Number(rawProbability).toFixed(2)}%</span>
                        
                        <span className="text-slate-500">Probabilidade Calibrada</span>
                        <span className="text-right font-medium text-amber-400">{Number(probability).toFixed(2)}%</span>
                        
                        <span className="col-span-2 border-t border-white/5 my-1"></span>

                        <span className="text-slate-500">Penalidade Calibração</span>
                        <span className="text-right font-medium text-rose-400">{((calibrationPenalty || 0) * 100).toFixed(1)}%</span>
                        
                        <span className="col-span-2 border-t border-white/5 my-1"></span>

                        <span className="text-slate-500">Desvio Padrão Atual</span>
                        <span className="text-right font-medium">{Number(statsData?.rawPooledSD || 0).toFixed(2)}</span>
                        
                        <span className="text-slate-500">Desvio Padrão Inflado</span>
                        <span className="text-right font-medium text-amber-400">{Number(statsData?.pooledSD || 0).toFixed(2)}</span>
                        
                        <span className="col-span-2 border-t border-white/5 my-1"></span>

                        <span className="text-slate-500 font-bold">Estado Confiabilidade</span>
                        <span className={`text-right font-bold ${isOverconfident ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {isOverconfident ? 'Superconfiante' : 'Estável'}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
