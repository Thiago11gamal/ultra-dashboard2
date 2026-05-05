import React, { useMemo, useState, useId } from 'react';
import { asymmetricGaussian, generateGaussianPoints, normalCDF_complement } from '../../engine/math/gaussian';
import { formatDuration } from '../../utils/dateHelper';
import { formatValue } from '../../utils/scoreHelper';

export const GaussianPlot = ({ mean, sd, low95, high95, targetScore, currentMean, prob, sdLeft: propSdLeft, sdRight: propSdRight, kdeData, projectedMean, minScore = 0, maxScore = 100, unit = '%' }) => {
    const [hover, setHover] = useState(null);

    const instanceId = useId().replace(/:/g, '');
    const ID = {
        curveGrad: `gpCurveGradient_${instanceId}`,
        areaGrad: `gpAreaGradient_${instanceId}`,
        failGrad: `gpFailAreaGradient_${instanceId}`,
        glow: `gpGlow_${instanceId}`,
        chartClip: `chartClip_${instanceId}`
    };

    const successColor = '#22c55e';

    const {
        pathData, areaPathData, failAreaPathData, range, xMin, targetVal, xp,
        domainMin, domainMax, curveY
    } = useMemo(() => {
        const meanVal = mean ?? 0;
        const targetVal = targetScore ?? 70;

        const domainMin = minScore;
        let rawMax = unit === '%' ? maxScore : Math.max(maxScore, targetVal * 1.05, meanVal * 1.05);

        const domainMax = rawMax;
        const xMin = domainMin;
        const range = domainMax - domainMin;

        let vizSdLeft = Math.max(1, propSdLeft ?? sd);
        let vizSdRight = Math.max(1, propSdRight ?? sd);

        const hasValidKDE = kdeData && kdeData.length > 5;

        // Geometria de distorção (se não houver KDE)
        if (!hasValidKDE && prob != null && prob > 0 && prob < 100) {
            const targetProb = prob / 100;
            const m = meanVal;
            const t = targetVal;

            const getGeomProb = (tVal, mVal, sl, sr) => {
                const normFactor = 2 / (sl + sr);
                const pUnderflow = normFactor * sl * normalCDF_complement((mVal - domainMin) / sl);
                const pOverflow = normFactor * sr * normalCDF_complement((domainMax - mVal) / sr);
                const truncatedTotal = Math.max(0.01, 1 - pUnderflow - pOverflow);

                let pSuccess;
                if (tVal >= mVal) {
                    const pRightSuccess = normFactor * sr * normalCDF_complement((tVal - mVal) / sr);
                    pSuccess = Math.max(0, pRightSuccess - pOverflow);
                } else {
                    const pLeftFail = normFactor * sl * normalCDF_complement((mVal - tVal) / sl);
                    const totalLeftArea = normFactor * sl * 0.5;
                    const totalRightArea = normFactor * sr * 0.5;
                    pSuccess = Math.max(0, (totalLeftArea - pLeftFail) + (totalRightArea - pOverflow));
                }
                return pSuccess / truncatedTotal;
            };

            let sl = vizSdLeft, sr = vizSdRight;
            for (let i = 0; i < 12; i++) {
                const pg = getGeomProb(t, m, sl, sr);
                if (isNaN(pg) || Math.abs(targetProb - pg) <= 0.002) break;

                const r = targetProb / Math.max(0.005, pg);
                const adjustment = t < m ? (1 / r) : r;
                const damp = 0.85 * Math.pow(0.93, i);
                const appliedAdj = 1 + (adjustment - 1) * damp;

                const safeR = Math.min(1.5, Math.max(0.66, appliedAdj));
                const currentCap = targetProb > 0.95 ? 8 : 4;

                if (t < m) {
                    sl = Math.min(vizSdLeft * currentCap, Math.max(1, sl * safeR));
                } else {
                    sr = Math.min(vizSdRight * currentCap, Math.max(1, sr * safeR));
                }
            }
            vizSdLeft = sl; vizSdRight = sr;
        }

        const baseHeightFactor = 0.65;
        const xp = (v) => 2 + ((v - xMin) / range * 96);
        const yp = (yVal) => 100 - (yVal * 90);

        let path;
        let pointsForArea = [];

        if (hasValidKDE) {
            const points = [];
            points.push(`${xp(kdeData[0].x)},100`);
            kdeData.forEach(p => {
                points.push(`${xp(p.x)},${yp(p.y * baseHeightFactor)}`);
            });
            points.push(`${xp(kdeData[kdeData.length - 1].x)},100`);
            path = `M ${points.join(' L ')}`;
            pointsForArea = points;
        } else {
            const pts = generateGaussianPoints(xMin, domainMax, 100, meanVal, vizSdLeft, vizSdRight, baseHeightFactor, xp, yp);
            path = `M ${pts.join(' L ')}`;
            pointsForArea = pts;
        }

        const getYAtX = (pts, xTarget) => {
            let lo = null, hi = null;
            for (const p of pts) {
                const [px, py] = p.split(',').map(Number);
                if (px <= xTarget) lo = { px, py };
                else if (!hi) { hi = { px, py }; break; }
            }
            if (!lo) return hi?.py ?? 100;
            if (!hi) return lo.py;
            if (hi.px === lo.px) return lo.py;
            const t = (xTarget - lo.px) / (hi.px - lo.px);
            return lo.py + t * (hi.py - lo.py);
        };

        const successStart = Math.max(xMin, targetVal);
        const yAtTargetVisual = hasValidKDE ? getYAtX(pointsForArea, xp(successStart)) : yp(asymmetricGaussian(successStart, meanVal, vizSdLeft, vizSdRight, baseHeightFactor));

        const areaPoints = [];
        const failPoints = [];

        areaPoints.push(`${xp(successStart)},${yAtTargetVisual}`);
        pointsForArea.forEach(p => {
            const [xPos] = p.split(',').map(Number);
            if (xPos > xp(successStart)) areaPoints.push(p);
        });
        if (areaPoints.length > 0) {
            const lastP = areaPoints[areaPoints.length - 1];
            areaPoints.push(`${lastP.split(',')[0]},100`);
            areaPoints.push(`${xp(successStart)},100`);
        }

        failPoints.push(`${pointsForArea[0].split(',')[0]},100`);
        pointsForArea.forEach(p => {
            const [xPos] = p.split(',').map(Number);
            if (xPos <= xp(successStart)) failPoints.push(p);
        });
        failPoints.push(`${xp(successStart)},${yAtTargetVisual}`);
        failPoints.push(`${xp(successStart)},100`);

        const areaPath = areaPoints.length > 2 ? `M ${areaPoints.join(' L ')} Z` : '';
        const failPath = failPoints.length > 2 ? `M ${failPoints.join(' L ')} Z` : '';

        // FUNÇÃO MATADORA DE BUGS: Descobre exatamente o 'Top Y' do pixel da curva para qualquer valor X.
        const calculateCurveY = (x) => {
            if (hasValidKDE) return getYAtX(pointsForArea, xp(x));
            return yp(asymmetricGaussian(x, meanVal, vizSdLeft, vizSdRight, baseHeightFactor));
        };

        return {
            pathData: path, areaPathData: areaPath, failAreaPathData: failPath,
            range, xMin, targetVal, xp,
            domainMin, domainMax, curveY: calculateCurveY
        };
    }, [mean, sd, targetScore, prob, propSdLeft, propSdRight, kdeData, minScore, maxScore, unit]);

    // POSIÇÕES EXATAS (X e Y acoplados perfeitamente à montanha)
    const targetPos = xp(targetVal);
    const targetY = curveY(targetVal);

    const meanPos = xp(projectedMean ?? mean ?? 0);
    const meanY = curveY(projectedMean ?? mean ?? 0);

    const currentPos = currentMean != null ? xp(currentMean) : 0;
    const currentY = currentMean != null ? curveY(currentMean) : 100;

    const ciHighPx = xp(Math.max(domainMin, Math.min(domainMax, high95)));
    const ciLowPx = xp(Math.max(domainMin, Math.min(domainMax, low95)));

    const isTargetVisible = targetPos >= 2 && targetPos <= 98;
    const isCurrentVisible = currentMean != null && currentPos >= 2 && currentPos <= 98;

    const saturation = range > 0 ? (high95 - low95) / range : 1;
    const ciLabel = saturation > 0.8 ? "ALTA INCERTEZA" : saturation > 0.4 ? "ESTIMATIVA" : "CONFIÁVEL";

    // SISTEMA ANTI-SOBREPOSIÇÃO INTELIGENTE PARA RÓTULOS
    const resolvedLabels = useMemo(() => {
        const items = [];
        if (isTargetVisible) items.push({ id: 'target', x: targetPos });

        // Se a Projeção e o Hoje forem no mesmo pixel exato, fundimos a UI para evitar poluição
        const hideMean = isCurrentVisible && Math.abs(currentPos - meanPos) < 2.5;
        if (!hideMean) items.push({ id: 'mean', x: meanPos });
        if (isCurrentVisible) items.push({ id: 'today', x: currentPos });

        const sorted = [...items].sort((a, b) => a.x - b.x);
        const THRESHOLD = 20; // Aumentado de 16 para 20 para evitar sobreposição de rótulos próximos

        sorted.forEach((item, i) => {
            item.level = 0;
            if (i > 0) {
                const prev = sorted[i - 1];
                if (item.x - prev.x < THRESHOLD) {
                    item.level = prev.level + 1; // Empurra o rótulo para cima
                }
            }
        });

        const res = { hideMean };
        sorted.forEach(item => res[item.id] = item.level);
        return res;
    }, [targetPos, meanPos, currentPos, isTargetVisible, isCurrentVisible]);

    // AUMENTAMOS AQUI: A distância base agora é 45px (antes era 20px). 
    // Os níveis superiores ganham +45px de altura extra.
    const getLabelTop = (yPercent, level) => `calc(${yPercent}% - ${45 + level * 45}px)`;

    return (
        <div className="relative w-full h-[220px] mt-12 mb-6 cursor-crosshair group/chart"
            onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const percentage = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
                const val = Math.max(xMin, Math.min(domainMax, xMin + ((percentage - 2) / 96) * range));
                setHover({ x: xp(val), val });
            }}
            onMouseLeave={() => setHover(null)}
        >
            <div style={{
                position: 'absolute',
                width: '40px',
                top: 0,
                bottom: 0,
                pointerEvents: 'none',
                zIndex: 10,
                left: 0,
                background: 'linear-gradient(to right, rgb(15, 23, 42), transparent)'
            }} />
            <div style={{
                position: 'absolute',
                width: '40px',
                top: 0,
                bottom: 0,
                pointerEvents: 'none',
                zIndex: 10,
                right: 0,
                background: 'linear-gradient(to left, rgb(15, 23, 42), transparent)'
            }} />

            {/* RENDERIZAÇÃO DA MONTANHA (SVG Base) */}
            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" className="overflow-visible">
                <defs>
                    <linearGradient id={ID.curveGrad} x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="50%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#2dd4bf" />
                    </linearGradient>
                    <linearGradient id={ID.areaGrad} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={successColor} stopOpacity={0.7} />
                        <stop offset="100%" stopColor={successColor} stopOpacity={0.2} />
                    </linearGradient>
                    <linearGradient id={ID.failGrad} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(239, 68, 68, 0.5)" />
                        <stop offset="100%" stopColor="rgba(239, 68, 68, 0.1)" />
                    </linearGradient>
                    <filter id={ID.glow} x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="1.2" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                    <clipPath id={ID.chartClip}>
                        <rect x="0" y="-50" width="100" height="200" />
                    </clipPath>
                </defs>

                <line x1="0" y1="100" x2="100" y2="100" stroke="#334155" strokeWidth="1" vectorEffect="non-scaling-stroke" />

                {low95 != null && high95 != null && (
                    <rect x={ciLowPx} y="0" width={Math.max(0, ciHighPx - ciLowPx)} height="100" fill="rgba(59, 130, 246, 0.05)" className="transition-opacity duration-300 group-hover/chart:opacity-80" clipPath={`url(#${ID.chartClip})`} />
                )}

                <path d={failAreaPathData} fill={`url(#${ID.failGrad})`} stroke="#ef4444" strokeWidth="1.2" vectorEffect="non-scaling-stroke" className="opacity-70 transition-all duration-1000" style={{ filter: `url(#${ID.glow})` }} clipPath={`url(#${ID.chartClip})`} />
                <path d={areaPathData} fill={`url(#${ID.areaGrad})`} stroke={successColor} strokeWidth="1.2" vectorEffect="non-scaling-stroke" className="opacity-80 transition-all duration-1000" style={{ filter: `url(#${ID.glow})` }} clipPath={`url(#${ID.chartClip})`} />

                <path d={pathData} fill="none" stroke={`url(#${ID.curveGrad})`} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" style={{ filter: `url(#${ID.glow})` }} className="transition-all duration-500" clipPath={`url(#${ID.chartClip})`} />

                {/* LINHAS VERTICAIS QUE DESCEM DO PONTO NA CURVA ATÉ O CHÃO */}
                {isTargetVisible && <line x1={targetPos} y1="100" x2={targetPos} y2={targetY} stroke="#ef4444" strokeWidth="1.5" strokeDasharray="2,3" vectorEffect="non-scaling-stroke" className="transition-all duration-500" />}
                {!resolvedLabels.hideMean && <line x1={meanPos} y1="100" x2={meanPos} y2={meanY} stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="2,3" vectorEffect="non-scaling-stroke" className="transition-all duration-500" />}
                {isCurrentVisible && <line x1={currentPos} y1="100" x2={currentPos} y2={currentY} stroke="#ffffff" strokeWidth="1.5" strokeDasharray="2,3" vectorEffect="non-scaling-stroke" className="transition-all duration-500" />}
            </svg>

            {/* RENDERIZAÇÃO DOS PONTOS CIRCULARES (Fora do SVG para evitar distorção de elipse) */}
            <div className="absolute inset-0 pointer-events-none">
                {isTargetVisible && (
                    <div className="absolute w-2.5 h-2.5 rounded-full bg-rose-500 border-2 border-slate-900 shadow-[0_0_8px_rgba(244,63,94,0.8)] transition-all duration-500"
                        style={{ left: `${targetPos}%`, top: `${targetY}%`, transform: 'translate(-50%, -50%)', zIndex: 15 }} />
                )}
                {!resolvedLabels.hideMean && (
                    <div className="absolute w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-slate-900 shadow-[0_0_8px_rgba(59,130,246,0.8)] transition-all duration-500"
                        style={{ left: `${meanPos}%`, top: `${meanY}%`, transform: 'translate(-50%, -50%)', zIndex: 15 }} />
                )}
                {isCurrentVisible && (
                    <div className="absolute w-3 h-3 rounded-full bg-white border-2 border-slate-900 shadow-[0_0_12px_white] transition-all duration-500"
                        style={{ left: `${currentPos}%`, top: `${currentY}%`, transform: 'translate(-50%, -50%)', zIndex: 25 }} />
                )}
            </div>

            {/* RÓTULOS MAIS ALTOS COM "PINOS" DE LIGAÇÃO */}
            <div className="absolute inset-0 pointer-events-none">
                {!resolvedLabels.hideMean && (
                    <div className="absolute flex flex-col items-center transition-all duration-500"
                        style={{ left: `${Math.max(4, Math.min(meanPos, 96))}%`, top: getLabelTop(meanY, resolvedLabels.mean || 0), transform: 'translateX(-50%)', zIndex: 30 }}>
                        <div className="flex flex-col items-center bg-blue-500/10 backdrop-blur-md px-2 py-0.5 rounded-lg border border-blue-500/30 shadow-lg">
                            <span className="text-[11px] font-black text-blue-400 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{unit === 'horas' ? formatDuration(projectedMean ?? mean ?? 0) : unit === '%' ? formatValue(projectedMean ?? mean ?? 0) : (projectedMean ?? mean ?? 0)}{unit}</span>
                            <span className="text-[7px] font-black text-blue-300 uppercase tracking-widest opacity-80">Projeção</span>
                        </div>
                        {/* Linha que conecta a caixa flutuante até a bolinha da curva */}
                        <div className="w-px bg-blue-500/40 absolute top-full mt-0.5" style={{ height: `${12 + (resolvedLabels.mean || 0) * 45}px` }} />
                    </div>
                )}

                {isTargetVisible && (
                    <div className="absolute flex flex-col items-center transition-all duration-500"
                        style={{ left: `${Math.max(4, Math.min(targetPos, 96))}%`, top: getLabelTop(targetY, resolvedLabels.target || 0), transform: 'translateX(-50%)', zIndex: 20 }}>
                        <div className="flex flex-col items-center bg-rose-500/10 backdrop-blur-md px-2 py-0.5 rounded-lg border border-rose-500/30 shadow-lg">
                             <span className="text-[11px] font-black text-rose-400 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{unit === 'horas' ? formatDuration(targetVal) : unit === '%' ? formatValue(targetVal) : targetVal}{unit}</span>
                            <span className="text-[7px] font-black text-rose-300 uppercase tracking-widest opacity-80">Meta</span>
                        </div>
                        {/* Linha que conecta a caixa flutuante até a bolinha da curva */}
                        <div className="w-px bg-rose-500/40 absolute top-full mt-0.5" style={{ height: `${12 + (resolvedLabels.target || 0) * 45}px` }} />
                    </div>
                )}

                {isCurrentVisible && (
                    <div className="absolute flex flex-col items-center transition-all duration-500 group-hover/chart:opacity-40"
                        style={{ left: `${Math.max(4, Math.min(currentPos, 96))}%`, top: getLabelTop(currentY, resolvedLabels.today || 0), transform: 'translateX(-50%)', zIndex: 40 }}>
                        <div className="flex flex-col items-center px-2 py-1 rounded-lg bg-slate-900/95 backdrop-blur-xl border border-white/20 shadow-xl">
                            <span className="text-[11px] leading-none font-black text-white">{unit === 'horas' ? formatDuration(currentMean ?? 0) : unit === '%' ? formatValue(currentMean ?? 0) : (currentMean ?? 0)}{unit}</span>
                            {resolvedLabels.hideMean && <span className="text-[7px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Hoje/Projeção</span>}
                            {!resolvedLabels.hideMean && <span className="text-[7px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Hoje</span>}
                        </div>
                        {/* Linha que conecta a caixa flutuante até a bolinha da curva */}
                        <div className="w-px bg-white/40 absolute top-full mt-0.5" style={{ height: `${15 + (resolvedLabels.today || 0) * 45}px` }} />
                    </div>
                )}

                {isTargetVisible && (
                    <div className="absolute flex flex-col items-center opacity-0 group-hover/chart:opacity-100 transition-all duration-500 scale-90 group-hover/chart:scale-100" style={{ left: `${Math.min(targetPos + (100 - targetPos) / 2, 88)}%`, top: '40%', transform: 'translateX(-50%)', filter: `drop-shadow(0 0 10px ${successColor}44)` }}>
                        <span className="text-[40px] font-black transition-colors duration-500 drop-shadow-[0_0_15px_rgba(0,0,0,0.4)]" style={{ color: successColor }}>{formatValue(prob)}%</span>
                        <span className="text-[8px] font-black uppercase tracking-[0.2em] leading-none mt-1 opacity-80" style={{ color: successColor }}>Caminho de Sucesso</span>
                    </div>
                )}
            </div>

            {hover && (
                <div className="absolute inset-0 pointer-events-none z-50">
                    <div className="absolute h-full w-px bg-white/10" style={{ left: `${hover.x}%` }} />
                    <div className="absolute w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_12px_white]" style={{ left: `${hover.x}%`, top: `${Math.max(0, curveY(hover.val))}%`, transform: 'translate(-50%, -50%)' }} />
                    <div className="absolute bg-slate-900/95 backdrop-blur-2xl border border-indigo-500/40 text-white px-2.5 py-1.5 rounded-xl shadow-2xl flex flex-col items-center min-w-[90px]" style={{ left: `${hover.x}%`, top: `${Math.max(15, curveY(hover.val) - 10)}%`, transform: 'translate(-50%, -100%)' }}>
                        <span className="text-[15px] font-black tracking-tight leading-none">{unit === 'horas' ? formatDuration(hover.val) : unit === '%' ? formatValue(hover.val) : hover.val}{unit}</span>
                        <div className="flex items-center gap-1 mt-1">
                            <div className={`w-1.5 h-1.5 rounded-full ${hover.val >= targetVal ? 'bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.6)]' : 'bg-slate-500'}`} />
                            <span className={`text-[7.5px] font-black uppercase tracking-widest ${hover.val >= targetVal ? 'text-emerald-400' : 'text-slate-500'}`}>{hover.val >= targetVal ? 'Zona de Sucesso' : 'Abaixo da Meta'}</span>
                        </div>
                    </div>
                </div>
            )}

            <div className="absolute -bottom-5 inset-x-0 h-4 pointer-events-none">
                {[0, 0.25, 0.5, 0.75, 1.0].map(f => {
                    const tickVal = domainMin + f * (domainMax - domainMin);
                    const pct = 2 + f * 96;
                    return (
                        <span key={f} className="absolute text-[10px] font-black text-slate-400 uppercase tracking-tighter" style={{ left: `${pct}%`, transform: f === 0 ? 'translateX(0%)' : f === 1.0 ? 'translateX(-100%)' : 'translateX(-50%)' }}>
                            {unit === '%' ? formatValue(tickVal) : Number.isInteger(tickVal) ? tickVal : tickVal.toFixed(2)}{unit}
                        </span>
                    );
                })}
            </div>

            {/* IC 95% - Posicionado de forma mais segura dentro do gráfico, no topo esquerdo */}
            <div className="absolute top-2 left-4 flex items-center gap-2 opacity-60 group-hover/chart:opacity-100 transition-opacity bg-slate-900/40 backdrop-blur-sm px-2 py-1 rounded-md border border-white/5">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500/40 border border-blue-400/50" />
                <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest whitespace-nowrap">IC 95%: {ciLabel}</span>
            </div>
        </div>
    );
};
