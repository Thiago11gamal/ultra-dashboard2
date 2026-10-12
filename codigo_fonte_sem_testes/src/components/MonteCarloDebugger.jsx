import React, { useState, useRef, useEffect } from 'react';
import { FlaskConical as BeakerIcon, ChevronDown as ChevronDownIcon, ChevronUp as ChevronUpIcon } from 'lucide-react';

export default function MonteCarloDebugger({ stats }) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    // Auto-close when clicking outside the widget or pressing Escape
    useEffect(() => {
        function handleClickOutside(event) {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        function handleKeyDown(event) {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("touchstart", handleClickOutside, { passive: true });
        window.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("touchstart", handleClickOutside);
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, []);

    if (!stats) return null;

    const {
        statsData,
        probability,
        calibrationPenalty,
    } = stats;

    const rawProbability = stats.rawProbability ?? stats.simulationData?.data?.probability ?? stats.effectiveSimulationData?.data?.probability ?? 0;
    const isOverconfident = (calibrationPenalty || 0) > 0.05;

    return (
        <div ref={containerRef} className="relative font-mono text-[11px] select-none shrink-0">
            {/* QuickStat native layout, fully interactive */}
            <button 
                type="button"
                aria-expanded={isOpen}
                aria-haspopup="dialog"
                aria-label="Ver auditoria Monte Carlo"
                onClick={() => setIsOpen(!isOpen)}
                className="flex flex-col min-w-[78px] sm:min-w-[80px] px-1 text-left hover:opacity-85 transition-all active:scale-95 group focus:outline-none"
            >
                <div className="flex items-center gap-1.5 mb-0.5 opacity-70">
                    <span className="text-emerald-400 group-hover:animate-pulse">
                        <BeakerIcon size={14} />
                    </span>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap">MC AUDIT</span>
                </div>
                <div className="flex items-center gap-1">
                    <span className="text-base font-black text-emerald-400 tracking-tighter tabular-nums">
                        {Number.isFinite(Number(probability)) ? Number(probability).toFixed(0) : '0'}%
                    </span>
                    {isOpen ? (
                        <ChevronUpIcon size={12} className="text-slate-400" />
                    ) : (
                        <ChevronDownIcon size={12} className="text-slate-500 group-hover:text-emerald-400 transition-colors" />
                    )}
                </div>
            </button>
            
            {isOpen && (
                <div 
                    role="dialog"
                    aria-label="Auditoria Monte Carlo"
                    className="absolute top-full right-0 mt-3 bg-[#0a0d18] text-slate-200 p-4 rounded-2xl border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.9)] w-72 max-w-[calc(100vw-2rem)] space-y-2 z-[9999] animate-fade-in ring-1 ring-indigo-500/30"
                >
                    <div className="grid grid-cols-2 gap-x-2 gap-y-2 items-center text-[10px]">
                        <span className="text-slate-400 font-medium">Probabilidade Bruta</span>
                        <span className="text-right font-bold text-emerald-400 tabular-nums">
                            {Number.isFinite(Number(rawProbability)) ? Number(rawProbability).toFixed(2) : '0.00'}%
                        </span>
                        
                        <span className="text-slate-400 font-medium">Probabilidade Calibrada</span>
                        <span className="text-right font-bold text-amber-400 tabular-nums">
                            {Number.isFinite(Number(probability)) ? Number(probability).toFixed(2) : '0.00'}%
                        </span>
                        
                        <span className="col-span-2 border-t border-white/10 my-1"></span>

                        <span className="text-slate-400 font-medium">Penalidade Calibração</span>
                        <span className="text-right font-bold text-rose-400 tabular-nums">
                            {Number.isFinite(Number(calibrationPenalty)) ? (Number(calibrationPenalty) * 100).toFixed(1) : '0.0'}%
                        </span>
                        
                        <span className="col-span-2 border-t border-white/10 my-1"></span>

                        <span className="text-slate-400 font-medium">Desvio Padrão Atual</span>
                        <span className="text-right font-bold text-slate-200 tabular-nums">
                            {Number.isFinite(Number(statsData?.rawPooledSD)) ? Number(statsData.rawPooledSD).toFixed(2) : '0.00'}
                        </span>
                        
                        <span className="text-slate-400 font-medium">Desvio Padrão Inflado</span>
                        <span className="text-right font-bold text-amber-400 tabular-nums">
                            {Number.isFinite(Number(statsData?.pooledSD)) ? Number(statsData.pooledSD).toFixed(2) : '0.00'}
                        </span>
                        
                        <span className="col-span-2 border-t border-white/10 my-1"></span>

                        <span className="text-slate-300 font-bold">Estado Confiabilidade</span>
                        <span className={`text-right font-bold ${isOverconfident ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {isOverconfident ? 'Superconfiante' : 'Estável'}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}

