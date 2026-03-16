import React, { useMemo, useState } from 'react';

export const GaussianPlot = ({ mean, sd, low95, high95, targetScore, currentMean, prob }) => {
    const [hover, setHover] = useState(null);

    const { pathData, areaPathData, range, xMin, targetVal, xp, yp, heightFactor } = useMemo(() => {
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
        const heightFactor = Math.min(1, 10 / avgSd);

        const xp = (v) => (v - xMin) / range * 100;
        const yp = (yVal) => 100 - (yVal * 100);

        const asymmetricGaussian = (x) => {
            const currentSd = x < meanVal ? vizSdLeft : vizSdRight;
            return heightFactor * Math.exp(-0.5 * Math.pow((x - meanVal) / currentSd, 2));
        };

        // v5: PATH UNIFICAÇÃO (Linha contínua total)
        const combinedPoints = [];
        const tSteps = 20;
        const gSteps = 90;

        if (currentMean != null) {
            // Parte 1: Tendência do Hoje ao Pico
            for (let i = 0; i < tSteps; i++) {
                const t = i / tSteps;
                const tWeight = (1 - Math.exp(-3 * t)) / (1 - Math.exp(-3));
                const tx = currentMean + (meanVal - currentMean) * tWeight;
                const ty = heightFactor * tWeight;
                combinedPoints.push(`${xp(tx)},${yp(ty)}`);
            }
        } else {
            // Se não houver "Hoje", desenha a cauda esquerda da Gaussiana
            for (let i = 0; i < 30; i++) {
                const x = xMin + (meanVal - xMin) * (i / 30);
                const y = asymmetricGaussian(x);
                combinedPoints.push(`${xp(x)},${yp(y)}`);
            }
        }

        // Parte 2: O Pico e a Cauda Direita da Gaussiana
        for (let i = 0; i <= gSteps; i++) {
            const x = meanVal + (xMax - meanVal) * (i / gSteps);
            const y = asymmetricGaussian(x);
            combinedPoints.push(`${xp(x)},${yp(y)}`);
        }

        const path = `M ${combinedPoints.join(' L ')}`;

        // Sombreado da ÁREA DE SUCESSO (Sempre contínuo com a curva)
        const areaPoints = [];
        const successStart = Math.max(xMin, targetVal);

        combinedPoints.forEach(p => {
            const [xPos, yPos] = p.split(',').map(Number);
            if (xPos >= xp(successStart)) {
                areaPoints.push(p);
            }
        });

        if (areaPoints.length > 0) {
            const firstP = areaPoints[0];
            const lastP = areaPoints[areaPoints.length - 1];
            const firstX = firstP.split(',')[0];
            const lastX = lastP.split(',')[0];
            areaPoints.push(`${lastX},100`);
            areaPoints.push(`${firstX},100`);
        }
        const areaPath = areaPoints.length > 0 ? `M ${areaPoints.join(' L ')} Z` : '';

        return { pathData: path, areaPathData: areaPath, range, xMin, targetVal, xp, yp, heightFactor };
    }, [mean, sd, low95, high95, targetScore, currentMean]);

    const xp_helper = xp;
    const yp_helper = yp;
    const targetPos = xp_helper(targetVal);
    const meanPos = xp_helper(mean);
    const currentPos = currentMean != null ? xp_helper(currentMean) : 0;
    const ciHighPx = xp_helper(high95);
    const ciLowPx = xp_helper(low95);
    const isTargetVisible = targetPos >= 0 && targetPos <= 100;
    const isCurrentVisible = currentMean != null && currentPos >= 0 && currentPos <= 100;

    const ciWide = (high95 - low95) >= 95;
    const ciLabel = ciWide
        ? "Alta incerteza"
        : `${low95.toFixed(0)}–${high95.toFixed(0)}%`;

    // Lógica de Evitação de Colisão de Labels
    const collisionMetaMean = isTargetVisible && Math.abs(meanPos - targetPos) < 8;
    // v3 FIX: Colisão Projeção vs IC Low
    const collisionMeanCi = !ciWide && Math.abs(meanPos - ciLowPx) < 10;

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

            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" className="overflow-visible">
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

                {/* 0. Intervalo de Confiança 95% */}
                {low95 != null && high95 != null && (
                    <rect
                        x={`${Math.max(0, (low95 - xMin) / range * 100)}%`}
                        y="0"
                        width={`${Math.min(100, (high95 - low95) / range * 100)}%`}
                        height="100"
                        fill="rgba(59, 130, 246, 0.08)"
                        stroke="rgba(59, 130, 246, 0.4)"
                        strokeWidth="0.5"
                        strokeDasharray="0"
                        className="opacity-60"
                    />
                )}

                {/* 1. Área de Sucesso */}
                <path d={areaPathData} fill="url(#areaGradientGP)" stroke="#22c55e" strokeWidth="1.2" strokeLinecap="round" vectorEffect="non-scaling-stroke" style={{ filter: 'url(#glowPlotGP)' }} className="opacity-30" />

                {/* 2. Curva Principal Unificada (Contínua do Hoje -> Projeção) */}
                <path d={pathData} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-80" vectorEffect="non-scaling-stroke" />

                {/* Linha Vertical de Meta com Anotação de Chance (Area invisible fix) */}
                {isTargetVisible && (
                    <g>
                        <line x1={targetPos} y1="100" x2={targetPos} y2="0" stroke="#ef4444" strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeDasharray="0" className="opacity-80" />
                        {/* Indicador de "Região de Sucesso" */}
                        <path d={`M ${targetPos},10 L ${targetPos + 5},5 L ${targetPos + 15},5`} fill="none" stroke="#22c55e" strokeWidth="0.5" vectorEffect="non-scaling-stroke" strokeDasharray="0" className="opacity-40" />
                    </g>
                )}

                {/* Linhas indicadoras */}
                {isCurrentVisible && (
                    <line x1={Math.max(0, currentPos)} y1="100" x2={Math.max(0, currentPos)} y2="20" stroke="white" strokeWidth="1" strokeDasharray="0" className="opacity-40" vectorEffect="non-scaling-stroke" />
                )}

                <line x1={meanPos} y1="100" x2={meanPos} y2="0" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="0" className="opacity-80" vectorEffect="non-scaling-stroke" />
            </svg>

            {/* Labels HTML Absolutos com Evitação de Colisão */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {/* Texto: Projeção Média */}
                <div
                    className="absolute transform -translate-x-1/2 text-[10px] font-black text-blue-300 pointer-events-none transition-all"
                    style={{ left: `${meanPos}%`, top: '0' }}
                >
                    {mean.toFixed(1)}%
                </div>

                {/* Texto: Meta (Com evitação de colisão) */}
                {isTargetVisible && (
                    <div
                        className="absolute transform -translate-x-1/2 text-[10px] font-black text-red-100 pointer-events-none flex flex-col items-center bg-red-600/40 px-1 rounded transition-all shadow-lg"
                        style={{
                            left: `${targetPos}%`,
                            top: collisionMetaMean ? '20px' : (targetPos > 90 ? '24px' : '0')
                        }}
                    >
                        <span>🎯{targetVal}%</span>
                    </div>
                )}

                {/* Anotação de Chance na Área de Sucesso */}
                {isTargetVisible && targetPos < 95 && (
                    <div
                        className="absolute text-[8px] font-black text-green-400 uppercase tracking-tighter opacity-70 flex flex-col items-center"
                        style={{ left: `${targetPos + (100 - targetPos) / 2}%`, top: '20%' }}
                    >
                        <div className="w-px h-8 bg-green-500/20 mb-1" />
                        <span>{prob ? prob.toFixed(1) : '0'}% Chance</span>
                    </div>
                )}

                {/* Texto: Hoje */}
                {isCurrentVisible && (
                    <div
                        className="absolute transform -translate-x-1/2 text-[9px] font-bold text-white/40 pointer-events-none bg-black/20 px-1 rounded"
                        style={{ left: `${Math.max(0, currentPos)}%`, bottom: '4px' }}
                    >
                        H: {currentMean.toFixed(1)}%
                    </div>
                )}
            </div>

            {/* Marcador flutuante de Hover (Mouse em cima) */}
            {hover && (
                <>
                    <div className="absolute top-0 bottom-0 w-px bg-white/50 pointer-events-none transition-opacity" style={{ left: `${hover.x}%` }} />
                    <div className="absolute top-1 transform -translate-x-1/2 bg-slate-900 border border-slate-700 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xl pointer-events-none z-50 whitespace-nowrap" style={{ left: `${hover.x}%` }}>
                        {hover.val.toFixed(1)}%
                    </div>
                </>
            )}

            {/* Eixos e Legenda de IC */}
            <div className="absolute -bottom-1 left-0 flex flex-col items-start translate-y-full">
                <span className="text-[9px] font-bold text-slate-500">{Math.round(xMin)}%</span>
            </div>

            {/* v3 FIX: Ghost label suppress + collision detection + overlap spacing */}
            {!ciWide && low95 > 1 && !collisionMeanCi && (
                <div className="absolute top-0 transform -translate-x-1/2 text-[9px] font-bold text-slate-500/60" style={{ left: `${ciLowPx}%` }}>
                    {low95.toFixed(0)}%
                </div>
            )}

            <div
                className="absolute bottom-[20px] pointer-events-none"
                style={{
                    left: `${Math.min(98, ciHighPx)}%`,
                    transform: 'translateX(-100%)'
                }}
            >
                <span className="text-[8px] font-black text-blue-400/60 uppercase tracking-tighter whitespace-nowrap">
                    IC 95%: {ciLabel}
                </span>
            </div>

            <div className="absolute -bottom-1 right-0 flex flex-col items-end translate-y-full">
                <span className="text-[9px] font-bold text-slate-500">{Math.round(xMin + range)}%</span>
            </div>
        </div>
    );
};
