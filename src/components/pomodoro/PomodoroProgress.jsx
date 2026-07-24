import React from 'react';

export function PomodoroProgress({
    targetCycles,
    completedCycles,
    sessions,
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
        <div className="w-full px-10 py-8 rounded-3xl bg-[#b08e6b] border-2 border-[#94785a] shadow-xl">
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-[9px] font-bold text-[#2d1a12]/70 uppercase tracking-[0.2em]">Progresso dos Ciclos</h3>
                    <div className="flex items-center gap-2 text-[#2d1a12]">
                        <button onClick={() => {
                            const newTarget = Math.max(completedCycles < 1 ? 1 : completedCycles, targetCycles - 1);
                            setTargetCycles(newTarget);
                            try { syncChannel?.postMessage({ type: 'TARGET_CYCLES_CHANGE', targetCycles: newTarget, tabId: STABLE_TAB_ID }); } catch { /* ignore */ }
                        }} disabled={!activeSubject || targetCycles <= 1} className="w-5 h-5 rounded bg-[#2d1a12]/10 text-xs font-bold hover:bg-[#2d1a12]/20 disabled:opacity-40">-</button>
                        <div className="flex items-baseline gap-0.5 text-sm font-black tabular-nums">
                            <span>{completedCycles}</span>
                            <span className="text-[#2d1a12]/50">/ {targetCycles}</span>
                        </div>
                        <button onClick={() => {
                            const newTarget = Math.min(20, targetCycles + 1);
                            setTargetCycles(newTarget);
                            try { syncChannel?.postMessage({ type: 'TARGET_CYCLES_CHANGE', targetCycles: newTarget, tabId: STABLE_TAB_ID }); } catch { /* ignore */ }
                        }} disabled={!activeSubject || targetCycles >= 20} className="w-5 h-5 rounded bg-[#2d1a12]/10 text-xs font-bold hover:bg-[#2d1a12]/20 disabled:opacity-40">+</button>
                    </div>
                </div>

                <div className="flex items-center gap-2 h-5">
                    {Array.from({ length: targetCycles || 1 }).map((_, i) => (
                        <React.Fragment key={i}>
                            <div className="flex-1 h-1.5 bg-[#2d1a12]/20 rounded-full overflow-hidden">
                                <div
                                    ref={el => workFillsRef.current[i] = el}
                                    className="h-full bg-[#3b82f6] transition-all"
                                    style={{
                                        width: (i < sessions - 1 || (i === sessions - 1 && (mode === 'break' || mode === 'long_break'))) ? '100%' :
                                            (i === sessions - 1 && mode === 'work') ? `${Math.max(0, (1 - Math.max(0, timeLeft) / (totalTime || 1)) * 100)}%` : '0%'
                                    }}
                                />
                            </div>
                            {i < (targetCycles || 1) - 1 && (
                                <div className="relative w-4 h-4 rounded-full bg-[#2d1a12]/20 border border-[#2d1a12]/40 overflow-hidden shrink-0">
                                    <div
                                        ref={el => breakBallsRef.current[i] = el}
                                        className="absolute bottom-0 w-full bg-emerald-400 transition-all"
                                        style={{
                                            height: (i < sessions - 1) ? '100%' :
                                                (sessions === i + 1 && (mode === 'break' || mode === 'long_break')) ? `${Math.max(0, (1 - Math.max(0, timeLeft) / (totalTime || 1)) * 100)}%` : '0%'
                                        }}
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
