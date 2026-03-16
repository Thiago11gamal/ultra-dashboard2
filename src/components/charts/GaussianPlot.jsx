import React, { useMemo, useState } from 'react';

export const GaussianPlot = ({ mean, sd, low95, high95, targetScore, currentMean, prob }) => {
    const [hover, setHover] = useState(null);

    const { pathData, areaPathData, range, xMin, targetVal } = useMemo(() => {
        const meanVal = mean ?? 0;
        const targetVal = targetScore ?? 70;

        // 🎯 Eixo X Estático (0 a 100)
        const xMin = 0;
        const xMax = 100;
        const range = 100;

        // 🧠 MODELO: Split-Normal (Two-Piece Normal)
        // Usamos as distâncias para low95 e high95 para inferir desvios padrões independentes
        // para a esquerda e para a direita, refletindo o "piling" em 100% ou 0%.
        let sdLeft = sd;
        let sdRight = sd;

        if (low95 != null && high95 != null) {
            // Em uma normal, 95% do IC está em ±1.96 * sd.
            // Para a split-normal, calculamos os sigmas separadamente.
            sdLeft = Math.max(0.2, (meanVal - low95) / 1.96);
            sdRight = Math.max(0.2, (high95 - meanVal) / 1.96);
        }

        // Garante visibilidade mínima (evita curva-agulha)
        const vizSdLeft = Math.max(1, sdLeft);
        const vizSdRight = Math.max(1, sdRight);

    // 🧠 DISPERSÃO REAL: Normalizar a altura pela média dos sigmas
    // Se σ é alto, a curva deve ser baixa e larga.
    const avgSd = (vizSdLeft + vizSdRight) / 2;
    // v3 FIX: heightScale = min(1, 10/σ)
    const heightFactor = Math.min(1, 10 / avgSd);

    // Função Gaussiana Assimétrica (Split-Normal) Normalizada
    const asymmetricGaussian = (x) => {
        const currentSd = x < meanVal ? vizSdLeft : vizSdRight;
        return heightFactor * Math.exp(-0.5 * Math.pow((x - meanVal) / currentSd, 2));
    };

    const points = [];
    const steps = 110;

    for (let i = 0; i <= steps; i++) {
        const x = xMin + (range * (i / steps));
        const y = asymmetricGaussian(x);
        const safeY = isNaN(y) ? 0 : y;
        points.push(`${(x - xMin) / range * 100},${100 - (safeY * 100)}`);
    }
    const path = `M ${points.join(' L ')}`;

    // Sombreado da ÁREA DE SUCESSO
    const areaPoints = [];
    const successStart = Math.max(xMin, targetVal);
    const successEnd = xMax;

    const yStart = asymmetricGaussian(successStart);
    areaPoints.push(`${(successStart - xMin) / range * 100},${100 - (isNaN(yStart) ? 0 : yStart * 100)}`);

    for (let i = 0; i <= steps; i++) {
        const x = xMin + (range * (i / steps));
        if (x > successStart && x < successEnd) {
            const y = asymmetricGaussian(x);
            const safeY = isNaN(y) ? 0 : y;
            areaPoints.push(`${(x - xMin) / range * 100},${100 - (safeY * 100)}`);
        }
    }

    const yEnd = asymmetricGaussian(successEnd);
    areaPoints.push(`${(successEnd - xMin) / range * 100},${100 - (isNaN(yEnd) ? 0 : yEnd * 100)}`);

    if (areaPoints.length > 0) {
        const lastX = areaPoints[areaPoints.length - 1].split(',')[0];
        const firstX = areaPoints[0].split(',')[0];
        areaPoints.push(`${lastX},100`);
        areaPoints.push(`${firstX},100`);
    }

    const areaPath = areaPoints.length > 0 ? `M ${areaPoints.join(' L ')} Z` : '';

    return { pathData: path, areaPathData: areaPath, range, xMin, targetVal };
}, [mean, sd, low95, high95, targetScore]);

const targetPos = (targetVal - xMin) / range * 100;
const isTargetVisible = targetPos >= 0 && targetPos <= 100;
const currentPos = ((currentMean || 0) - xMin) / range * 100;
const isCurrentVisible = currentMean != null && currentPos >= 0 && currentPos <= 100;

const ciWide = (high95 - low95) >= 95;
const ciLabel = ciWide
    ? "Alta incerteza"
    : `${low95.toFixed(0)}–${high95.toFixed(0)}%`;

// Lógica de Evitação de Colisão de Labels
const meanPos = (mean - xMin) / range * 100;
const ciLowPx = (low95 - xMin) / range * 100;

// v3 FIX: Colisão Meta vs Projeção
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
        <style>
            {`
                @keyframes dash { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
                .animate-path { stroke-dasharray: 1; stroke-dashoffset: 1; animation: dash 2s ease-out forwards; }
            `}
        </style>

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
                    strokeDasharray="3,3"
                    className="opacity-60"
                />
            )}

            {/* 1. Área de Sucesso */}
            <path d={areaPathData} fill="url(#areaGradientGP)" stroke="#22c55e" strokeWidth="1" vectorEffect="non-scaling-stroke" style={{ filter: 'url(#glowPlotGP)' }} className="opacity-40" />

            {/* 2. Curva Principal */}
            <path d={pathData} pathLength="1" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" className="opacity-50 animate-path" vectorEffect="non-scaling-stroke" />

            {/* Linha Vertical de Meta com Anotação de Chance (Area invisible fix) */}
            {isTargetVisible && (
                <g>
                    <line x1={targetPos} y1="100" x2={targetPos} y2="0" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3,1" vectorEffect="non-scaling-stroke" className="opacity-80" />
                    {/* Indicador de "Região de Sucesso" */}
                    <path d={`M ${targetPos},10 L ${targetPos + 5},5 L ${targetPos + 15},5`} fill="none" stroke="#22c55e" strokeWidth="0.5" vectorEffect="non-scaling-stroke" className="opacity-40" />
                </g>
            )}

            {/* Linhas indicadoras */}
            {isCurrentVisible && (
                <line x1={Math.max(0, currentPos)} y1="100" x2={Math.max(0, currentPos)} y2="20" stroke="white" strokeWidth="1" strokeDasharray="3,3" className="opacity-40" vectorEffect="non-scaling-stroke" />
            )}

            <line x1={meanPos} y1="100" x2={meanPos} y2="0" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="5,5" className="opacity-80" vectorEffect="non-scaling-stroke" />
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

            <div className="absolute bottom-[18px] left-1/2 transform -translate-x-1/2 translate-y-full">
                <span className="text-[8px] font-black text-blue-400/60 uppercase tracking-tighter">
                    IC 95%: {ciLabel}
                </span>
            </div>

            <div className="absolute -bottom-1 right-0 flex flex-col items-end translate-y-full">
                <span className="text-[9px] font-bold text-slate-500">{Math.round(xMin + range)}%</span>
            </div>
        </div>
    );
};
