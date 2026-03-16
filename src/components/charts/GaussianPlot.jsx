import React, { useMemo, useState } from 'react';

export const GaussianPlot = ({ mean, sd, low95, high95, targetScore, currentMean }) => {
    const [hover, setHover] = useState(null);

    const { pathData, areaPathData, range, xMin, targetVal } = useMemo(() => {
        const meanVal = mean ?? 0;
        
        // CORREÇÃO 1: Inferir o Desvio Padrão a partir do Intervalo de Confiança 
        // caso o SD seja 0 ou muito baixo (cenário da simulação do dia atual / bayesiana).
        // Isso impede que a curva Gaussiana vire uma linha super fina e invisível.
        let inferredSd = sd;
        if ((!inferredSd || inferredSd <= 0.1) && low95 != null && high95 != null) {
            inferredSd = Math.max(0.1, (high95 - low95) / 3.92);
        }
        
        // Garante um desvio padrão mínimo visual para desenhar a curva
        const vizSd = (inferredSd != null && inferredSd >= 0.5) ? inferredSd : Math.max(1, inferredSd ?? 3);
        const targetVal = targetScore ?? 70;
        
        // AUDIT FIX: Eixo X Estático (0 a 100) para manter proporção e noção de escala real da prova.
        const xMin = 0;
        const xMax = 100;
        const range = 100;

        // Função Gaussiana Clássica
        const gaussian = (x) => Math.exp(-0.5 * Math.pow((x - meanVal) / vizSd, 2));
        
        const points = [];
        const steps = 100; // Alta resolução para curva suave no eixo fixo

        for (let i = 0; i <= steps; i++) {
            const x = xMin + (range * (i / steps));
            const y = gaussian(x);
            const safeY = isNaN(y) ? 0 : y;
            points.push(`${(x - xMin) / range * 100},${100 - (safeY * 100)}`);
        }
        const path = `M ${points.join(' L ')}`;

        const areaPoints = [];
        // AUDIT FIX: Sombreado agora destaca a ÁREA DE SUCESSO (da Meta até 100%) 
        // em vez de apenas o intervalo de confiança, tornando a probabilidade intuitiva.
        const successStart = Math.max(xMin, targetVal);
        const successEnd = xMax;

        // Ponto inicial da área de sucesso
        const yStart = gaussian(successStart);
        areaPoints.push(`${(successStart - xMin) / range * 100},${100 - (isNaN(yStart) ? 0 : yStart * 100)}`);

        // Preenchimento da área de sucesso seguindo a curva
        for (let i = 0; i <= steps; i++) {
            const x = xMin + (range * (i / steps));
            if (x > successStart && x < successEnd) {
                const y = gaussian(x);
                const safeY = isNaN(y) ? 0 : y;
                areaPoints.push(`${(x - xMin) / range * 100},${100 - (safeY * 100)}`);
            }
        }

        // Ponto final da área de sucesso
        const yEnd = gaussian(successEnd);
        areaPoints.push(`${(successEnd - xMin) / range * 100},${100 - (isNaN(yEnd) ? 0 : yEnd * 100)}`);

        // Fecha o desenho do polígono
        if (areaPoints.length > 0) {
            const lastX = areaPoints[areaPoints.length - 1].split(',')[0];
            const firstX = areaPoints[0].split(',')[0];
            areaPoints.push(`${lastX},100`);
            areaPoints.push(`${firstX},100`);
        }
        
        const areaPath = areaPoints.length > 0 ? `M ${areaPoints.join(' L ')} Z` : '';

        return { pathData: path, areaPathData: areaPath, range, xMin, targetVal };
    }, [mean, sd, low95, high95, targetScore, currentMean]);

    const targetPos = (targetVal - xMin) / range * 100;
    const isTargetVisible = targetPos >= 0 && targetPos <= 100;
    const currentPos = ((currentMean || 0) - xMin) / range * 100;
    const isCurrentVisible = currentMean != null && currentPos >= 0 && currentPos <= 100;

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
                
                {/* 0. Intervalo de Confiança 95% (BUG-8 Fix) */}
                {low95 != null && high95 != null && (
                    <rect
                        x={`${Math.max(0, (low95 - xMin) / range * 100)}%`}
                        y="0"
                        width={`${Math.min(100, (high95 - low95) / range * 100)}%`}
                        height="100"
                        fill="rgba(59, 130, 246, 0.08)"
                        stroke="#3b82f6"
                        strokeWidth="0.5"
                        strokeDasharray="3,3"
                        className="opacity-60"
                    />
                )}

                {/* 1. Primeiro desenha a Sombra Verde (Para ficar no fundo) */}
                <path d={areaPathData} fill="url(#areaGradientGP)" stroke="#22c55e" strokeWidth="2" vectorEffect="non-scaling-stroke" style={{ filter: 'url(#glowPlotGP)' }} />
                
                {/* 2. Depois desenha a Curva Principal Azul (Para ficar na frente da sombra) */}
                <path d={pathData} pathLength="1" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" className="opacity-50 animate-path" vectorEffect="non-scaling-stroke" />

                {/* Linha da Média Atual (Hoje) */}
                {isCurrentVisible && (
                    <g>
                        <line x1={Math.max(0, currentPos)} y1="100" x2={Math.max(0, currentPos)} y2="20" stroke="white" strokeWidth="1" strokeDasharray="3,3" className="opacity-40" vectorEffect="non-scaling-stroke" />
                        <text x={Math.max(0, currentPos)} y={35} fontSize={7} fill="white" className="opacity-40 font-bold" textAnchor="middle">
                            {currentMean.toFixed(1)}%
                        </text>
                    </g>
                )}

                {/* Linha da Projeção Média */}
                <g>
                    <line x1={(mean - xMin) / range * 100} y1="100" x2={(mean - xMin) / range * 100} y2="0" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="5,5" className="opacity-80" vectorEffect="non-scaling-stroke" />
                    <text x={(mean - xMin) / range * 100} y={12} fontSize={8} fill="#93c5fd" className="font-black" textAnchor="middle">
                        {mean.toFixed(1)}%
                    </text>
                </g>

                {/* Linha da Meta */}
                {isTargetVisible && (
                    <g>
                        <line x1={targetPos} y1="100" x2={targetPos} y2="0" stroke="#ef4444" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                        <text x={targetPos} y={targetPos > 90 ? 25 : 12} fontSize={8} fill="#fca5a5" className="font-black" textAnchor={targetPos > 90 ? "end" : "middle"}>
                            {targetVal}%
                        </text>
                    </g>
                )}
            </svg>

            {/* Marcador flutuante de Hover (Mouse em cima) */}
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
