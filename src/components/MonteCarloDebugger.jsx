import React, { useState } from 'react';
import { BeakerIcon, ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/solid';

export default function MonteCarloDebugger({ stats }) {
    const [isOpen, setIsOpen] = useState(false);

    if (!stats) return null;

    const {
        statsData,
        probability,
        calibrationPenalty,
    } = stats;

    const rawProbability = stats.simulationData?.data?.probability ?? 0;
    const isOverconfident = (calibrationPenalty || 0) > 0.05;

    return (
        <div className="fixed bottom-4 left-4 z-50 font-mono text-[11px]">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="bg-slate-900 text-emerald-400 px-3 py-2 rounded-t-lg border border-slate-700 shadow-xl flex items-center gap-2 hover:bg-slate-800 transition-colors w-full justify-between"
            >
                <div className="flex items-center gap-2 font-bold tracking-wide">
                    <BeakerIcon className="w-4 h-4" />
                    <span>MC AUDIT</span>
                </div>
                {isOpen ? <ChevronDownIcon className="w-4 h-4 text-slate-400"/> : <ChevronUpIcon className="w-4 h-4 text-slate-400"/>}
            </button>
            
            {isOpen && (
                <div className="bg-slate-950 text-slate-300 p-4 rounded-b-lg rounded-tr-lg border border-slate-700 shadow-2xl w-64 space-y-2">
                    <div className="grid grid-cols-2 gap-x-2 gap-y-2 items-center">
                        <span className="text-slate-500">Raw Probability</span>
                        <span className="text-right font-medium text-emerald-400">{Number(rawProbability).toFixed(2)}%</span>
                        
                        <span className="text-slate-500">Calibrated Prob</span>
                        <span className="text-right font-medium text-amber-400">{Number(probability).toFixed(2)}%</span>
                        
                        <span className="col-span-2 border-t border-slate-800 my-1"></span>

                        <span className="text-slate-500">Calib. Penalty</span>
                        <span className="text-right font-medium text-rose-400">{((calibrationPenalty || 0) * 100).toFixed(1)}%</span>
                        
                        <span className="col-span-2 border-t border-slate-800 my-1"></span>

                        <span className="text-slate-500">Current SD</span>
                        <span className="text-right font-medium">{Number(statsData?.rawPooledSD || 0).toFixed(2)}</span>
                        
                        <span className="text-slate-500">Inflated SD</span>
                        <span className="text-right font-medium text-amber-400">{Number(statsData?.pooledSD || 0).toFixed(2)}</span>
                        
                        <span className="col-span-2 border-t border-slate-800 my-1"></span>

                        <span className="text-slate-500">Reliability State</span>
                        <span className={`text-right font-bold ${isOverconfident ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {isOverconfident ? 'Overconfident' : 'Stable'}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
