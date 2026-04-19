import React, { useMemo, useState, useId } from 'react';
import { asymmetricGaussian, generateGaussianPoints, normalCDF_complement } from '../../engine/math/gaussian';

export const GaussianPlot = ({ mean, sd, low95, high95, targetScore, currentMean, prob, sdLeft: propSdLeft, sdRight: propSdRight, kdeData, projectedMean, minScore = 0, maxScore = 100, unit = '%' }) => {
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

    // VISUAL-02 FIX: "Paradoxo do Vermelho" Resolvido
    // A área à direita da meta (Caminho de Sucesso) recebe uma cor positiva fixa.
    // Assim, contrasta sempre perfeitamente com a zona de falha (vermelha), independentemente da probabilidade atual.
    const successColor = '#22c55e'; // Verde Esmeralda

    const { pathData, areaPathData, failAreaPathData, range, xMin, targetVal, xp, yp, asymmetricGaussianFn, median, p25, p75, domainMin, domainMax } = useMemo(() => {
        const meanVal = mean ?? 0;
        const targetVal = targetScore ?? 70;

        // SCALE-BOUNDS FIX: Dynamic domain — adds 10% right-margin so target line is never cut off
        const domainMin = Math.min(minScore, meanVal, targetVal);
        const rawMax = Math.max(maxScore, targetVal * 1.05, meanVal * 1.05);
        const domainMax = rawMax;
        const xMin = domainMin;
        const range = domainMax - domainMin;

        let vizSdLeft = Math.max(1, propSdLeft ?? sd);
        let vizSdRight = Math.max(1, propSdRight ?? sd);

        // FIX: Ignora a distorção (solver geométrico) caso estejamos usando o KDE verdadeiro
        const hasValidKDE = kdeData && kdeData.length > 5;

        if (!hasValidKDE && prob != null && prob > 0 && prob < 100) {
            const targetProb = prob / 100;
            const m = meanVal;
            const t = targetVal;

            const getGeomProb = (tVal, mVal, sl, sr) => {
                const normFactor = 2 / (sl + sr);
                // FIX MATEMÁTICO (Underflow Paradox): Usamos (mVal - domainMin) em vez de (mVal / sl) 
                // para garantir que a regressão geométrica da Gaussiana continue válida caso o minScore da prova 
                // não seja zero (ex: provas que começam com 50 pontos básicos).
                const pUnderflow = normFactor * sl * normalCDF_complement((mVal - domainMin) / sl);
                // SCALE-BOUNDS FIX: overflow uses domainMax instead of hardcoded 100
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

                // FIX: Paragem de emergência para NaN prevenindo corrupção em cascata
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

        const avgSd = Math.max(1, (vizSdLeft + vizSdRight) / 2);
        // FIX: Utilizando quase 100% da área do SVG para não "esmagar" a distribuição ao meio
        const baseHeightFactor = 0.95;
        // SCALE-BOUNDS FIX: xp maps any value in [domainMin, domainMax] to SVG [2, 98]
        const xp = (v) => 2 + ((v - xMin) / range * 96);
        const yp = (yVal) => 100 - (yVal * 92);

        let path;
        let pointsForArea = [];
        const finalHF = baseHeightFactor;

        if (kdeData && kdeData.length > 5) {
            // VISUAL FIX 2: Deixar a curva fluir para ALÉM do Viewport `<svg>`
            // Ocultado o corte artificial (DOMAIN_MIN/MAX) que causava as 'paredes verticais'.
            // O `preserveAspectRatio="none"` do CSS vai naturalmente e perfeitamente cortar 
            // a linha onde a tela acaba, enquanto a linha segue linear fora dela.
            const points = [];
            points.push(`${xp(kdeData[0].x)},100`);
            kdeData.forEach(p => {
                points.push(`${xp(p.x)},${yp(p.y * finalHF)}`);
            });
            points.push(`${xp(kdeData[kdeData.length - 1].x)},100`);
            path = `M ${points.join(' L ')}`;
            pointsForArea = points;
        } else {
            const pts = generateGaussianPoints(xMin, domainMax, 100, meanVal, vizSdLeft, vizSdRight, finalHF, xp, yp);
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

            // FIX: Prevenção de divisão por zero (impede que 't' se torne NaN e colapse o Path SVG)
            if (hi.px === lo.px) return lo.py;

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

        // Ancora no infinito/ponto final disponível
        failPoints.push(`${pointsForArea[0].split(',')[0]},100`);

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
                    return nearest.y * finalHF;
                }
                return asymmetricGaussian(x, meanVal, vizSdLeft, vizSdRight, finalHF);
            },
            median: meanVal, p25: lp25, p75: lp75,
            // expose domain for use outside useMemo
            domainMin, domainMax,
        };
    }, [mean, sd, targetScore, prob, propSdLeft, propSdRight, kdeData, projectedMean, currentMean, minScore, maxScore]);

    const targetPos = xp(targetVal);
    const meanPos = xp(projectedMean ?? mean ?? 0);
    const currentPos = currentMean != null ? xp(currentMean) : 0;
    const ciHighPx = xp(Math.max(domainMin, Math.min(domainMax, high95)));
    const ciLowPx = xp(Math.max(domainMin, Math.min(domainMax, low95)));
    // SCALE-BOUNDS FIX: visibility check uses SVG coordinate space (2..98)
    const isTargetVisible = targetPos >= 2 && targetPos <= 98;
    const isCurrentVisible = currentMean != null && currentPos >= 2 && currentPos <= 98;
    const ciLabel = (high95 - low95) >= (domainMax - domainMin) * 0.95 ? "Alta incerteza" : `${low95.toFixed(0)}–${high95.toFixed(0)}${unit}`;

    const hojeYPercent = yp(asymmetricGaussianFn(currentMean ?? mean ?? 0));
    const hojeTop = Math.max(0, hojeYPercent - 12);
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

    // RIGOR-LABEL-FIX: Se o label "Hoje" estiver muito no topo do gráfico (curva alta) 
    // e houver colisão horizontal, empurramos ele para baixo para não bater no label de Projeção.
    // D-10 FIX: Garantir Math.max(0, hojeTop) antes de qualquer operação de tier.
    const safeHojeTop = Math.max(0, hojeTop);
    const isHighCurve = safeHojeTop < 22;
    const finalHojeTop = (isHighCurve && (collisionHojeMean || collisionHojeTarget))
        ? (22 + (tierHoje - 1) * 15 + '%')
        : (tierHoje > 1 ? `calc(${safeHojeTop}% + ${(tierHoje - 1) * 16}px)` : `${safeHojeTop}%`);

    return (
        <div className="relative w-full h-[140px] mb-12 cursor-crosshair group/chart"
            onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));

                // VISUAL FIX (Hover Tracker Drift): 
                // O SVG renderiza o gráfico de 2% a 98% para garantir espaço pras bordas da linha. 
                // Precisamos reverter essa geometria proporcional para ler exatamente o dado sob o mouse.
                const val = Math.max(xMin, Math.min(domainMax, xMin + ((percentage - 2) / 96) * range));
                setHover({ x: xp(val), val });
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
                    <clipPath id={`chartClip_${instanceId}`}>
                        {/* 🌟 SOLUÇÃO VISUAL: Corta a linha e a área horizontalmente em 0 e 100 absoluto do SVG, 
                            mas deixa 50 unidades de folga em Y para não degolar os brilhos da linha no teto */}
                        <rect x="0" y="-50" width="100" height="200" />
                    </clipPath>
                </defs>

                <line x1="0" y1="100" x2="100" y2="100" stroke="#334155" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                {[26, 50, 74].map(tick => (
                    <line key={tick} x1={tick} y1="100" x2={tick} y2="103" stroke="#475569" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                ))}

                {low95 != null && high95 != null && (
                    <rect x={ciLowPx} y="0" width={Math.max(0, ciHighPx - ciLowPx)} height="100" fill="rgba(59, 130, 246, 0.05)" className="transition-opacity duration-300 group-hover/chart:opacity-80" clipPath={`url(#chartClip_${instanceId})`} />
                )}

                <path d={failAreaPathData} fill={`url(#${ID.failGrad})`} stroke="#ef4444" strokeWidth="1.2" vectorEffect="non-scaling-stroke" className="opacity-70 transition-all duration-1000" style={{ filter: `url(#${ID.glow})` }} clipPath={`url(#chartClip_${instanceId})`} />
                <path d={areaPathData} fill={`url(#${ID.areaGrad})`} stroke={successColor} strokeWidth="1.2" vectorEffect="non-scaling-stroke" className="opacity-80 transition-all duration-1000" style={{ filter: `url(#${ID.glow})` }} clipPath={`url(#chartClip_${instanceId})`} />
                <line x1={xp(p25)} y1="100" x2={xp(p25)} y2={yp(asymmetricGaussianFn(p25))} stroke="#3b82f6" strokeWidth="0.5" strokeDasharray="1,1" className="opacity-30 transition-all duration-500" clipPath={`url(#chartClip_${instanceId})`} />
                <line x1={xp(p75)} y1="100" x2={xp(p75)} y2={yp(asymmetricGaussianFn(p75))} stroke="#3b82f6" strokeWidth="0.5" strokeDasharray="1,1" className="opacity-30 transition-all duration-500" clipPath={`url(#chartClip_${instanceId})`} />
                <path d={pathData} fill="none" stroke={`url(#${ID.curveGrad})`} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" style={{ filter: `url(#${ID.glow})` }} className="transition-all duration-500" clipPath={`url(#chartClip_${instanceId})`} />

                {isTargetVisible && <line x1={targetPos} y1="100" x2={targetPos} y2="0" stroke="#ef4444" strokeWidth="3.0" vectorEffect="non-scaling-stroke" className="transition-all duration-500" />}
                <line x1={meanPos} y1="100" x2={meanPos} y2="0" stroke="#3b82f6" strokeWidth="2.2" vectorEffect="non-scaling-stroke" className="transition-all duration-500" />
                {isCurrentVisible && <line x1={currentPos} y1="100" x2={currentPos} y2="0" stroke="white" strokeWidth="1.5" strokeDasharray="2,2" vectorEffect="non-scaling-stroke" className="transition-all duration-500" />}
            </svg>

            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute flex flex-col items-center transition-all duration-500" style={{ left: `${Math.min(meanPos, 90)}%`, top: tierMean === 3 ? '16%' : tierMean === 2 ? '8%' : '0%', transform: meanPos > 90 ? 'translateX(-100%)' : (collisionHojeMean && currentMean === mean ? 'translateX(-55%)' : 'translateX(-50%)'), zIndex: 30 }}>
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.9)]" />
                    <span className="text-[10px] font-black text-blue-400 mt-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{mean.toFixed(1)}{unit}</span>
                    <span className="text-[7px] font-black text-blue-400/70 uppercase tracking-tighter mt-0.5 whitespace-nowrap">Projeção</span>
                </div>
                {isTargetVisible && (
                    <div className="absolute flex flex-col items-center transition-all duration-500" style={{ left: `${Math.min(targetPos, 90)}%`, top: tierTarget === 3 ? '16%' : tierTarget === 2 ? '8%' : '0%', transform: targetPos > 90 ? 'translateX(-100%)' : 'translateX(-50%)', zIndex: 20 }}>
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.9)]" />
                        <span className="text-[10px] font-black text-rose-400 mt-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{targetVal}{unit}</span>
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
                    <div className="absolute flex flex-col items-center transition-all group-hover/chart:opacity-30 duration-500" style={{ left: `${Math.max(2, Math.min(currentPos, 90))}%`, top: finalHojeTop, transform: currentPos > 85 ? 'translateX(-100%)' : 'translateX(-50%)', zIndex: 10 }}>
                        <div className="w-1.5 h-1.5 rounded-full bg-white mb-1 shadow-[0_0_8px_white]" />
                        <span className="text-[10px] font-black text-white/90 px-2 py-0.5 rounded-md bg-slate-900/80 backdrop-blur-md border border-white/20 tracking-tighter shadow-xl whitespace-nowrap">Hoje: {(currentMean ?? 0).toFixed(1)}{unit}</span>
                    </div>
                )}
            </div>

            {hover && (
                <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
                    <div className="absolute h-full w-px bg-white/10" style={{ left: `${hover.x}%` }} />
                    <div className="absolute w-2 h-2 rounded-full bg-white shadow-[0_0_10px_white]" style={{ left: `${hover.x}%`, top: `${Math.max(0, yp(asymmetricGaussianFn(hover.val)))}%`, transform: 'translate(-50%, -50%)' }} />
                    <div className="absolute bg-slate-900/90 backdrop-blur-xl border border-indigo-500/50 text-white p-2 rounded-xl shadow-2xl flex flex-col items-center min-w-[80px]" style={{ left: `${hover.x}%`, top: `${Math.max(5, yp(asymmetricGaussianFn(hover.val)) - 10)}%`, transform: 'translate(-50%, -100%)' }}>
                        <span className="text-[12px] font-black tracking-tight">{hover.val.toFixed(1)}{unit}</span>
                        <div className="flex items-center gap-1 mt-0.5">
                            <div className={`w-1.5 h-1.5 rounded-full ${hover.val >= targetVal ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                            <span className={`text-[8px] font-black uppercase tracking-widest ${hover.val >= targetVal ? 'text-emerald-400' : 'text-slate-400'}`}>{hover.val >= targetVal ? 'Zona de Sucesso' : 'Abaixo da Meta'}</span>
                        </div>
                    </div>
                </div>
            )}

            <div className="absolute -bottom-5 inset-x-0 h-4 pointer-events-none">
                {/* SCALE-BOUNDS FIX: Dynamic X-axis ticks based on actual domain */}
                {[0, 0.25, 0.5, 0.75, 1.0].map(f => {
                    const tickVal = domainMin + f * (domainMax - domainMin);
                    const pct = 2 + f * 96;
                    return (
                        <span key={f} className="absolute text-[8px] font-bold text-slate-500/60 uppercase tracking-tighter" style={{ left: `${pct}%`, transform: pct === 0 ? 'translateX(0%)' : pct === 100 ? 'translateX(-100%)' : 'translateX(-50%)' }}>
                            {Number.isInteger(tickVal) ? tickVal : tickVal.toFixed(1)}{unit}
                        </span>
                    );
                })}
            </div>

            <div className="absolute -bottom-9 transform -translate-y-1/2 flex items-center gap-1.5 opacity-60 group-hover/chart:opacity-100 transition-opacity" style={{ left: `${Math.min(ciLowPx, 75)}%`, maxWidth: '25%' }}>
                <div className="w-2 h-2 rounded-full bg-blue-500/20 border border-blue-400/40" />
                <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest whitespace-nowrap">IC 95%: {ciLabel}</span>
            </div>
        </div>
    );
};
