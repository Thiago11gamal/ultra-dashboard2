import React from 'react';
import { Minus, Plus, Layers } from 'lucide-react';

export function PomodoroProgress({
    targetCycles,
    completedCycles,
    setTargetCycles,
    syncChannel,
    STABLE_TAB_ID,
    activeSubject,
    workFillsRef,
    breakBallsRef
}) {
    return (
        <div className="w-full rounded-2xl border-2 border-[#94785a] bg-[#b08e6b] px-4 sm:px-5 py-2.5 sm:py-3 shadow-xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-black/5 pointer-events-none" />

            <div className="relative z-10 flex flex-col gap-2">
                {/* Header: Title & Cycle Stepper */}
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <Layers size={15} className="text-[#2d1a12]/80" />
                        <h3 className="text-xs sm:text-sm font-black text-[#2d1a12]/90 uppercase tracking-[0.25em]">
                            Progresso dos Ciclos
                        </h3>
                    </div>

                    <div className="flex items-center gap-2 text-[#2d1a12]">
                        <button
                            type="button"
                            onClick={() => {
                                const safeCompleted = Math.max(0, Math.min(targetCycles, completedCycles));
                                const minAllowed = Math.max(1, safeCompleted);
                                const newTarget = Math.max(minAllowed, targetCycles - 1);
                                setTargetCycles(newTarget);
                                try {
                                    if (syncChannel && typeof syncChannel.postMessage === 'function') {
                                        syncChannel.postMessage({
                                            type: 'TARGET_CYCLES_CHANGE',
                                            targetCycles: newTarget,
                                            tabId: STABLE_TAB_ID,
                                            taskId: activeSubject?.taskId || null,
                                            sessionInstanceId: activeSubject?.sessionInstanceId || null
                                        });
                                    }
                                } catch (err) {
                                    console.warn('[PomodoroProgress] Falha ao sincronizar:', err);
                                }
                            }}
                            disabled={!activeSubject || !Number.isFinite(targetCycles) || !Number.isFinite(completedCycles) || targetCycles <= Math.max(1, Number(completedCycles) || 0)}
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#2d1a12]/10 hover:bg-[#2d1a12]/20 active:scale-95 flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed border border-[#2d1a12]/20 shadow-inner"
                            title="Reduzir meta de ciclos"
                        >
                            <Minus size={14} className="stroke-[3]" />
                        </button>

                        <div className="flex items-baseline gap-1 px-2.5 py-0.5 rounded-xl bg-[#2d1a12]/10 border border-[#2d1a12]/15 text-sm sm:text-base font-black tabular-nums shadow-inner">
                            <span className="text-[#2d1a12] font-black">{completedCycles}</span>
                            <span className="text-[#2d1a12]/40 text-xs font-bold">/</span>
                            <span className="text-[#2d1a12]/80 text-xs font-bold">{targetCycles}</span>
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                const newTarget = Math.min(20, targetCycles + 1);
                                setTargetCycles(newTarget);
                                try {
                                    if (syncChannel && typeof syncChannel.postMessage === 'function') {
                                        syncChannel.postMessage({
                                            type: 'TARGET_CYCLES_CHANGE',
                                            targetCycles: newTarget,
                                            tabId: STABLE_TAB_ID,
                                            taskId: activeSubject?.taskId || null,
                                            sessionInstanceId: activeSubject?.sessionInstanceId || null
                                        });
                                    }
                                } catch (err) {
                                    console.warn('[PomodoroProgress] Falha ao sincronizar:', err);
                                }
                            }}
                            disabled={!activeSubject || targetCycles >= 20}
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#2d1a12]/10 hover:bg-[#2d1a12]/20 active:scale-95 flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed border border-[#2d1a12]/20 shadow-inner"
                            title="Aumentar meta de ciclos"
                        >
                            <Plus size={14} className="stroke-[3]" />
                        </button>
                    </div>
                </div>

                {/* Progress Indicators Track - Barras e Bolinhas Maiores */}
                <div className="flex items-center gap-2 sm:gap-2.5 pt-0.5">
                    {Array.from({ length: targetCycles || 1 }).map((_, i) => (
                        <React.Fragment key={i}>
                            {/* Barra de Progresso do Foco (Maior e com mais destaque) */}
                            <div className="flex-1 h-3.5 sm:h-4 bg-[#2d1a12]/20 rounded-full overflow-hidden border-2 border-[#2d1a12]/25 shadow-inner">
                                <div
                                    ref={el => {
                                        workFillsRef.current[i] = el || undefined;
                                    }}
                                    className="h-full bg-gradient-to-r from-blue-600 to-blue-500 rounded-full shadow-sm"
                                />
                            </div>

                            {/* Bolinha Verde de Pausa (Maior e com Glow) */}
                            {i < (targetCycles || 1) - 1 && (
                                <div className="relative w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#2d1a12]/20 border-2 border-[#2d1a12]/35 overflow-hidden shrink-0 shadow-md">
                                    <div
                                        ref={el => {
                                            breakBallsRef.current[i] = el || undefined;
                                        }}
                                        className="absolute bottom-0 w-full bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-[0_0_10px_rgba(34,197,94,0.6)]"
                                    />
                                </div>
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default PomodoroProgress;
