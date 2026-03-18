import React, { useMemo, useState } from 'react';

export const GaussianPlot = ({ mean, sd, low95, high95, targetScore, currentMean, prob }) => {
    const [hover, setHover] = useState(null);

    const { pathData, trendPathData, areaPathData, range, xMin, targetVal, xp, yp, heightFactor, curvePoints } = useMemo(() => {
        const meanVal = mean ?? 0;
        const targetVal = targetScore ?? 70;
        const xMin = 0;
        const xMax = 100;
        const range = 100;

        let sdLeft = sd;
        let sdRight = sd;
        if (low95 != null && high95 != null) {
            sdLeft = Math.max(0.2, (meanVal - low95) / 1.96);
            sdRight = Math.max(0.2, (high95 - meanVal) / 1.96);
        }
        const vizSdLeft = Math.max(1, sdLeft);
        const vizSdRight = Math.max(1, sdRight);
        const avgSd = (vizSdLeft + vizSdRight) / 2;
        const heightFactor = Math.min(1.2, 12 / avgSd); // Aumentado ligeiramente para VISUAL-04

        const xp = (v) => (v - xMin) / range * 100;
        const yp = (yVal) => 100 - (yVal * 100);

        const asymmetricGaussian = (x) => {
            const currentSd = x < meanVal ? vizSdLeft : vizSdRight;
            return heightFactor * Math.exp(-0.5 * Math.pow((x - meanVal) / currentSd, 2));
        };

        // 1. Trend Line (Today -> Peak)
        const trendPoints = [];
        if (currentMean != null) {
            const tSteps = 25;
            for (let i = 0; i <= tSteps; i++) {
                const t = i / tSteps;
                const tWeight = (1 - Math.exp(-3 * t)) / (1 - Math.exp(-3));
                const tx = currentMean + (meanVal - currentMean) * tWeight;
                const ty = heightFactor * tWeight;
                trendPoints.push(`${xp(tx)},${yp(ty)}`);
            }
        }

        // 2. Main Gaussian Curve (Always full extent)
        const curvePoints = [];
        const gSteps = 100;
        for (let i = 0; i <= gSteps; i++) {
            const x = xMin + (xMax - xMin) * (i / gSteps);
            const y = asymmetricGaussian(x);
            curvePoints.push(`${xp(x)},${yp(y)}`);
        }

        const path = `M ${curvePoints.join(' L ')}`;
        const trendPath = trendPoints.length > 0 ? `M ${trendPoints.join(' L ')}` : '';

        // 3. Precise Area Path (BUG-06 FIX)
        const areaPoints = [];
        const successStart = Math.max(xMin, targetVal);
        
        // Find intersection with the curve at exactly successStart
        const yAtTarget = asymmetricGaussian(successStart);
        areaPoints.push(`${xp(successStart)},${yp(yAtTarget)}`);

        // Add points from the curve that are >= successStart
        curvePoints.forEach(p => {
            const [xPos, yPos] = p.split(',').map(Number);
            if (xPos > xp(successStart)) {
                areaPoints.push(p);
            }
        });

        if (areaPoints.length > 0) {
            const lastP = areaPoints[areaPoints.length - 1];
            const firstX = xp(successStart);
            const lastX = lastP.split(',')[0];
            areaPoints.push(`${lastX},100`);
            areaPoints.push(`${firstX},100`);
        }
        const areaPath = areaPoints.length > 2 ? `M ${areaPoints.join(' L ')} Z` : '';

        return { 
            pathData: path, 
            trendPathData: trendPath, 
            areaPathData: areaPath, 
            range, xMin, targetVal, xp, yp, heightFactor, curvePoints 
        };
    }, [mean, sd, low95, high95, targetScore, currentMean]);

    const targetPos = useMemo(() => xp(targetVal), [xp, targetVal]);
    const meanPos = useMemo(() => xp(mean), [xp, mean]);
    const currentPos = currentMean != null ? xp(currentMean) : 0;
    const ciHighPx = xp(high95);
    const ciLowPx = xp(low95);
    const isTargetVisible = targetPos >= 0 && targetPos <= 100;
    const isCurrentVisible = currentMean != null && currentPos >= 0 && currentPos <= 100;

    const ciWide = (high95 - low95) >= 95;
    const ciLabel = ciWide ? "Alta incerteza" : `${low95.toFixed(0)}–${high95.toFixed(0)}%`;

    // Visual Helpers
    const delta = mean - (currentMean ?? 0);
    const deltaColor = delta >= 0 ? "text-emerald-400" : "text-rose-400";

    // Collision Detection Logic (BUG-11 / VISUAL Polish)
    const collisionMetaMean = isTargetVisible && Math.abs(meanPos - targetPos) < 10;
    const collisionMeanCi = !ciWide && Math.abs(meanPos - ciLowPx) < 12;
    const collisionTargetCi = !ciWide && isTargetVisible && Math.abs(targetPos - ciHighPx) < 10;

    return (
        <div
            className="relative w-full h-[140px] mt-8 mb-6 cursor-crosshair group/chart"
            onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
                const val = xMin + (percentage / 100 * range);
                setHover({ x: percentage, val });
            }}
            onMouseLeave={() => setHover(null)}
        >
            {/* Delta Badge (VISUAL-03) */}
            {currentMean != null && (
                <div className="absolute -top-6 right-0 flex items-center gap-1.5 bg-slate-900/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-slate-700/50 shadow-sm z-10 transition-all group-hover/chart:border-indigo-500/30">
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
                        <stop offset="0%" stopColor="rgba(34, 197, 94, 0.4)" />
                        <stop offset="100%" stopColor="rgba(34, 197, 94, 0.05)" />
                    </linearGradient>
                    <filter id="gpGlow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="1.2" result="blur" />
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

                {/* BUG-06 FIX: Success Area */}
                <path d={areaPathData} fill="url(#gpAreaGradient)" stroke="#22c55e" strokeWidth="0.8" strokeDasharray="2,2" vectorEffect="non-scaling-stroke" className="opacity-40" />

                {/* VISUAL-02: Animated Dashed Trend Line */}
                {trendPathData && (
                    <path 
                        d={trendPathData} 
                        fill="none" 
                        stroke="rgba(255,255,255,0.4)" 
                        strokeWidth="1.5" 
                        strokeDasharray="4,4" 
                        vectorEffect="non-scaling-stroke"
                        className="animate-[dash_20s_linear_infinite]"
                    />
                )}

                {/* VISUAL-05: Gradient Main Curve */}
                <path d={pathData} fill="none" stroke="url(#gpCurveGradient)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" style={{ filter: 'url(#gpGlow)' }} />

                {/* Markers & Visual Elements */}
                {isTargetVisible && (
                    <line x1={targetPos} y1="100" x2={targetPos} y2="0" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3,2" vectorEffect="non-scaling-stroke" className="opacity-60" />
                )}

                <line x1={meanPos} y1="100" x2={meanPos} y2="0" stroke="#3b82f6" strokeWidth="1" vectorEffect="non-scaling-stroke" className="opacity-40" />

                {/* VISUAL-04: Peak Dot */}
                <circle cx={meanPos} cy={yp(heightFactor)} r="3" fill="#3b82f6" stroke="#0f172a" strokeWidth="1.5" style={{ filter: 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.8))' }} />

                {isCurrentVisible && (
                    <circle cx={currentPos} cy="100" r="2.5" fill="white" stroke="#0f172a" strokeWidth="1" />
                )}
            </svg>

            {/* Floating Labels */}
            <div className="absolute inset-0 pointer-events-none">
                {/* Projeção Label */}
                <div
                    className="absolute transform -translate-x-1/2 -top-5 flex flex-col items-center"
                    style={{ left: `${meanPos}%` }}
                >
                    <span className="text-[10px] font-black text-blue-400 bg-slate-900/80 px-1.5 py-0.5 rounded shadow-sm border border-blue-500/20">
                        {mean.toFixed(1)}%
                    </span>
                    <span className="text-[8px] font-bold text-blue-500/60 uppercase tracking-tighter mt-1">Projeção</span>
                </div>

                {/* Target Label */}
                {isTargetVisible && (
                    <div
                        className="absolute transform -translate-x-1/2 flex flex-col items-center transition-all duration-300"
                        style={{ 
                            left: `${targetPos}%`, 
                            top: collisionMetaMean ? '22px' : '0'
                        }}
                    >
                        <span className="text-[10px] font-black text-rose-100 bg-rose-600/60 px-1.5 py-0.5 rounded shadow-md border border-rose-400/30">
                            🎯{targetVal}%
                        </span>
                    </div>
                )}

                {/* Chance Label (VISUAL Performance) */}
                {isTargetVisible && targetPos < 92 && (
                    <div
                        className="absolute flex flex-col items-center opacity-0 group-hover/chart:opacity-100 transition-opacity duration-300"
                        style={{ left: `${targetPos + (100 - targetPos) / 2}%`, top: '35%' }}
                    >
                        <span className="text-[14px] font-black text-emerald-400 drop-shadow-lg">
                            {prob ? prob.toFixed(1) : '0'}%
                        </span>
                        <span className="text-[7px] font-black text-emerald-500/60 uppercase tracking-widest leading-none">Caminho de Sucesso</span>
                    </div>
                )}

                {/* Hoje Label */}
                {isCurrentVisible && (
                    <div
                        className="absolute transform -translate-x-1/2 bottom-1 bg-slate-800/80 border border-slate-700 px-1.5 py-0.5 rounded shadow-sm transition-all group-hover/chart:opacity-20"
                        style={{ left: `${currentPos}%` }}
                    >
                        <span className="text-[9px] font-black text-white/70 tracking-tight">Hoje: {currentMean.toFixed(1)}%</span>
                    </div>
                )}
            </div>

            {/* Hover Tooltip (VISUAL-07) */}
            {hover && (
                <div 
                    className="absolute top-0 bottom-0 pointer-events-none z-50 flex flex-col items-center"
                    style={{ left: `${hover.x}%` }}
                >
                    <div className="h-full w-px bg-white/20 shadow-[0_0_8px_rgba(255,255,255,0.3)]" />
                    <div className="absolute -top-10 bg-slate-900 border border-indigo-500/50 text-white px-2 py-1.5 rounded-lg shadow-2xl flex flex-col items-center">
                        <span className="text-[11px] font-black">{hover.val.toFixed(1)}%</span>
                        <span className={`text-[7px] font-bold uppercase tracking-wider ${hover.val >= targetVal ? 'text-emerald-400' : 'text-slate-500'}`}>
                            {hover.val >= targetVal ? 'Zona de Sucesso' : 'Abaixo da Meta'}
                        </span>
                    </div>
                </div>
            )}

            {/* Footer Metrics (Ticks and IC) */}
            <div className="absolute -bottom-5 inset-x-0 h-4 flex items-center justify-between text-[8px] font-bold text-slate-500/60 uppercase tracking-tighter">
                <div className="flex gap-4">
                    <span>{xMin}%</span>
                    {[25, 50, 75].map(t => <span key={t} style={{ position: 'absolute', left: `${t}%`, transform: 'translateX(-50%)' }}>{t}%</span>)}
                    <span className="absolute right-0">{xMin + range}%</span>
                </div>
            </div>

            <div 
                className="absolute -bottom-8 transform -translate-y-1/2 flex items-center gap-1.5 opacity-60 group-hover/chart:opacity-100 transition-opacity"
                style={{ left: `${ciLowPx}%` }}
            >
                <div className="w-2 h-2 rounded-full bg-blue-500/20 border border-blue-400/40" />
                <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest whitespace-nowrap">
                    IC 95%: {ciLabel}
                </span>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes dash {
                    to { stroke-dashoffset: -1000; }
                }
            ` }} />
        </div>
    );
};
