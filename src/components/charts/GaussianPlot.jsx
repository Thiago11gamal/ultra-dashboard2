import React, { useMemo, useState, useId } from 'react';
import { asymmetricGaussian, generateGaussianPoints, normalCDF_complement } from '../../engine/math/gaussian';

export const GaussianPlot = ({ mean, sd, low95, high95, targetScore, currentMean, prob, sdLeft: propSdLeft, sdRight: propSdRight, kdeData, projectedMean }) => {
    const [hover, setHover] = useState(null);
    const clampVisual = (v) => Math.max(0, Math.min(100, v));

    // VISUAL-01 FIX: IDs únicos por instância para evitar conflito entre múltiplos GaussianPlot
    const instanceId = useId().replace(/:/g, '');
    const ID = {
        curveGrad: `gpCurveGradient_${instanceId}`,
        areaGrad: `gpAreaGradient_${instanceId}`,
        failGrad: `gpFailAreaGradient_${instanceId}`,
        glow: `gpGlow_${instanceId}`
    };

    // FIX: Sincronização estrita de HSL com os breakpoints do MonteCarloGauge (<60 Red, <80 Amber)
    const successColor = useMemo(() => {
        const p = prob ?? 0;
        if (p < 60) {
            const t = Math.max(0, p - 40) / 20; 
            const h = 0 + t * 38; // 0 a 38
            return `hsl(${h}, 85%, 55%)`;
        }
        if (p < 80) {
            const t = Math.max(0, p - 60) / 20;
            const h = 38 + Math.pow(t, 3) * 104; 
            return `hsl(${h}, 75%, 50%)`;
        }
        return '#22c55e';
    }, [prob]);

    const { pathData, areaPathData, failAreaPathData, range, xMin, targetVal, xp, yp, asymmetricGaussianFn, median, p25, p75 } = useMemo(() => {
        const meanVal = mean ?? 0;
        const targetVal = targetScore ?? 70;
        const xMin = 0;
        const xMax = 100;
        const range = 100;

        let vizSdLeft = Math.max(1, propSdLeft ?? sd);
        let vizSdRight = Math.max(1, propSdRight ?? sd);

        // BUG-03/MC-03 FIX: Calibração visual da área verde para coincidir com a prop 'prob' do Gauge
        if (prob != null && prob > 0 && prob < 100) {
            const targetProb = prob / 100;
            const m = meanVal;
            const t = targetVal;

            const getGeomProb = (tVal, mVal, sl, sr) => {
                const normFactor = 2 / (sl + sr);
                const pUnderflow = normFactor * sl * normalCDF_complement(mVal / sl);
                const pOverflow = normFactor * sr * normalCDF_complement((100 - mVal) / sr);
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
            // FIX-6: Amortecimento Progressivo (Damping) em 12 itera\u00e7\u00f5es para converg\u00eancia suave
            for (let i = 0; i < 12; i++) {
                const pg = getGeomProb(t, m, sl, sr);
                if (Math.abs(targetProb - pg) <= 0.002) break;
                
                const r = targetProb / Math.max(0.005, pg);
                const adjustment = t < m ? (1 / r) : r;
                
                // Damping Factor: Diminui a cada itera\u00e7\u00e3o para evitar oscila\u00e7\u00f5es (0.85 -> 0.4)
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

        const avgSd = Math.max(1, (vizSdLeft + vizSdRight) / 2);
        
        // VISUAL-FIX: Normalização Dinâmica de Altura.
        // Em vez de achatar a curva até sumir (baseado em 20/avgSd), garantimos que o pico
        // tenha sempre uma altura mínima visível no SVG (ocupando ~40-60% do SVG).
        // Isso permite ver a 'forma' da incerteza mesmo quando o IC é 0-100%.
        const baseHeightFactor = 0.65; 

        const xp = (v) => 2 + ((v - xMin) / range * 96);
        const yp = (yVal) => 100 - (yVal * 92); // Aumentado para 92 para melhor headroom

        let path;
        let pointsForArea = [];
        const finalHF = baseHeightFactor;

        if (kdeData && kdeData.length > 5) {
            // HIGH FIDELITY: Use empirical KDE from simulation
            const DOMAIN_MAX = 100;
            const points = [];
            if (kdeData[0].x > 0) {
                points.push(`${xp(0)},100`);
                points.push(`${xp(kdeData[0].x)},100`);
            }
            // Sincronização: y já vem normalizado 0-1 no KDE
            kdeData.filter(p => p.x >= 0 && p.x <= DOMAIN_MAX).forEach(p => {
                points.push(`${xp(p.x)},${yp(p.y * finalHF)}`);
            });
            const lastDataX = kdeData[kdeData.length - 1].x;
            if (lastDataX < DOMAIN_MAX) {
                points.push(`${xp(lastDataX)},100`);
                points.push(`${xp(DOMAIN_MAX)},100`);
            }
            path = `M ${points.join(' L ')}`;
            pointsForArea = points;
        } else {
            // FALLBACK: Use parametric Asymmetric Gaussian (Pico é 1.0 sem scaling)
            const pts = generateGaussianPoints(xMin, xMax, 100, meanVal, vizSdLeft, vizSdRight, finalHF, xp, yp);
            path = `M ${pts.join(' L ')}`;
            pointsForArea = pts;
        }

        const areaPoints = [];
        const failPoints = [];
        const successStart = Math.max(xMin, targetVal);

        const getYAtX = (pts, xTarget) => {
            let lo = null, hi = null;
            for (const p of pts) {
                const [px, py] = p.split(',').map(Number);
                if (px <= xTarget) lo = { px, py };
                else if (!hi) { hi = { px, py }; break; }
            }
            if (!lo) return hi?.py ?? 100;
            if (!hi) return lo.py;
            const t = (xTarget - lo.px) / (hi.px - lo.px);
            return lo.py + t * (hi.py - lo.py);
        };

        const yAtTargetVisual = (kdeData && kdeData.length > 5)
            ? getYAtX(pointsForArea, xp(successStart))
            : yp(asymmetricGaussian(successStart, meanVal, vizSdLeft, vizSdRight, finalHF));

        areaPoints.push(`${xp(successStart)},${yAtTargetVisual}`);
        pointsForArea.forEach(p => {
            const [xPos, yPos] = p.split(',').map(Number);
            if (xPos > xp(successStart)) areaPoints.push(p);
        });
        if (areaPoints.length > 0) {
            const lastP = areaPoints[areaPoints.length - 1];
            areaPoints.push(`${lastP.split(',')[0]},100`);
            areaPoints.push(`${xp(successStart)},100`);
        }

        failPoints.push(`${xp(xMin)},100`);
        if (kdeData && kdeData.length > 5 && kdeData[0].x > 0) {
            failPoints.push(`${xp(kdeData[0].x)},100`);
        }
        pointsForArea.forEach(p => {
            const [xPos] = p.split(',').map(Number);
            if (xPos <= xp(successStart)) failPoints.push(p);
        });
        failPoints.push(`${xp(successStart)},${yAtTargetVisual}`);
        failPoints.push(`${xp(successStart)},100`);

        const areaPath = areaPoints.length > 2 ? `M ${areaPoints.join(' L ')} Z` : '';
        const failPath = failPoints.length > 2 ? `M ${failPoints.join(' L ')} Z` : '';

        const rawSdLeft = Math.max(1, propSdLeft ?? sd);
        const rawSdRight = Math.max(1, propSdRight ?? sd);
        const lp25 = meanVal - 0.674 * rawSdLeft;
        const lp75 = meanVal + 0.674 * rawSdRight;

        return {
            pathData: path,
            areaPathData: areaPath,
            failAreaPathData: failPath,
            range, xMin, targetVal, xp, yp, asymmetricGaussianFn: (x) => {
                if (kdeData && kdeData.length > 5) {
                    const nearest = kdeData.reduce((best, p) =>
                        Math.abs(p.x - x) < Math.abs(best.x - x) ? p : best
                    );
                    return nearest.y * finalHF; // SYNC: Aplicar o mesmo scaling do path
                }
                return asymmetricGaussian(x, meanVal, vizSdLeft, vizSdRight, finalHF);
            },
            median: meanVal, p25: lp25, p75: lp75
        };
    }, [mean, sd, targetScore, prob, propSdLeft, propSdRight, kdeData]);

    const targetPos = xp(targetVal);
    const meanPos = xp(projectedMean ?? mean ?? 0);
    const currentPos = currentMean != null ? xp(currentMean) : 0;
    const ciHighPx = xp(clampVisual(high95));
    const ciLowPx = xp(clampVisual(low95));
    const isTargetVisible = targetPos >= 0 && targetPos <= 100;
    const isCurrentVisible = currentMean != null && currentPos >= 0 && currentPos <= 100;
    const ciLabel = (high95 - low95) >= 95 ? "Alta incerteza" : `${low95.toFixed(0)}\u2013${high95.toFixed(0)}%`;

    const hojeYPercent = yp(asymmetricGaussianFn(currentMean ?? mean));
    const hojeTop = Math.min(62, Math.max(0, hojeYPercent - 12));
    const collisionMetaMean = isTargetVisible && Math.abs(meanPos - targetPos) < 8;
    const collisionHojeMean = isCurrentVisible && (Math.abs(currentPos - meanPos) < 8 || currentMean === (mean ?? 0));
    const collisionHojeTarget = isCurrentVisible && isTargetVisible && Math.abs(currentPos - targetPos) < 8;

    let tierMean = 1, tierTarget = 1, tierHoje = 1;
    if (collisionHojeMean || collisionMetaMean) {
        if (collisionMetaMean && collisionHojeMean) tierMean = 3;
    }
    if (collisionMetaMean) tierTarget = 2;
    if (collisionHojeTarget || collisionHojeMean) {
        const targetImpact = collisionHojeTarget ? tierTarget : 0;
        const meanImpact = collisionHojeMean ? tierMean : 0;
        tierHoje = Math.max(targetImpact, meanImpact) + 1;
    }

    return (
        <div className="relative w-full h-[140px] mb-12 cursor-crosshair group/chart"
            onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
                const val = xMin + (percentage / 100 * range);
                setHover({ x: percentage, val });
            }}
            onMouseLeave={() => setHover(null)}
        >
            <div className="fade-edge fade-left" />
            <div className="fade-edge fade-right" />
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
                </defs>

                <line x1="0" y1="100" x2="100" y2="100" stroke="#334155" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                {[25, 50, 75].map(tick => (
                    <line key={tick} x1={tick} y1="100" x2={tick} y2="103" stroke="#475569" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                ))}

                {low95 != null && high95 != null && (
                    <rect x={ciLowPx} y="0" width={Math.max(0, ciHighPx - ciLowPx)} height="100" fill="rgba(59, 130, 246, 0.05)" className="transition-opacity duration-300 group-hover/chart:opacity-80" />
                )}

                <path d={failAreaPathData} fill={`url(#${ID.failGrad})`} stroke="#ef4444" strokeWidth="1.2" vectorEffect="non-scaling-stroke" className="opacity-70 transition-all duration-1000" style={{ filter: `url(#${ID.glow})` }} />
                <path d={areaPathData} fill={`url(#${ID.areaGrad})`} stroke={successColor} strokeWidth="1.2" vectorEffect="non-scaling-stroke" className="opacity-80 transition-all duration-1000" style={{ filter: `url(#${ID.glow})` }} />
                <line x1={xp(p25)} y1="100" x2={xp(p25)} y2={yp(asymmetricGaussianFn(p25))} stroke="#3b82f6" strokeWidth="0.5" strokeDasharray="1,1" className="opacity-30 transition-all duration-500" />
                <line x1={xp(p75)} y1="100" x2={xp(p75)} y2={yp(asymmetricGaussianFn(p75))} stroke="#3b82f6" strokeWidth="0.5" strokeDasharray="1,1" className="opacity-30 transition-all duration-500" />
                <path d={pathData} fill="none" stroke={`url(#${ID.curveGrad})`} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" style={{ filter: `url(#${ID.glow})` }} className="transition-all duration-500" />

                {isTargetVisible && <line x1={targetPos} y1="100" x2={targetPos} y2="0" stroke="#ef4444" strokeWidth="3.0" vectorEffect="non-scaling-stroke" className="transition-all duration-500" />}
                <line x1={meanPos} y1="100" x2={meanPos} y2="0" stroke="#3b82f6" strokeWidth="2.2" vectorEffect="non-scaling-stroke" className="transition-all duration-500" />
                {isCurrentVisible && <line x1={currentPos} y1="100" x2={currentPos} y2="0" stroke="white" strokeWidth="1.5" strokeDasharray="2,2" vectorEffect="non-scaling-stroke" className="transition-all duration-500" />}
            </svg>

            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute flex flex-col items-center transition-all duration-500" style={{ left: `${Math.min(meanPos, 90)}%`, top: tierMean === 3 ? '16%' : tierMean === 2 ? '8%' : '0%', transform: meanPos > 90 ? 'translateX(-100%)' : (collisionHojeMean && currentMean === mean ? 'translateX(-55%)' : 'translateX(-50%)'), zIndex: 30 }}>
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.9)]" />
                    <span className="text-[10px] font-black text-blue-400 mt-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{mean.toFixed(1)}%</span>
                    <span className="text-[7px] font-black text-blue-400/70 uppercase tracking-tighter mt-0.5 whitespace-nowrap">Projeção</span>
                </div>
                {isTargetVisible && (
                    <div className="absolute flex flex-col items-center transition-all duration-500" style={{ left: `${Math.min(targetPos, 90)}%`, top: tierTarget === 3 ? '16%' : tierTarget === 2 ? '8%' : '0%', transform: targetPos > 90 ? 'translateX(-100%)' : 'translateX(-50%)', zIndex: 20 }}>
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.9)]" />
                        <span className="text-[10px] font-black text-rose-400 mt-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{targetVal}%</span>
                        <span className="text-[7px] font-black text-rose-500/50 uppercase tracking-tighter mt-0.5">Meta</span>
                    </div>
                )}
                {isTargetVisible && (
                    <div className="absolute flex flex-col items-center opacity-0 group-hover/chart:opacity-100 transition-all duration-500 scale-90 group-hover/chart:scale-100" style={{ left: `${Math.min(targetPos + (100 - targetPos) / 2, 88)}%`, top: '40%', transform: 'translateX(-50%)', filter: `drop-shadow(0 0 10px ${successColor}44)` }}>
                        <span className="text-[40px] font-black transition-colors duration-500 drop-shadow-[0_0_15px_rgba(0,0,0,0.4)]" style={{ color: successColor }}>{prob ? prob.toFixed(prob < 10 ? 1 : 0) : '0'}%</span>
                        <span className="text-[8px] font-black uppercase tracking-[0.2em] leading-none mt-1 opacity-80" style={{ color: successColor }}>Caminho de Sucesso</span>
                    </div>
                )}
                {isCurrentVisible && (
                    <div className="absolute flex flex-col items-center transition-all group-hover/chart:opacity-30 duration-500" style={{ left: `${Math.min(currentPos, 85)}%`, top: tierHoje > 1 ? `calc(${Math.max(0, hojeTop)}% + ${(tierHoje - 1) * 16}px)` : `${Math.max(0, hojeTop)}%`, transform: currentPos > 85 ? 'translateX(-100%)' : 'translateX(-50%)', zIndex: 10 }}>
                        <div className="w-1.5 h-1.5 rounded-full bg-white mb-1" />
                        <span className="text-[10px] font-black text-white/90 px-2 py-0.5 rounded-md bg-slate-900/60 backdrop-blur-md border border-white/20 tracking-tighter shadow-xl">Hoje: {currentMean.toFixed(1)}%</span>
                    </div>
                )}
            </div>

            {hover && (
                <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
                    <div className="absolute h-full w-px bg-white/10" style={{ left: `${hover.x}%` }} />
                    <div className="absolute w-2 h-2 rounded-full bg-white shadow-[0_0_10px_white]" style={{ left: `${hover.x}%`, top: `${yp(asymmetricGaussianFn(hover.val))}%`, transform: 'translate(-50%, -50%)' }} />
                    <div className="absolute bg-slate-900/90 backdrop-blur-xl border border-indigo-500/50 text-white p-2 rounded-xl shadow-2xl flex flex-col items-center min-w-[80px]" style={{ left: `${hover.x}%`, top: `${Math.max(5, yp(asymmetricGaussianFn(hover.val)) - 10)}%`, transform: 'translate(-50%, -100%)' }}>
                        <span className="text-[12px] font-black tracking-tight">{hover.val.toFixed(1)}%</span>
                        <div className="flex items-center gap-1 mt-0.5">
                            <div className={`w-1.5 h-1.5 rounded-full ${hover.val >= targetVal ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                            <span className={`text-[8px] font-black uppercase tracking-widest ${hover.val >= targetVal ? 'text-emerald-400' : 'text-slate-400'}`}>{hover.val >= targetVal ? 'Zona de Sucesso' : 'Abaixo da Meta'}</span>
                        </div>
                    </div>
                </div>
            )}

            <div className="absolute -bottom-5 inset-x-0 h-4 pointer-events-none">
                {[0, 20, 40, 60, 80, 100].map(t => (
                    <span key={t} className="absolute text-[8px] font-bold text-slate-500/60 uppercase tracking-tighter" style={{ left: `${t}%`, transform: t === 0 ? 'translateX(0%)' : t === 100 ? 'translateX(-100%)' : 'translateX(-50%)' }}>{t}%</span>
                ))}
            </div>

            <div className="absolute -bottom-9 transform -translate-y-1/2 flex items-center gap-1.5 opacity-60 group-hover/chart:opacity-100 transition-opacity" style={{ left: `${Math.min(ciLowPx, 75)}%`, maxWidth: '25%' }}>
                <div className="w-2 h-2 rounded-full bg-blue-500/20 border border-blue-400/40" />
                <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest whitespace-nowrap">IC 95%: {ciLabel}</span>
            </div>
        </div>
    );
};
