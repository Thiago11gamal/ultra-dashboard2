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
    breakBallsRef,
    mode,
    timeLeft,
    totalTime
}) {
    return (
        <div className="w-full rounded-2xl sm:rounded-3xl border-2 border-[#94785a] bg-[#b08e6b] px-4 sm:px-5 py-3 sm:py-3.5 shadow-xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-black/5 pointer-events-none" />

            <div className="relative z-10 flex flex-col gap-2.5">
                {/* Header: Title & Cycle Stepper */}
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <Layers size={13} className="text-[#2d1a12]/70" />
                        <h3 className="text-[10px] sm:text-[11px] font-black text-[#2d1a12]/80 uppercase tracking-[0.25em]">
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
                            className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[#2d1a12]/10 hover:bg-[#2d1a12]/20 active:scale-95 flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed border border-[#2d1a12]/20 shadow-inner"
                            title="Reduzir meta de ciclos"
                        >
                            <Minus size={12} className="stroke-[2.5]" />
                        </button>

                        <div className="flex items-baseline gap-1 px-2 py-0.5 rounded-lg bg-[#2d1a12]/10 border border-[#2d1a12]/15 text-xs sm:text-sm font-black tabular-nums shadow-inner">
                            <span className="text-[#2d1a12]">{completedCycles}</span>
                            <span className="text-[#2d1a12]/40 text-[10px] font-bold">/</span>
                            <span className="text-[#2d1a12]/70 text-[10px] font-bold">{targetCycles}</span>
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
                            className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[#2d1a12]/10 hover:bg-[#2d1a12]/20 active:scale-95 flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed border border-[#2d1a12]/20 shadow-inner"
                            title="Aumentar meta de ciclos"
                        >
                            <Plus size={12} className="stroke-[2.5]" />
                        </button>
                    </div>
                </div>

                {/* Progress Indicators Track */}
                <div className="flex items-center gap-2 sm:gap-2.5 pt-0.5">
                    {Array.from({ length: targetCycles || 1 }).map((_, i) => (
                        <React.Fragment key={i}>
                            <div className="flex-1 h-2 bg-[#2d1a12]/15 rounded-full overflow-hidden border border-[#2d1a12]/15 shadow-inner">
                                <div
                                    ref={el => {
                                        workFillsRef.current[i] = el || undefined;
                                    }}
                                    className="h-full bg-blue-600 rounded-full shadow-sm"
                                />
                            </div>
                            {i < (targetCycles || 1) - 1 && (
                                <div className="relative w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-[#2d1a12]/15 border border-[#2d1a12]/30 overflow-hidden shrink-0 shadow-inner">
                                    <div
                                        ref={el => {
                                            breakBallsRef.current[i] = el || undefined;
                                        }}
                                        className="absolute bottom-0 w-full bg-emerald-500"
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
