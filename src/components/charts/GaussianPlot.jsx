import React, { useMemo, useState } from 'react';

export const GaussianPlot = ({ mean, sd, low95, high95, targetScore, currentMean }) => {
    const [hover, setHover] = useState(null);

    const { pathData, areaPathData, range, xMin } = useMemo(() => {
        const vizSd = Math.max(3, sd ?? 3);
        const meanVal = mean ?? 0;
        const targetVal = targetScore ?? 70;
        let xMin = Math.max(0, meanVal - 3.5 * vizSd);
        let xMax = Math.min(100, meanVal + 3.5 * vizSd);

        xMin = Math.min(xMin, targetVal - 5);
        xMax = Math.max(xMax, targetVal + 5);

        if (currentMean > 0) {
            xMin = Math.min(xMin, currentMean - 5);
            xMax = Math.max(xMax, currentMean + 5);
        }

        xMin = Math.max(0, xMin);
        xMax = Math.min(100, xMax);
        const range = Math.max(10, xMax - xMin);

        const gaussian = (x) => Math.exp(-0.5 * Math.pow((x - meanVal) / vizSd, 2));
        const points = [];
        const steps = 40;

        for (let i = 0; i <= steps; i++) {
            const x = xMin + (range * (i / steps));
            const y = gaussian(x);
            const safeY = isNaN(y) ? 0 : y;
            points.push(`${(x - xMin) / range * 100},${100 - (safeY * 100)}`);
        }
        const path = `M ${points.join(' L ')}`;

        const areaPoints = [];
        // Bug fix: use ?? so that low95=0 is kept (falsy || would replace 0 with 0 here but
        // high95=0 would wrongly fall back to 100, hiding the CI band)
        const l95 = low95 ?? 0;
        const h95 = high95 ?? 100;

        if (l95 >= xMin && l95 <= xMin + range) {
            const yL = gaussian(l95);
            areaPoints.push(`${(l95 - xMin) / range * 100},${100 - (isNaN(yL) ? 0 : yL * 100)}`);
        }

        for (let i = 0; i <= steps; i++) {
            const x = xMin + (range * (i / steps));
            if (x > l95 && x < h95) {
                const y = gaussian(x);
                const safeY = isNaN(y) ? 0 : y;
                areaPoints.push(`${(x - xMin) / range * 100},${100 - (safeY * 100)}`);
            }
        }

        if (h95 >= xMin && h95 <= xMin + range) {
            const yH = gaussian(h95);
            areaPoints.push(`${(h95 - xMin) / range * 100},${100 - (isNaN(yH) ? 0 : yH * 100)}`);
        }

        if (areaPoints.length > 0) {
            const firstX = areaPoints[0].split(',')[0];
            const lastX = areaPoints[areaPoints.length - 1].split(',')[0];
            // To create a filled shape under the curve, we must draw straight down from the last point 
            // to the bottom baseline (y=100), then draw straight back to the x of the first point, 
            // and close the path.
            areaPoints.push(`${lastX},100`);
            areaPoints.push(`${firstX},100`);
        }
        const areaPath = areaPoints.length > 0 ? `M ${areaPoints.join(' L ')} Z` : '';

        return { pathData: path, areaPathData: areaPath, range, xMin };
    }, [mean, sd, low95, high95, targetScore, currentMean]);

    const targetPos = (targetScore - xMin) / range * 100;
    const isTargetVisible = targetPos >= 0 && targetPos <= 100;
    const currentPos = ((currentMean || 0) - xMin) / range * 100;
    const isCurrentVisible = currentMean > 0 && currentPos >= 0 && currentPos <= 100;

    return (
        <div
            className="relative w-full h-32 mt-6 mb-4 cursor-crosshair group/chart"
            onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
                const val = xMin + (percentage / 100 * range);
                setHover({ x: percentage, val });
            }}
            onMouseLeave={() => setHover(null)}
        >
            <style>
                {`
                    @keyframes dash { from { stroke-dashoffset: 1000; } to { stroke-dashoffset: 0; } }
                    .animate-path { stroke-dasharray: 1000; stroke-dashoffset: 0; animation: dash 2s ease-out forwards; }
                `}
            </style>

            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" className="overflow-visible">
                {/* Bug fix: unique IDs to avoid collision with EvolutionChart's global SVG defs */}
                <defs>
                    <linearGradient id="curveGradientGP" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(59, 130, 246, 0.5)" />
                        <stop offset="100%" stopColor="rgba(59, 130, 246, 0.0)" />
                    </linearGradient>
                    <linearGradient id="areaGradientGP" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(34, 197, 94, 0.6)" />
                        <stop offset="100%" stopColor="rgba(34, 197, 94, 0.1)" />
                    </linearGradient>
                    <filter id="glowPlotGP" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="1.5" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                </defs>

                <line x1="0" y1="100" x2="100" y2="100" stroke="#334155" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                <path d={pathData} fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" className="opacity-50 animate-path" vectorEffect="non-scaling-stroke" />
                <path d={areaPathData} fill="url(#areaGradientGP)" stroke="#22c55e" strokeWidth="2" vectorEffect="non-scaling-stroke" style={{ filter: 'url(#glowPlotGP)' }} />

                {isCurrentVisible && (
                    <line x1={Math.max(0, currentPos)} y1="100" x2={Math.max(0, currentPos)} y2="20" stroke="white" strokeWidth="1.5" strokeDasharray="5,5" className="opacity-40" vectorEffect="non-scaling-stroke" />
                )}

                <line x1={(mean - xMin) / range * 100} y1="100" x2={(mean - xMin) / range * 100} y2="0" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="5,5" className="opacity-80" vectorEffect="non-scaling-stroke" />

                {isTargetVisible && (
                    <line x1={targetPos} y1="100" x2={targetPos} y2="0" stroke="#ef4444" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                )}
            </svg>

            {hover && (
                <>
                    <div className="absolute top-0 bottom-0 w-px bg-white/50 pointer-events-none transition-opacity" style={{ left: `${hover.x}%` }} />
                    <div className="absolute top-1 transform -translate-x-1/2 bg-slate-900 border border-slate-700 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xl pointer-events-none z-50 whitespace-nowrap" style={{ left: `${hover.x}%` }}>
                        {hover.val.toFixed(1)}%
                    </div>
                </>
            )}

            <div className="absolute bottom-0 left-1 text-[9px] font-bold text-slate-500 transform translate-y-full">{Math.round(xMin)}%</div>
            <div className="absolute bottom-0 right-1 text-[9px] font-bold text-slate-500 transform translate-y-full">{Math.round(xMin + range)}%</div>
        </div>
    );
};
