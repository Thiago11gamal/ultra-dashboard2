import React, { useEffect, useId, useMemo, useRef } from 'react';
import { MANTA_BASIS, MANTA_VIEWBOX } from './mantaGeometry';
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
    const pathRef = useRef(null);
    const auraOuterRef = useRef(null);
    const auraInnerRef = useRef(null);
    const leftWakeRef = useRef(null);
    const rightWakeRef = useRef(null);
    const leftWakeGradRef = useRef(null);
    const rightWakeGradRef = useRef(null);
    const shadowRef = useRef(null);
    const gradRef = useRef(null);
    const moteRefs = useRef([]);

    const hoverTargetRef = useRef({ x: 0, y: 0, active: false });
    const hoverCurrentRef = useRef({ x: 0, y: 0, speedBoost: 0 });

    const restPath = useMemo(() => buildMantaPath(0, 0, 0, 0, true), []);

    useEffect(() => {
        if (typeof window === 'undefined') return undefined;

        const mediaQuery = respectReducedMotion && typeof window.matchMedia === 'function'
            ? window.matchMedia('(prefers-reduced-motion: reduce)')
            : null;

        let reducedMotion = respectReducedMotion && Boolean(mediaQuery?.matches);
        let rafId = null;
        let simTime = 0.65;
        let lastTimestamp = null;

        const setBodyPath = (d) => {
            if (pathRef.current) pathRef.current.setAttribute('d', d);
            if (auraOuterRef.current) auraOuterRef.current.setAttribute('d', d);
            if (auraInnerRef.current) auraInnerRef.current.setAttribute('d', d);
        };

        const applyRestPose = () => {
            setBodyPath(restPath);
            if (leftWakeRef.current) leftWakeRef.current.setAttribute('d', '');
            if (rightWakeRef.current) rightWakeRef.current.setAttribute('d', '');
        };

        const step = (timestamp) => {
            if (reducedMotion) {
                applyRestPose();
                return;
            }

            if (lastTimestamp === null) {
                lastTimestamp = timestamp;
            }
            const rawDt = (timestamp - lastTimestamp) / 1000;
            lastTimestamp = timestamp;
            const dt = typeof document !== 'undefined' && document.hidden
                ? 0
                : Math.min(0.05, Math.max(0, rawDt));

            const ht = hoverTargetRef.current;
            const hc = hoverCurrentRef.current;
            // Hydraulic water damping so pointer tilt and hover glide settle silkily
            const damp = 1 - Math.exp(-4.0 * dt);
            const boostDamp = 1 - Math.exp(-2.8 * dt);
            hc.x += (ht.x - hc.x) * damp;
            hc.y += (ht.y - hc.y) * damp;
            const targetBoost = ht.active ? 0.20 : 0;
            hc.speedBoost += (targetBoost - hc.speedBoost) * boostDamp;

            simTime += dt * (1 + hc.speedBoost);
            const phase = simTime * SWIM_OMEGA;
            const rollPhase = phase * ROLL_RATIO;

            setBodyPath(buildMantaPath(phase, rollPhase, hc.x, hc.y, false));

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
                const B = MANTA_BASIS;
                const span = 440;
                for (let i = 0; i < FLOW_MOTES.length; i++) {
                    const el = moteRefs.current[i];
                    if (!el) continue;
                    const m = FLOW_MOTES[i];
                    const travel = (simTime * m.speed + m.phase * span) % span;
                    const mx = m.startX - B.fwdX * travel;
                    const my = m.startY - B.fwdY * travel;
                    const edgeFade = Math.sin((travel / span) * Math.PI);
                    el.setAttribute('cx', mx.toFixed(1));
                    el.setAttribute('cy', my.toFixed(1));
                    el.setAttribute('opacity', (m.opacity * edgeFade).toFixed(3));
                }
            }

            rafId = window.requestAnimationFrame(step);
        };

        const handleMotionChange = (e) => {
            reducedMotion = Boolean(e.matches);
            if (reducedMotion) {
                if (rafId !== null) window.cancelAnimationFrame(rafId);
                rafId = null;
                applyRestPose();
            } else if (rafId === null && typeof window.requestAnimationFrame === 'function') {
                lastTimestamp = null;
                rafId = window.requestAnimationFrame(step);
            }
        };

        if (mediaQuery && typeof mediaQuery.addEventListener === 'function') {
            mediaQuery.addEventListener('change', handleMotionChange);
        }

        if (reducedMotion) {
            applyRestPose();
        } else if (typeof window.requestAnimationFrame === 'function') {
            rafId = window.requestAnimationFrame(step);
        }

        return () => {
            if (rafId !== null && typeof window.cancelAnimationFrame === 'function') {
                window.cancelAnimationFrame(rafId);
            }
            if (mediaQuery && typeof mediaQuery.removeEventListener === 'function') {
                mediaQuery.removeEventListener('change', handleMotionChange);
            }
        };
    }, [restPath, showFlow, respectReducedMotion]);

    const handlePointerMove = (e) => {
        if (!interactive) return;
        const rect = e.currentTarget.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const nx = clamp(((e.clientX - rect.left) / rect.width) * 2 - 1, -1, 1);
        const ny = clamp(((e.clientY - rect.top) / rect.height) * 2 - 1, -1, 1);
        hoverTargetRef.current = { x: nx, y: ny, active: true };
    };

    const handlePointerLeave = () => {
        if (!interactive) return;
        hoverTargetRef.current = { x: 0, y: 0, active: false };
    };

    const bodyGradId = `manta-body-grad-${uid}`;
    const shadowGradId = `manta-shadow-grad-${uid}`;
    const leftWakeGradId = `manta-lwake-grad-${uid}`;
    const rightWakeGradId = `manta-rwake-grad-${uid}`;

    return (
        <div
            className={`relative select-none flex items-center justify-center ${className}`}
            style={style}
            role="img"
            aria-label={ariaLabel}
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
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
                style={{ willChange: 'transform', transform: 'translateZ(0)' }}
                aria-hidden="true"
            >
                <defs>
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
                            strokeWidth="1.4"
                        />
                        <path
                            ref={rightWakeRef}
                            d=""
                            stroke={`url(#${rightWakeGradId})`}
                            strokeWidth="1.4"
                        />
                    </g>
                )}

                <path
                    ref={auraOuterRef}
                    d={restPath}
                    fill="none"
                    stroke="rgba(99, 102, 241, 0.12)"
                    strokeWidth="11"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    aria-hidden="true"
                />

                <path
                    ref={auraInnerRef}
                    d={restPath}
                    fill="none"
                    stroke="rgba(186, 230, 253, 0.24)"
                    strokeWidth="3.5"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    aria-hidden="true"
                />

                <path
                    ref={pathRef}
                    data-manta-body="true"
                    d={restPath}
                    fill={`url(#${bodyGradId})`}
                />
            </svg>
        </div>
    );
}
