import React, { useEffect } from 'react';
import { Minus, Plus, Layers } from 'lucide-react';
import { MAX_TARGET_CYCLES } from '../../utils/pomodoroHelpers';

export const PomodoroProgress = React.memo(function PomodoroProgress({
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
    totalTime = 25 * 60,
    longBreakAfter = 4
}) {
    const safeTargetCycles = Math.min(MAX_TARGET_CYCLES, Math.max(1, Math.round(Number(targetCycles) || 1)));
    const safeCompletedCycles = Math.min(safeTargetCycles, Math.max(0, Math.round(Number(completedCycles) || 0)));
    const safeLongBreakAfter = Math.min(10, Math.max(1, Math.round(Number(longBreakAfter) || 4)));

    const persistTargetCycles = (newTarget) => {
        try {
            const raw = localStorage.getItem('pomodoroState');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === 'object') {
                    parsed.targetCycles = newTarget;
                    localStorage.setItem('pomodoroState', JSON.stringify(parsed));
                }
            }
        } catch { /* ignore */ }
    };

    useEffect(() => {
        if (workFillsRef?.current && Array.isArray(workFillsRef.current)) {
            workFillsRef.current.length = safeTargetCycles;
        }
        if (breakBallsRef?.current && Array.isArray(breakBallsRef.current)) {
            breakBallsRef.current.length = Math.max(0, safeTargetCycles - 1);
        }
    }, [safeTargetCycles, workFillsRef, breakBallsRef]);

    return (
        <div className="w-full rounded-2xl border-2 border-[#94785a] bg-[#b08e6b] px-3.5 sm:px-4 py-2 sm:py-2.5 shadow-xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-black/5 pointer-events-none" />

            <div className="relative z-10 flex flex-col gap-1.5">
                {/* Header: Title & Cycle Stepper */}
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5">
                        <Layers size={14} className="text-[#2d1a12]/80" />
                        <h3 className="text-xs sm:text-[13px] font-black text-[#2d1a12]/90 uppercase tracking-[0.2em]">
                            Progresso dos Ciclos
                        </h3>
                    </div>

                    <div className="flex items-center gap-1.5 text-[#2d1a12]">
                        <button
                            type="button"
                            onClick={() => {
                                const minAllowed = Math.min(MAX_TARGET_CYCLES, safeCompletedCycles + 1);
                                const newTarget = Math.max(minAllowed, safeTargetCycles - 1);
                                if (typeof setTargetCycles === 'function') {
                                    setTargetCycles(newTarget);
                                }
                                persistTargetCycles(newTarget);
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
                            disabled={safeTargetCycles <= Math.min(MAX_TARGET_CYCLES, safeCompletedCycles + 1)}
                            className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[#2d1a12]/10 hover:bg-[#2d1a12]/20 active:scale-95 flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed border border-[#2d1a12]/20 shadow-inner"
                            title="Reduzir meta de ciclos"
                            aria-label={`Reduzir meta de ciclos para ${safeTargetCycles - 1}`}
                        >
                            <Minus size={13} className="stroke-[3]" />
                        </button>

                        <div 
                            className="flex items-baseline gap-1 px-2 py-0.5 rounded-lg bg-[#2d1a12]/10 border border-[#2d1a12]/15 text-xs sm:text-sm font-black tabular-nums shadow-inner"
                            role="status"
                            aria-live="polite"
                            aria-label={`Ciclos: ${safeCompletedCycles} de ${safeTargetCycles}`}
                        >
                            <span className="text-[#2d1a12] font-black">{safeCompletedCycles}</span>
                            <span className="text-[#2d1a12]/40 text-[10px] font-bold">/</span>
                            <span className="text-[#2d1a12]/80 text-[10px] font-bold">{safeTargetCycles}</span>
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                const newTarget = Math.min(MAX_TARGET_CYCLES, safeTargetCycles + 1);
                                if (typeof setTargetCycles === 'function') {
                                    setTargetCycles(newTarget);
                                }
                                persistTargetCycles(newTarget);
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
                            className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[#2d1a12]/10 hover:bg-[#2d1a12]/20 active:scale-95 flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed border border-[#2d1a12]/20 shadow-inner"
                            title="Aumentar meta de ciclos"
                            aria-label={`Aumentar meta de ciclos para ${safeTargetCycles + 1}`}
                        >
                            <Plus size={13} className="stroke-[3]" />
                        </button>
                    </div>
                </div>

                {/* Progress Indicators Track - Barras e Bolinhas Maiores (com escala dinâmica para metas longas) */}
                <div className="flex items-center gap-1 sm:gap-1.5 pt-0.5 overflow-x-auto custom-scrollbar pb-0.5">
                    {Array.from({ length: safeTargetCycles }).map((_, i) => {
                        let workRatio = 0;
                        let breakRatio = 0;
                        const isCompact = safeTargetCycles > 6;

                        const progressRatio = (Number.isFinite(totalTime) && totalTime > 0)
                            ? Math.max(0, Math.min(1, (totalTime - timeLeft) / totalTime))
                            : 0;

                        if (mode === 'work') {
                            if (i < safeCompletedCycles) {
                                workRatio = 1;
                                breakRatio = 1;
                            } else if (i === safeCompletedCycles) {
                                workRatio = progressRatio;
                                breakRatio = 0;
                            }
                        } else {
                            if (i < safeCompletedCycles - 1) {
                                workRatio = 1;
                                breakRatio = 1;
                            } else if (i === safeCompletedCycles - 1) {
                                workRatio = 1;
                                breakRatio = progressRatio;
                            }
                        }

                        return (
                            <React.Fragment key={i}>
                                {/* Barra de Progresso do Foco (transform scaleX para evitar reflow a 60fps) */}
                                <div className={`flex-1 min-w-[12px] ${isCompact ? 'h-3 sm:h-3.5' : 'h-3.5 sm:h-4'} bg-[#2d1a12]/20 rounded-full overflow-hidden border-2 border-[#2d1a12]/25 shadow-inner`}>
                                    <div
                                        ref={el => {
                                            if (workFillsRef?.current && Array.isArray(workFillsRef.current)) {
                                                workFillsRef.current[i] = el || undefined;
                                            }
                                        }}
                                        style={{ transform: `scaleX(${workRatio})`, transformOrigin: 'left center' }}
                                        className="w-full h-full bg-gradient-to-r from-blue-600 to-blue-500 rounded-full shadow-sm"
                                    />
                                </div>

                                {/* Bolinha de Pausa (Verde = curta, Violeta = pausa longa) */}
                                {i < safeTargetCycles - 1 && (() => {
                                    const isLongBreakBall = (i + 1) % safeLongBreakAfter === 0;
                                    return (
                                        <div
                                            title={isLongBreakBall ? `Pausa Longa (após ciclo ${i + 1})` : `Pausa Curta (após ciclo ${i + 1})`}
                                            className={`relative ${isCompact ? 'w-4 h-4 sm:w-4.5 sm:h-4.5' : 'w-5 h-5 sm:w-6 sm:h-6'} rounded-full bg-[#2d1a12]/20 border-2 ${isLongBreakBall ? 'border-violet-900/50' : 'border-[#2d1a12]/35'} overflow-hidden shrink-0 shadow-md`}
                                        >
                                            <div
                                                ref={el => {
                                                    if (breakBallsRef?.current && Array.isArray(breakBallsRef.current)) {
                                                        breakBallsRef.current[i] = el || undefined;
                                                    }
                                                }}
                                                style={{ transform: `scaleY(${breakRatio})`, transformOrigin: 'bottom center' }}
                                                className={`absolute inset-0 w-full h-full ${
                                                    isLongBreakBall
                                                        ? 'bg-gradient-to-t from-violet-600 to-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.6)]'
                                                        : 'bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-[0_0_10px_rgba(34,197,94,0.6)]'
                                                }`}
                                            />
                                        </div>
                                    );
                                })()}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>
        </div>
    );
});

export default PomodoroProgress;
