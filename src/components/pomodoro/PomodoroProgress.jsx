import React, { useEffect } from 'react';
import { Minus, Plus, Layers } from 'lucide-react';
import { MAX_TARGET_CYCLES } from '../../utils/pomodoroHelpers';

export function PomodoroProgress({
    targetCycles,
    completedCycles,
    setTargetCycles,
    syncChannel,
    STABLE_TAB_ID,
    activeSubject,
    workFillsRef,
    breakBallsRef,
    mode = 'work',
    timeLeft = 0,
    totalTime = 25 * 60
}) {
    const safeTargetCycles = Math.min(MAX_TARGET_CYCLES, Math.max(1, Math.round(Number(targetCycles) || 1)));
    const safeCompletedCycles = Math.min(safeTargetCycles, Math.max(0, Math.round(Number(completedCycles) || 0)));

    useEffect(() => {
        if (workFillsRef?.current && Array.isArray(workFillsRef.current)) {
            workFillsRef.current.length = safeTargetCycles;
        }
        if (breakBallsRef?.current && Array.isArray(breakBallsRef.current)) {
            breakBallsRef.current.length = Math.max(0, safeTargetCycles - 1);
        }
    }, [safeTargetCycles, workFillsRef, breakBallsRef]);

    return (
        <div className="w-full rounded-2xl border border-white/10 bg-gradient-to-r from-slate-900/90 via-[#0d111e]/95 to-slate-900/90 px-3.5 sm:px-4 py-2 sm:py-2.5 shadow-xl relative overflow-hidden group backdrop-blur-xl">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-transparent to-cyan-500/5 pointer-events-none" />

            <div className="relative z-10 flex flex-col gap-1.5">
                {/* Header: Title & Cycle Stepper */}
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5">
                        <Layers size={14} className="text-indigo-400" />
                        <h3 className="text-xs sm:text-[13px] font-black text-slate-200 uppercase tracking-[0.2em]">
                            Progresso dos Ciclos
                        </h3>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-200">
                        <button
                            type="button"
                            onClick={() => {
                                const minAllowed = mode === 'work' ? safeCompletedCycles + 1 : Math.max(1, safeCompletedCycles);
                                const newTarget = Math.max(minAllowed, safeTargetCycles - 1);
                                if (typeof setTargetCycles === 'function') {
                                    setTargetCycles(newTarget);
                                }
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
                            disabled={safeTargetCycles <= (mode === 'work' ? safeCompletedCycles + 1 : Math.max(1, safeCompletedCycles))}
                            className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-white/5 hover:bg-white/10 active:scale-95 flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed border border-white/10 text-slate-300 hover:text-white shadow-inner"
                            title="Reduzir meta de ciclos"
                            aria-label={`Reduzir meta de ciclos para ${safeTargetCycles - 1}`}
                        >
                            <Minus size={13} className="stroke-[3]" />
                        </button>

                        <div 
                            className="flex items-baseline gap-1 px-2.5 py-0.5 rounded-lg bg-white/5 border border-white/10 text-xs sm:text-sm font-black tabular-nums shadow-inner text-white"
                            role="status"
                            aria-live="polite"
                            aria-label={`Ciclos: ${safeCompletedCycles} de ${safeTargetCycles}`}
                        >
                            <span className="text-cyan-300 font-black">{safeCompletedCycles}</span>
                            <span className="text-slate-500 text-[10px] font-bold">/</span>
                            <span className="text-slate-300 text-[10px] font-bold">{safeTargetCycles}</span>
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                const newTarget = Math.min(MAX_TARGET_CYCLES, safeTargetCycles + 1);
                                if (typeof setTargetCycles === 'function') {
                                    setTargetCycles(newTarget);
                                }
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
                            disabled={safeTargetCycles >= MAX_TARGET_CYCLES}
                            className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-white/5 hover:bg-white/10 active:scale-95 flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed border border-white/10 text-slate-300 hover:text-white shadow-inner"
                            title="Aumentar meta de ciclos"
                            aria-label={`Aumentar meta de ciclos para ${safeTargetCycles + 1}`}
                        >
                            <Plus size={13} className="stroke-[3]" />
                        </button>
                    </div>
                </div>

                {/* Progress Indicators Track */}
                <div className="flex items-center gap-1.5 sm:gap-2 pt-0.5">
                    {Array.from({ length: safeTargetCycles }).map((_, i) => {
                        let workWidth = '0%';
                        let breakHeight = '0%';

                        const progressPct = (Number.isFinite(totalTime) && totalTime > 0)
                            ? Math.max(0, Math.min(100, ((totalTime - timeLeft) / totalTime) * 100))
                            : 0;

                        if (mode === 'work') {
                            if (i < safeCompletedCycles) {
                                workWidth = '100%';
                                breakHeight = '100%';
                            } else if (i === safeCompletedCycles) {
                                workWidth = `${progressPct}%`;
                                breakHeight = '0%';
                            } else {
                                workWidth = '0%';
                                breakHeight = '0%';
                            }
                        } else {
                            if (i < safeCompletedCycles - 1) {
                                workWidth = '100%';
                                breakHeight = '100%';
                            } else if (i === safeCompletedCycles - 1) {
                                workWidth = '100%';
                                breakHeight = `${progressPct}%`;
                            } else {
                                workWidth = '0%';
                                breakHeight = '0%';
                            }
                        }

                        return (
                            <React.Fragment key={i}>
                                {/* Barra de Progresso do Foco */}
                                <div className="flex-1 h-3.5 sm:h-4 bg-slate-800/80 rounded-full overflow-hidden border border-white/10 shadow-inner">
                                    <div
                                        ref={el => {
                                            if (workFillsRef?.current && Array.isArray(workFillsRef.current)) {
                                                workFillsRef.current[i] = el || undefined;
                                            }
                                        }}
                                        style={{ width: workWidth }}
                                        className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400 rounded-full shadow-[0_0_12px_rgba(59,130,246,0.4)]"
                                    />
                                </div>

                                {/* Bolinha Verde de Pausa */}
                                {i < safeTargetCycles - 1 && (
                                    <div className="relative w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-slate-800/80 border border-white/10 overflow-hidden shrink-0 shadow-md">
                                        <div
                                            ref={el => {
                                                if (breakBallsRef?.current && Array.isArray(breakBallsRef.current)) {
                                                    breakBallsRef.current[i] = el || undefined;
                                                }
                                            }}
                                            style={{ height: breakHeight }}
                                            className="absolute bottom-0 w-full bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-[0_0_10px_rgba(34,197,94,0.6)]"
                                        />
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export default PomodoroProgress;
