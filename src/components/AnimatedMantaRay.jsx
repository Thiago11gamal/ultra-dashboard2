import React, { useEffect, useId, useMemo, useRef } from 'react';
import { MANTA_VIEWBOX } from './mantaGeometry';
import {
    FLOW_MOTES,
    LEFT_TIP_INDEX,
    RIGHT_TIP_INDEX,
    ROLL_RATIO,
    SWIM_OMEGA,
    buildMantaPath,
    buildWakeData,
    clamp,
} from './mantaKinematics';

export default function AnimatedMantaRay({
    className = '',
    style,
    ariaLabel = 'Método Arraia',
    interactive = true,
    showFlow = true,
    respectReducedMotion = false,
}) {
    const uid = useId().replace(/:/g, '');
    const containerRef = useRef(null);
    const rectRef = useRef(null);
    const pathRef = useRef(null);
    const driftRef = useRef(null);
    const leftWakeRef = useRef(null);
    const rightWakeRef = useRef(null);
    const leftWakeGradRef = useRef(null);
    const rightWakeGradRef = useRef(null);
    const shadowRef = useRef(null);
    const gradRef = useRef(null);
    const moteRefs = useRef([]);

    const hoverTargetRef = useRef({ x: 0, y: 0, active: false });
    const hoverCurrentRef = useRef({ x: 0, y: 0, speedBoost: 0 });
    const floatElapsedRef = useRef(7);

    const restPath = useMemo(() => buildMantaPath(0, 0, 0, 0, true), []);

    useEffect(() => {
        if (typeof window === 'undefined') return undefined;

        const mediaQuery = respectReducedMotion && typeof window.matchMedia === 'function'
            ? window.matchMedia('(prefers-reduced-motion: reduce)')
            : null;

        let reducedMotion = respectReducedMotion && Boolean(mediaQuery?.matches);
        let isTabVisible = typeof document === 'undefined' || !document.hidden;
        let isInViewport = true;
        let rafId = null;
        let simTime = 0.65;
        let lastTimestamp = null;

        const setBodyPath = (d) => {
            if (pathRef.current) pathRef.current.setAttribute('d', d);
        };

        const applyRestPose = () => {
            setBodyPath(restPath);
            if (leftWakeRef.current) leftWakeRef.current.setAttribute('d', '');
            if (rightWakeRef.current) rightWakeRef.current.setAttribute('d', '');
            if (gradRef.current) {
                gradRef.current.setAttribute('y1', '12%');
                gradRef.current.setAttribute('x2', '84%');
            }
            if (shadowRef.current) {
                shadowRef.current.setAttribute('transform', 'translate(268 292) rotate(-31)');
                shadowRef.current.setAttribute('opacity', '0.32');
            }
            if (driftRef.current) driftRef.current.setAttribute('transform', 'translate(0 0)');
            for (let i = 0; i < FLOW_MOTES.length; i++) {
                const el = moteRefs.current[i];
                if (!el) continue;
                const m = FLOW_MOTES[i];
                el.setAttribute('cx', String(m.startX));
                el.setAttribute('cy', String(m.startY));
                el.setAttribute('opacity', '0');
            }
        };

        const canAnimate = () => !reducedMotion && isTabVisible && isInViewport;

        const stopLoop = () => {
            if (rafId !== null && typeof window.cancelAnimationFrame === 'function') {
                window.cancelAnimationFrame(rafId);
            }
            rafId = null;
        };

        const step = (timestamp) => {
            rafId = null;
            if (reducedMotion) {
                applyRestPose();
                return;
            }
            if (!isTabVisible || !isInViewport) {
                return;
            }

            if (lastTimestamp === null) {
                lastTimestamp = timestamp;
            }
            const rawDt = (timestamp - lastTimestamp) / 1000;
            lastTimestamp = timestamp;
            const dt = Math.min(0.05, Math.max(0, rawDt));

            const ht = hoverTargetRef.current;
            const hc = hoverCurrentRef.current;
            // Hydraulic water damping so pointer tilt and hover glide settle silkily
            const damp = 1 - Math.exp(-5.2 * dt);
            const boostDamp = 1 - Math.exp(-3.6 * dt);
            hc.x += (ht.x - hc.x) * damp;
            hc.y += (ht.y - hc.y) * damp;
            const targetBoost = ht.active ? 0.20 : 0;
            hc.speedBoost += (targetBoost - hc.speedBoost) * boostDamp;

            simTime += dt * (1 + hc.speedBoost);
            const phase = simTime * SWIM_OMEGA;
            const rollPhase = phase * ROLL_RATIO;

            setBodyPath(buildMantaPath(phase, rollPhase, hc.x, hc.y, false));

            const floatDuration = 7;
            if (floatElapsedRef.current < floatDuration) {
                floatElapsedRef.current = Math.min(floatDuration, floatElapsedRef.current + dt);
                const progress = floatElapsedRef.current / floatDuration;
                const envelope = Math.sin(Math.PI * progress);
                const driftX = 48 * Math.sin(progress * Math.PI * 2) * envelope;
                const driftY = 7 * Math.sin(progress * Math.PI * 4) * envelope;
                if (driftRef.current) {
                    driftRef.current.setAttribute('transform', `translate(${driftX.toFixed(2)} ${driftY.toFixed(2)})`);
                }
            } else if (driftRef.current) {
                driftRef.current.setAttribute('transform', 'translate(0 0)');
            }

            const updateWake = (tipIndex, pathEl, gradEl) => {
                if (!pathEl) return;
                const wake = buildWakeData(tipIndex, phase, rollPhase, hc.x, hc.y);
                pathEl.setAttribute('d', wake.d);
                if (gradEl) {
                    gradEl.setAttribute('x1', wake.xStart.toFixed(1));
                    gradEl.setAttribute('y1', wake.yStart.toFixed(1));
                    gradEl.setAttribute('x2', wake.xEnd.toFixed(1));
                    gradEl.setAttribute('y2', wake.yEnd.toFixed(1));
                }
            };

            if (showFlow) {
                updateWake(LEFT_TIP_INDEX, leftWakeRef.current, leftWakeGradRef.current);
                updateWake(RIGHT_TIP_INDEX, rightWakeRef.current, rightWakeGradRef.current);
            }

            if (gradRef.current) {
                const sheenShift = Math.sin(phase) * 8;
                gradRef.current.setAttribute('y1', `${12 + sheenShift}%`);
                gradRef.current.setAttribute('x2', `${84 + sheenShift * 0.6}%`);
            }

            if (shadowRef.current) {
                const liftFactor = Math.sin(phase - 0.35);
                const sx = 1 - 0.08 * liftFactor;
                const sy = 1 - 0.06 * liftFactor;
                const opacity = (0.34 - 0.08 * liftFactor).toFixed(3);
                shadowRef.current.setAttribute(
                    'transform',
                    `translate(268 292) rotate(-31) scale(${sx.toFixed(3)} ${sy.toFixed(3)})`
                );
                shadowRef.current.setAttribute('opacity', opacity);
            }

            if (showFlow) {
                const span = 440;
                for (let i = 0; i < FLOW_MOTES.length; i++) {
                    const el = moteRefs.current[i];
                    if (!el) continue;
                    const m = FLOW_MOTES[i];
                    const my = ((m.startY - simTime * m.speed) % span + span) % span;
                    const mx = m.startX + Math.sin(simTime * 0.8 + m.phase * Math.PI * 2) * 3.5;
                    const edgeFade = Math.sin(((span - my) / span) * Math.PI);
                    el.setAttribute('cx', mx.toFixed(1));
                    el.setAttribute('cy', my.toFixed(1));
                    el.setAttribute('opacity', (m.opacity * edgeFade).toFixed(3));
                }
            }

            if (canAnimate() && typeof window.requestAnimationFrame === 'function') {
                rafId = window.requestAnimationFrame(step);
            }
        };

        const syncLoopState = () => {
            if (reducedMotion) {
                stopLoop();
                applyRestPose();
                return;
            }
            if (canAnimate()) {
                if (rafId === null && typeof window.requestAnimationFrame === 'function') {
                    lastTimestamp = null;
                    rafId = window.requestAnimationFrame(step);
                }
            } else {
                stopLoop();
            }
        };

        const handleMotionChange = (e) => {
            reducedMotion = Boolean(e.matches);
            syncLoopState();
        };

        const handleVisibilityChange = () => {
            isTabVisible = !document.hidden;
            syncLoopState();
        };

        if (mediaQuery && typeof mediaQuery.addEventListener === 'function') {
            mediaQuery.addEventListener('change', handleMotionChange);
        }
        if (typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', handleVisibilityChange);
        }

        let intersectionObs = null;
        if (typeof IntersectionObserver === 'function' && containerRef.current) {
            intersectionObs = new IntersectionObserver((entries) => {
                if (entries.length > 0) {
                    isInViewport = entries[0].isIntersecting;
                    syncLoopState();
                }
            }, { threshold: 0.01 });
            intersectionObs.observe(containerRef.current);
        }

        let resizeObs = null;
        if (typeof ResizeObserver === 'function' && containerRef.current) {
            resizeObs = new ResizeObserver(() => {
                rectRef.current = null;
            });
            resizeObs.observe(containerRef.current);
        }

        syncLoopState();

        return () => {
            stopLoop();
            if (mediaQuery && typeof mediaQuery.removeEventListener === 'function') {
                mediaQuery.removeEventListener('change', handleMotionChange);
            }
            if (typeof document !== 'undefined') {
                document.removeEventListener('visibilitychange', handleVisibilityChange);
            }
            if (intersectionObs) intersectionObs.disconnect();
            if (resizeObs) resizeObs.disconnect();
        };
    }, [restPath, showFlow, respectReducedMotion]);

    const handlePointerEnter = (e) => {
        if (!interactive) return;
        rectRef.current = e.currentTarget.getBoundingClientRect();
    };

    const handlePointerMove = (e) => {
        if (!interactive) return;
        let rect = rectRef.current;
        if (!rect) {
            rect = e.currentTarget.getBoundingClientRect();
            rectRef.current = rect;
        }
        if (!rect.width || !rect.height) return;
        const nx = clamp(((e.clientX - rect.left) / rect.width) * 2 - 1, -1, 1);
        const ny = clamp(((e.clientY - rect.top) / rect.height) * 2 - 1, -1, 1);
        hoverTargetRef.current = { x: nx, y: ny, active: true };
    };

    const handlePointerLeave = () => {
        if (!interactive) return;
        rectRef.current = null;
        hoverTargetRef.current = { x: 0, y: 0, active: false };
    };

    const handleClick = () => {
        if (interactive) floatElapsedRef.current = 0;
    };

    const bodyPathId = `manta-body-path-${uid}`;
    const bodyGradId = `manta-body-grad-${uid}`;
    const shadowGradId = `manta-shadow-grad-${uid}`;
    const leftWakeGradId = `manta-lwake-grad-${uid}`;
    const rightWakeGradId = `manta-rwake-grad-${uid}`;

    return (
        <div
            ref={containerRef}
            className={`relative select-none flex items-center justify-center ${className}`}
            style={style}
            role="img"
            aria-label={ariaLabel}
            onPointerEnter={handlePointerEnter}
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
            onClick={handleClick}
        >
            {/* Static radial underwater glow composited once on GPU (avoids per-frame CSS blur thrashing) */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-12"
                style={{
                    background: 'radial-gradient(closest-side at 50% 50%, rgba(99, 102, 241, 0.22) 0%, rgba(56, 189, 248, 0.08) 46%, rgba(15, 23, 42, 0) 100%)',
                }}
            />

            <svg
                viewBox={MANTA_VIEWBOX}
                className="relative w-full h-auto overflow-visible block"
                aria-hidden="true"
            >
                <defs>
                    <path
                        ref={pathRef}
                        id={bodyPathId}
                        data-manta-body="true"
                        d={restPath}
                    />
                    <linearGradient
                        id={bodyGradId}
                        ref={gradRef}
                        x1="12%"
                        y1="12%"
                        x2="84%"
                        y2="88%"
                    >
                        <stop offset="0%" stopColor="#f8faff" />
                        <stop offset="48%" stopColor="#e0e7ff" />
                        <stop offset="100%" stopColor="#b9c7ff" />
                    </linearGradient>

                    <radialGradient id={shadowGradId} cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity="0.45" />
                        <stop offset="55%" stopColor="#38bdf8" stopOpacity="0.16" />
                        <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
                    </radialGradient>

                    <linearGradient id={leftWakeGradId} ref={leftWakeGradRef} gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#c7d2fe" stopOpacity="0.22" />
                        <stop offset="48%" stopColor="#38bdf8" stopOpacity="0.10" />
                        <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
                    </linearGradient>

                    <linearGradient id={rightWakeGradId} ref={rightWakeGradRef} gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#c7d2fe" stopOpacity="0.18" />
                        <stop offset="48%" stopColor="#38bdf8" stopOpacity="0.08" />
                        <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
                    </linearGradient>
                </defs>

                <g ref={driftRef} data-manta-drift="true" transform="translate(0 0)">
                <g ref={shadowRef} transform="translate(268 292) rotate(-31)" opacity="0.32">
                    <ellipse cx="0" cy="0" rx="150" ry="58" fill={`url(#${shadowGradId})`} />
                </g>

                {showFlow && (
                    <g aria-hidden="true">
                        {FLOW_MOTES.map((m, idx) => (
                            <circle
                                key={`mote-${idx}`}
                                ref={(el) => { moteRefs.current[idx] = el; }}
                                cx={m.startX}
                                cy={m.startY}
                                r={m.r}
                                fill="#a5f3fc"
                                fillOpacity="0.12"
                                stroke="#cffafe"
                                strokeOpacity="0.3"
                                strokeWidth="0.45"
                                opacity="0"
                            />
                        ))}
                    </g>
                )}

                {showFlow && (
                    <g fill="none" strokeLinecap="round" aria-hidden="true">
                        <path
                            ref={leftWakeRef}
                            d=""
                            stroke={`url(#${leftWakeGradId})`}
                            strokeWidth="0.9"
                        />
                        <path
                            ref={rightWakeRef}
                            d=""
                            stroke={`url(#${rightWakeGradId})`}
                            strokeWidth="0.9"
                        />
                    </g>
                )}

                <use
                    href={`#${bodyPathId}`}
                    fill="none"
                    stroke="rgba(99, 102, 241, 0.14)"
                    strokeWidth="10"
                    strokeLinejoin="bevel"
                    aria-hidden="true"
                />

                <use
                    href={`#${bodyPathId}`}
                    fill="none"
                    stroke="rgba(186, 230, 253, 0.24)"
                    strokeWidth="3.2"
                    strokeLinejoin="bevel"
                    aria-hidden="true"
                />

                <use
                    href={`#${bodyPathId}`}
                    fill={`url(#${bodyGradId})`}
                />
                </g>
            </svg>
        </div>
    );
}
