import React, { useMemo, useState, useId } from 'react';
import { asymmetricGaussian, generateGaussianPoints, normalCDF_complement } from '../../engine/math/gaussian';

export const GaussianPlot = ({ mean, sd, low95, high95, targetScore, currentMean, prob, sdLeft: propSdLeft, sdRight: propSdRight }) => {
    const [hover, setHover] = useState(null);

    // VISUAL-01 FIX: IDs únicos por instância para evitar conflito entre múltiplos GaussianPlot
    const instanceId = useId().replace(/:/g, '');
    const ID = {
        curveGrad: `gpCurveGradient_${instanceId}`,
        areaGrad: `gpAreaGradient_${instanceId}`,
        failGrad: `gpFailAreaGradient_${instanceId}`,
        glow: `gpGlow_${instanceId}`,
        strongGlow: `gpStrongGlow_${instanceId}`,
    };

    const { pathData, trendPathData, areaPathData, failAreaPathData, range, xMin, targetVal, xp, yp, heightFactor, curvePoints, asymmetricGaussianFn, median, p25, p75 } = useMemo(() => {
        const meanVal = mean ?? 0;
        const targetVal = targetScore ?? 70;
        const xMin = 0;
        const xMax = 100;
        const range = 100;

        let vizSdLeft = Math.max(1, propSdLeft ?? sd);
        let vizSdRight = Math.max(1, propSdRight ?? sd);

        // BUG-03/MC-03 FIX: Calibração visual da área verde para coincidir com a prop 'prob' do Gauge
        // Isso resolve a discrepância entre a curva Gaussiana suavizada e o "pile-up" em 100% da simulação.
        if (prob != null && prob > 0 && prob < 100) {
            const targetProb = prob / 100;
            const m = meanVal;
            const t = targetVal;
            
            // Probabilidade geométrica simplificada para um Gaussiano Assimétrico (sem considerar o truncamento em 0-100 para o ajuste)
            const getGeomProb = (tVal, mVal, sl, sr) => {
                const untruncatedTotal = (sl + sr) * 0.5;
                const overflowRight = sr * normalCDF_complement((100 - mVal) / sr);
                const overflowLeft = sl * normalCDF_complement(mVal / sl);
                const truncatedTotal = Math.max(0.01, untruncatedTotal - overflowRight - overflowLeft);

                let successArea;
                if (tVal >= mVal) {
                    const untruncatedSuccess = sr * normalCDF_complement((tVal - mVal) / sr);
                    successArea = Math.max(0, untruncatedSuccess - overflowRight);
                } else {
                    const areaLeftSuccess = 0.5 - normalCDF_complement((mVal - tVal) / sl);
                    const untruncatedSuccess = (sl * areaLeftSuccess) + (sr * 0.5);
                    successArea = Math.max(0, untruncatedSuccess - overflowRight);
                }
                
                return successArea / truncatedTotal;
            };

            const pGeom = getGeomProb(t, m, vizSdLeft, vizSdRight);
            
            // Ajustar o SD do lado que contém a fronteira da meta para "forçar" a área visual a casar com o gauge
            if (Math.abs(targetProb - pGeom) > 0.01) {
                const ratio = targetProb / Math.max(0.01, pGeom);
                if (t < m) {
                    // Meta à esquerda da média: o ajuste do vizSdLeft tem maior impacto na área de sucesso
                    vizSdLeft = Math.max(1, vizSdLeft * ratio);
                } else {
                    // Meta à direita da média: o ajuste do vizSdRight tem maior impacto
                    vizSdRight = Math.max(1, vizSdRight * ratio);
                }
            }
        }

        const avgSd = (vizSdLeft + vizSdRight) / 2;
        // B-04 FIX: Maximized to 1.0 for the user's latest "azul mais alto" request
        const heightFactor = Math.min(1.0, 12 / avgSd);

        const xp = (v) => (v - xMin) / range * 100;
        const yp = (yVal) => 100 - (yVal * 100);

        // Uses centralized logic

        // 1. Trend Line (Removed as it causes visual artifacts on negative drift)
        const trendPath = '';

        // 2. Main Gaussian Curve (Always full extent) - Uses centralized helper
        const curvePoints = generateGaussianPoints(xMin, xMax, 100, meanVal, vizSdLeft, vizSdRight, heightFactor, xp, yp);

        const path = `M ${curvePoints.join(' L ')}`;

        // 3. Precise Area Paths (BUG-06 FIX / Enhancement)
        const areaPoints = []; // Success
        const failPoints = []; // Failure
        const successStart = Math.max(xMin, targetVal);

        // Intersection Y at exactly targetScore
        const yAtTarget = asymmetricGaussian(successStart, meanVal, vizSdLeft, vizSdRight, heightFactor);

        // Success Area (x >= target)
        areaPoints.push(`${xp(successStart)},${yp(yAtTarget)}`);
        curvePoints.forEach(p => {
            const [xPos, yPos] = p.split(',').map(Number);
            if (xPos > xp(successStart)) areaPoints.push(p);
        });
        if (areaPoints.length > 0) {
            const lastP = areaPoints[areaPoints.length - 1];
            const firstX = xp(successStart);
            const lastX = lastP.split(',')[0];
            areaPoints.push(`${lastX},100`);
            areaPoints.push(`${firstX},100`);
        }

        // Failure Area (x < target)
        failPoints.push(`${xp(xMin)},100`);
        curvePoints.forEach(p => {
            const [xPos] = p.split(',').map(Number);
            if (xPos <= xp(successStart)) failPoints.push(p);
        });
        failPoints.push(`${xp(successStart)},${yp(yAtTarget)}`);
        failPoints.push(`${xp(successStart)},100`);

        const areaPath = areaPoints.length > 2 ? `M ${areaPoints.join(' L ')} Z` : '';
        const failPath = failPoints.length > 2 ? `M ${failPoints.join(' L ')} Z` : '';

        // Added for Ultra-Premium markers
        const median = meanVal;
        const p25 = meanVal - 0.674 * vizSdLeft;
        const p75 = meanVal + 0.674 * vizSdRight;

        return {
            pathData: path,
            trendPathData: trendPath,
            areaPathData: areaPath,
            failAreaPathData: failPath,
            range, xMin, targetVal, xp, yp, heightFactor, curvePoints,
            asymmetricGaussianFn: (x) => asymmetricGaussian(x, meanVal, vizSdLeft, vizSdRight, heightFactor),
            median, p25, p75
        };
    // Bug 3: Incluir dependências corretas (prob, propSdLeft, propSdRight)
    }, [mean, sd, targetScore, prob, propSdLeft, propSdRight]);

    const targetPos = xp(targetVal);
    const meanPos = xp(mean ?? 0);
    const currentPos = currentMean != null ? xp(currentMean) : 0;
    const ciHighPx = xp(high95);
    const ciLowPx = xp(low95);
    const isTargetVisible = targetPos >= 0 && targetPos <= 100;
    const isCurrentVisible = currentMean != null && currentPos >= 0 && currentPos <= 100;

    const ciWide = (high95 - low95) >= 95;
    const ciLabel = ciWide ? "Alta incerteza" : `${low95.toFixed(0)}–${high95.toFixed(0)}%`;

    const delta = mean - (currentMean ?? 0);
    const deltaColor = delta >= 0 ? "text-emerald-400" : "text-rose-400";

    // V1 FIX: Position "Hoje" label dynamically above the curve point
    const hojeYPercent = yp(asymmetricGaussianFn(currentMean ?? mean));
    const hojeTop = Math.min(hojeYPercent - 12, 38);

    // 3-Tier Collision Logic for Top Labels (Projeção, Meta, Hoje)
    // BUG-B7 FIX: Increased threshold to 20 for more robust spacing
    const collisionMetaMean = isTargetVisible && Math.abs(meanPos - targetPos) < 20;
    const collisionHojeMean = isCurrentVisible && Math.abs(currentPos - meanPos) < 20;
    const collisionHojeTarget = isCurrentVisible && isTargetVisible && Math.abs(currentPos - targetPos) < 20;

    // Resolve Tiers with Projection (Blue) as HIGHEST PRIORITY
    let tierMean = 1;
    let tierTarget = 1;
    let tierHoje = 1;

    // Resolve conflicts
    if (collisionMetaMean) {
        tierTarget = 2; // Move Meta (red) down if it hits Projection (blue)
    }

    if (collisionHojeMean || collisionHojeTarget) {
        // Resolve Tier 3 correctly: if it hits Mean or Target, it must be below whatever is highest there
        const meanConflictTier = collisionHojeMean ? tierMean : 0;
        const targetConflictTier = collisionHojeTarget ? tierTarget : 0;
        tierHoje = Math.max(meanConflictTier, targetConflictTier) + 1;
    }

    return (
        <div
            className="relative w-full h-[140px] mb-10 cursor-crosshair group/chart"
            onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
                const val = xMin + (percentage / 100 * range);
                setHover({ x: percentage, val });
            }}
            onMouseLeave={() => setHover(null)}
        >
            {/* Delta Badge (B-12 FIX: Remove -top-6 to avoid overlap with summary cards) */}
            {currentMean != null && (
                <div className="absolute top-0 right-0 flex items-center gap-1.5 bg-slate-900/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-slate-700/50 shadow-sm z-10 transition-all group-hover/chart:border-indigo-500/30">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Delta:</span>
                    <span className={`text-[11px] font-black ${deltaColor}`}>
                        {delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)} pp
                    </span>
                </div>
            )}

            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" className="overflow-visible">
                <defs>
                    <linearGradient id="gpCurveGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="50%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#2dd4bf" />
                    </linearGradient>
                    <linearGradient id="gpAreaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(34, 197, 94, 0.7)" />
                        <stop offset="100%" stopColor="rgba(34, 197, 94, 0.2)" />
                    </linearGradient>
                    <linearGradient id="gpFailAreaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(239, 68, 68, 0.5)" />
                        <stop offset="100%" stopColor="rgba(239, 68, 68, 0.1)" />
                    </linearGradient>
                    <filter id="gpGlow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="1.2" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                    <filter id="gpStrongGlow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                </defs>

                {/* X-Axis and Ticks (VISUAL-01) */}
                <line x1="0" y1="100" x2="100" y2="100" stroke="#334155" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                {[25, 50, 75].map(tick => (
                    <line key={tick} x1={tick} y1="100" x2={tick} y2="103" stroke="#475569" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                ))}

                {/* VISUAL-06: IC 95% Shaded Band */}
                {low95 != null && high95 != null && (
                    <rect
                        x={ciLowPx}
                        y="0"
                        width={ciHighPx - ciLowPx}
                        height="100"
                        fill="rgba(59, 130, 246, 0.05)"
                        className="transition-opacity duration-300 group-hover/chart:opacity-80"
                    />
                )}

                {/* Failure Area (Red) */}
                <path
                    d={failAreaPathData}
                    fill={`url(#${ID.failGrad})`}
                    stroke="#ef4444"
                    strokeWidth="1.2"
                    vectorEffect="non-scaling-stroke"
                    className="opacity-70 transition-all duration-1000"
                    style={{ filter: `url(#${ID.glow})` }}
                />

                {/* BUG-06 FIX: Success Area (With Pulse if High Prob) */}
                <path
                    d={areaPathData}
                    fill={`url(#${ID.areaGrad})`}
                    stroke="#22c55e"
                    strokeWidth="1.2"
                    strokeDasharray="none"
                    vectorEffect="non-scaling-stroke"
                    className="opacity-80 transition-all duration-1000"
                    style={{ filter: `url(#${ID.glow})` }}
                />

                {/* Vertical Markers (p25, Median, p75) */}
                <line x1={xp(p25)} y1="100" x2={xp(p25)} y2={yp(asymmetricGaussianFn(p25))} stroke="#3b82f6" strokeWidth="0.5" strokeDasharray="1,1" className="opacity-30" />
                <line x1={xp(p75)} y1="100" x2={xp(p75)} y2={yp(asymmetricGaussianFn(p75))} stroke="#3b82f6" strokeWidth="0.5" strokeDasharray="1,1" className="opacity-30" />

                {/* VISUAL-05: Gradient Main Curve */}
                <path d={pathData} fill="none" stroke={`url(#${ID.curveGrad})`} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" style={{ filter: `url(#${ID.glow})` }} />

                {/* Markers & Visual Elements */}
                {isTargetVisible && (
                    <line x1={targetPos} y1="100" x2={targetPos} y2="0" stroke="#ef4444" strokeWidth="3.0" vectorEffect="non-scaling-stroke" className="opacity-100" />
                )}

                <line x1={meanPos} y1="100" x2={meanPos} y2="0" stroke="#3b82f6" strokeWidth="2.2" vectorEffect="non-scaling-stroke" className="opacity-90" />

                {/* Visual Markers & Elements */}
                {/* Meta and Peak indicators are now represented by vertical lines */}

                {isCurrentVisible && (
                    <line x1={currentPos} y1="100" x2={currentPos} y2="0" stroke="white" strokeWidth="1.5" strokeDasharray="2,2" vectorEffect="non-scaling-stroke" className="opacity-70" />
                )}
            </svg>

            {/* Floating Labels (B-13 FIX: 3-Tier Robust Collision Avoidance) */}
            <div className="absolute inset-0 pointer-events-none">
                {/* Projeção Label */}
                <div
                    className="absolute flex flex-col items-center transition-all duration-500"
                    style={{
                        left: `${meanPos}%`,
                        top: tierMean === 3 ? '16%' : tierMean === 2 ? '8%' : '0%',
                        transform: 'translateX(-50%)',
                        zIndex: 30
                    }}
                >
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.9)]" />
                    <span className="text-[10px] font-black text-blue-400 mt-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                        {mean.toFixed(1)}%
                    </span>
                    <span className="text-[7px] font-black text-blue-400/70 uppercase tracking-tighter mt-0.5">Projeção</span>
                </div>

                {/* Target Label */}
                {isTargetVisible && (
                    <div
                        className="absolute flex flex-col items-center transition-all duration-500"
                        style={{
                            left: `${targetPos}%`,
                            top: tierTarget === 3 ? '16%' : tierTarget === 2 ? '8%' : '0%',
                            transform: 'translateX(-50%)',
                            zIndex: 20
                        }}
                    >
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.9)]" />
                        <span className="text-[10px] font-black text-rose-400 mt-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                            {targetVal}%
                        </span>
                        <span className="text-[7px] font-black text-rose-500/50 uppercase tracking-tighter mt-0.5">Meta</span>
                    </div>
                )}

                {/* Chance Label (Visual Indicator for the green area) */}
                {isTargetVisible && targetPos < 92 && (
                    <div
                        className="absolute flex flex-col items-center opacity-0 group-hover/chart:opacity-100 transition-opacity duration-300"
                        style={{ left: `${targetPos + (100 - targetPos) / 2}%`, top: '45%' }}
                    >
                        <span className="text-[16px] font-black text-emerald-400 drop-shadow-lg shadow-emerald-500/50">
                            {prob ? prob.toFixed(1) : '0'}%
                        </span>
                        <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest leading-none">Caminho de Sucesso</span>
                    </div>
                )}

                {/* Hoje Label */}
                {isCurrentVisible && (
                    <div
                        className="absolute flex flex-col items-center transition-all group-hover/chart:opacity-30 duration-500"
                        style={{
                            left: `${currentPos}%`,
                            // VISUAL-02 FIX: Clampar para evitar corte no topo do container
                            top: tierHoje > 1 ? `calc(${Math.max(0, hojeTop)}% + ${(tierHoje - 1) * 16}px)` : `${Math.max(0, hojeTop)}%`,
                            transform: 'translateX(-50%)',
                            zIndex: 10
                        }}
                    >
                        <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.4)] mb-1" />
                        <span className="text-[10px] font-black text-white/90 px-2 py-0.5 rounded-md bg-slate-900/60 backdrop-blur-md border border-white/20 tracking-tighter leading-none whitespace-nowrap shadow-xl">Hoje: {currentMean.toFixed(1)}%</span>
                    </div>
                )}
            </div>

            {/* Bottom Percent Ticks */}
            <div className="absolute inset-x-0 bottom-[-22px] h-4">
                {[0, 25, 50, 75, 100].map(t => (
                    <span
                        key={t}
                        className="absolute text-[8px] font-bold text-slate-500/60 uppercase tracking-tighter"
                        style={{
                            left: `${t}%`,
                            // VISUAL-03 FIX: translateX adaptativo
                            transform: t === 0 ? 'translateX(0%)' : t === 100 ? 'translateX(-100%)' : 'translateX(-50%)' 
                        }}
                    >
                        {t}%
                    </span>
                ))}
            </div>

            {/* Hover Tooltip (Curve-Following Ultra) */}
            {hover && (
                <div
                    className="absolute inset-0 pointer-events-none z-50 overflow-hidden"
                >
                    <div
                        className="absolute h-full w-px bg-white/10"
                        style={{ left: `${hover.x}%` }}
                    />
                    <div
                        className="absolute w-2 h-2 rounded-full bg-white shadow-[0_0_10px_white] transition-all duration-75"
                        style={{ left: `${hover.x}%`, top: `${yp(asymmetricGaussianFn(hover.val))}%`, transform: 'translate(-50%, -50%)' }}
                    />
                    <div
                        className="absolute bg-slate-900/90 backdrop-blur-xl border border-indigo-500/50 text-white p-2 rounded-xl shadow-2xl flex flex-col items-center min-w-[80px] transition-all duration-150"
                        style={{ left: `${hover.x}%`, top: `${yp(asymmetricGaussianFn(hover.val)) - 10}%`, transform: 'translate(-50%, -100%)' }}
                    >
                        <span className="text-[12px] font-black tracking-tight">{hover.val.toFixed(1)}%</span>
                        <div className="flex items-center gap-1 mt-0.5">
                            <div className={`w-1.5 h-1.5 rounded-full ${hover.val >= targetVal ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                            <span className={`text-[8px] font-black uppercase tracking-widest ${hover.val >= targetVal ? 'text-emerald-400' : 'text-slate-400'}`}>
                                {hover.val >= targetVal ? 'Zona de Sucesso' : 'Abaixo da Meta'}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Footer Metrics (Ticks and IC) */}
            {/* B-10 FIX: Todos absolutos com posição explícita */}
            <div className="absolute -bottom-5 inset-x-0 h-4 pointer-events-none">
                {[0, 25, 50, 75, 100].map(t => (
                    <span
                        key={t}
                        className="absolute text-[8px] font-bold text-slate-500/60 uppercase tracking-tighter"
                        style={{ left: `${t}%`, transform: 'translateX(-50%)' }}
                    >
                        {t}%
                    </span>
                ))}
            </div>

            <div
                className="absolute -bottom-6 transform -translate-y-1/2 flex items-center gap-1.5 opacity-60 group-hover/chart:opacity-100 transition-opacity"
                style={{ left: `${ciLowPx}%` }}
            >
                <div className="w-2 h-2 rounded-full bg-blue-500/20 border border-blue-400/40" />
                <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest whitespace-nowrap">
                    IC 95%: {ciLabel}
                </span>
            </div>

        </div>
    );
};
