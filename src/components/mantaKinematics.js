import { MANTA_BASIS, MANTA_UV_POINTS } from './mantaGeometry';

export const VERTEX_COUNT = MANTA_UV_POINTS.length / 2;
export const LEFT_TIP_INDEX = 0;
export const RIGHT_TIP_INDEX = 178;

export const SWIM_PERIOD_SEC = 4.6;
export const SWIM_OMEGA = (Math.PI * 2) / SWIM_PERIOD_SEC;
export const ROLL_RATIO = 0.32;

export const FLOW_MOTES = [
    { startX: 430, startY: 95, r: 0.9, speed: 10, phase: 0.12, opacity: 0.19 },
    { startX: 315, startY: 70, r: 0.75, speed: 8, phase: 0.48, opacity: 0.15 },
    { startX: 470, startY: 210, r: 1.05, speed: 12, phase: 0.77, opacity: 0.17 },
    { startX: 390, startY: 295, r: 0.8, speed: 9, phase: 0.31, opacity: 0.14 },
    { startX: 250, startY: 115, r: 0.85, speed: 9, phase: 0.64, opacity: 0.14 },
    { startX: 465, startY: 365, r: 0.7, speed: 7, phase: 0.90, opacity: 0.13 },
    { startX: 345, startY: 385, r: 0.95, speed: 11, phase: 0.19, opacity: 0.16 },
];

const TRAIL_POINTS = 16;
const TRAIL_SPAN_SEC = 0.72;
const STREAM_SPEED = 88;

export const clamp = (val, min, max) => (val < min ? min : val > max ? max : val);

const smoothstep = (edge0, edge1, x) => {
    const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
};

/**
 * Evaluates a single vertex (u, v) in the manta's local oblique frame under
 * fluid mobuliform swimming kinematics and projects it onto 2D SVG coordinates.
 * Pass `target` (`{ x, y }`) in hot animation loops to avoid array allocations.
 */
export function projectVertex(u, v, phase, rollPhase, hoverX, hoverY, isRest, target = null) {
    const B = MANTA_BASIS;
    if (isRest) {
        const x = B.centerX + u * B.fwdX + v * B.wingX;
        const y = B.centerY + u * B.fwdY + v * B.wingY;
        if (target) {
            target.x = x;
            target.y = y;
            return target;
        }
        return [x, y];
    }

    const r = Math.abs(v) / 245;
    const s = clamp((r - 0.15) / 0.85, 0, 1);
    const flex = Math.pow(s, 1.32) * (1.12 - 0.12 * s);

    const uNorm = u / 155;
    // Soften chordwise phase lag near wingtips so tips remain crisp while the
    // wider trailing membrane feathers organically through the stroke cycle.
    const tipTaper = 1 - 0.38 * (s * s * s);
    const wPhase = phase - 0.94 * s + 0.42 * uNorm * tipTaper;
    const flap = Math.sin(wPhase)
        + 0.10 * Math.sin(2 * wPhase - 0.55)
        + 0.025 * Math.sin(3 * wPhase - 0.30);

    const amp = v >= 0 ? 40 : 29;
    const zWing = amp * flex * flap;

    const flexFlap = flex * flap;
    const unfurl = v < 0 ? 0.028 * flexFlap : -0.024 * flex * Math.abs(flap);
    const foreshorten = 1 - 0.036 * flexFlap * flexFlap + unfurl;
    let vDef = v * foreshorten;

    // Dual-harmonic ribbon S-wave traveling down the flexible whip tail
    const tailMask = smoothstep(-60, -96, u) * (1 - smoothstep(22, 52, Math.abs(v)));
    const tailProg = clamp((-70 - u) / 200, 0, 1);
    const tailPow = Math.pow(tailProg, 1.38);
    const tailWaveLat = 19 * tailPow * (
        Math.sin(phase - 2.6 * tailProg - 0.9)
        + 0.18 * Math.sin(2 * phase - 3.6 * tailProg - 0.4)
    );
    const tailWaveZ = 14 * Math.pow(tailProg, 1.4) * Math.sin(phase - 2.1 * tailProg - 0.5);

    vDef += tailMask * tailWaveLat;

    // Coupled body heave, surge, pitch, slow ocean bank, and subtle cursor bank
    const bodyLift = -7.5 * Math.sin(phase - 0.35) - 0.8 * Math.sin(2 * phase - 0.18);
    const bodySurge = 7.5 * Math.sin(phase - 0.78) + 0.9 * Math.sin(2 * phase - 0.26);
    const bodyPitch = 0.042 * Math.cos(phase) - hoverY * 0.045;
    const bankRoll = 0.052 * Math.sin(rollPhase) + hoverX * 0.075;

    const zBody = bodyLift + u * bodyPitch + v * bankRoll + tailMask * tailWaveZ;
    const uDef = u + bodySurge;

    // Smoothly blend perspective lift axis across right wing -> spine -> left wing
    const wingBlend = smoothstep(-70, 70, v);
    let wUpX = (1 - wingBlend) * B.upRightX + wingBlend * B.upLeftX;
    let wUpY = (1 - wingBlend) * B.upRightY + wingBlend * B.upLeftY;
    const len = Math.hypot(wUpX, wUpY) || 1;
    wUpX /= len;
    wUpY /= len;

    // Gentle figure-8 hover drift in water
    const driftX = 6.2 * Math.sin(rollPhase) + hoverX * 7;
    const driftY = 4.6 * Math.sin(rollPhase * 2) + hoverY * 5;

    const x = B.centerX + driftX + uDef * B.fwdX + vDef * B.wingX + zBody * B.upBodyX + zWing * wUpX;
    const y = B.centerY + driftY + uDef * B.fwdY + vDef * B.wingY + zBody * B.upBodyY + zWing * wUpY;

    if (target) {
        target.x = x;
        target.y = y;
        return target;
    }
    return [x, y];
}

const sharedPt = { x: 0, y: 0 };
const sharedParts = new Array(VERTEX_COUNT);
const wakeXs = new Float64Array(TRAIL_POINTS);
const wakeYs = new Float64Array(TRAIL_POINTS);
const wakeSegs = new Array(TRAIL_POINTS);

// Pré-computa coeficientes estáticos por vértice para evitar Math.pow, smoothstep e Math.hypot em cada frame
const VERTEX_FLEX = new Float64Array(VERTEX_COUNT);
const VERTEX_PHASE_OFFSET = new Float64Array(VERTEX_COUNT);
const VERTEX_AMP = new Float64Array(VERTEX_COUNT);
const VERTEX_TAIL_MASK = new Float64Array(VERTEX_COUNT);
const VERTEX_TAIL_PROG = new Float64Array(VERTEX_COUNT);
const VERTEX_TAIL_POW = new Float64Array(VERTEX_COUNT);
const VERTEX_TAIL_Z_AMP = new Float64Array(VERTEX_COUNT);
const VERTEX_WUP_X = new Float64Array(VERTEX_COUNT);
const VERTEX_WUP_Y = new Float64Array(VERTEX_COUNT);

for (let i = 0; i < VERTEX_COUNT; i++) {
    const u = MANTA_UV_POINTS[i * 2];
    const v = MANTA_UV_POINTS[i * 2 + 1];
    const r = Math.abs(v) / 245;
    const s = clamp((r - 0.15) / 0.85, 0, 1);
    VERTEX_FLEX[i] = Math.pow(s, 1.32) * (1.12 - 0.12 * s);
    const tipTaper = 1 - 0.38 * (s * s * s);
    VERTEX_PHASE_OFFSET[i] = -0.94 * s + 0.42 * (u / 155) * tipTaper;
    VERTEX_AMP[i] = v >= 0 ? 40 : 29;

    const tailMask = smoothstep(-60, -96, u) * (1 - smoothstep(22, 52, Math.abs(v)));
    const tailProg = clamp((-70 - u) / 200, 0, 1);
    VERTEX_TAIL_MASK[i] = tailMask;
    VERTEX_TAIL_PROG[i] = tailProg;
    VERTEX_TAIL_POW[i] = Math.pow(tailProg, 1.38);
    VERTEX_TAIL_Z_AMP[i] = 14 * Math.pow(tailProg, 1.4);

    const wingBlend = smoothstep(-70, 70, v);
    const wUpX = (1 - wingBlend) * MANTA_BASIS.upRightX + wingBlend * MANTA_BASIS.upLeftX;
    const wUpY = (1 - wingBlend) * MANTA_BASIS.upRightY + wingBlend * MANTA_BASIS.upLeftY;
    const len = Math.hypot(wUpX, wUpY) || 1;
    VERTEX_WUP_X[i] = wUpX / len;
    VERTEX_WUP_Y[i] = wUpY / len;
}

function projectVertexAtIndex(i, phase, rollPhase, hoverX, hoverY, isRest, target) {
    const B = MANTA_BASIS;
    const u = MANTA_UV_POINTS[i * 2];
    const v = MANTA_UV_POINTS[i * 2 + 1];
    if (isRest) {
        target.x = B.centerX + u * B.fwdX + v * B.wingX;
        target.y = B.centerY + u * B.fwdY + v * B.wingY;
        return target;
    }

    const flex = VERTEX_FLEX[i];
    const wPhase = phase + VERTEX_PHASE_OFFSET[i];
    const flap = Math.sin(wPhase)
        + 0.10 * Math.sin(2 * wPhase - 0.55)
        + 0.025 * Math.sin(3 * wPhase - 0.30);
    const zWing = VERTEX_AMP[i] * flex * flap;

    const flexFlap = flex * flap;
    const unfurl = v < 0 ? 0.028 * flexFlap : -0.024 * flex * Math.abs(flap);
    const foreshorten = 1 - 0.036 * flexFlap * flexFlap + unfurl;
    let vDef = v * foreshorten;

    const tailMask = VERTEX_TAIL_MASK[i];
    let tailWaveZ = 0;
    if (tailMask > 0) {
        const tailProg = VERTEX_TAIL_PROG[i];
        const tailWaveLat = 19 * VERTEX_TAIL_POW[i] * (
            Math.sin(phase - 2.6 * tailProg - 0.9)
            + 0.18 * Math.sin(2 * phase - 3.6 * tailProg - 0.4)
        );
        tailWaveZ = VERTEX_TAIL_Z_AMP[i] * Math.sin(phase - 2.1 * tailProg - 0.5);
        vDef += tailMask * tailWaveLat;
    }

    const bodyLift = -7.5 * Math.sin(phase - 0.35) - 0.8 * Math.sin(2 * phase - 0.18);
    const bodySurge = 7.5 * Math.sin(phase - 0.78) + 0.9 * Math.sin(2 * phase - 0.26);
    const bodyPitch = 0.042 * Math.cos(phase) - hoverY * 0.045;
    const bankRoll = 0.052 * Math.sin(rollPhase) + hoverX * 0.075;

    const zBody = bodyLift + u * bodyPitch + v * bankRoll + tailMask * tailWaveZ;
    const uDef = u + bodySurge;

    const driftX = 6.2 * Math.sin(rollPhase) + hoverX * 7;
    const driftY = 4.6 * Math.sin(rollPhase * 2) + hoverY * 5;

    target.x = B.centerX + driftX + uDef * B.fwdX + vDef * B.wingX + zBody * B.upBodyX + zWing * VERTEX_WUP_X[i];
    target.y = B.centerY + driftY + uDef * B.fwdY + vDef * B.wingY + zBody * B.upBodyY + zWing * VERTEX_WUP_Y[i];
    return target;
}

/**
 * Builds the complete SVG path `d` string for a given swim phase and pointer bank.
 */
export function buildMantaPath(phase, rollPhase = 0, hoverX = 0, hoverY = 0, isRest = false) {
    for (let i = 0; i < VERTEX_COUNT; i++) {
        projectVertexAtIndex(i, phase, rollPhase, hoverX, hoverY, isRest, sharedPt);
        sharedParts[i] = `${i === 0 ? 'M' : 'L'}${sharedPt.x.toFixed(2)},${sharedPt.y.toFixed(2)}`;
    }
    return `${sharedParts.join('')}Z`;
}

/**
 * Builds a C1-smooth quadratic spline wingtip vortex trail advected backward along the water current.
 */
export function buildWakeData(tipIndex, phase, rollPhase, hoverX, hoverY) {
    const B = MANTA_BASIS;

    for (let i = 0; i < TRAIL_POINTS; i++) {
        const frac = i / (TRAIL_POINTS - 1);
        const ageSec = frac * TRAIL_SPAN_SEC;
        const pastPhase = phase - ageSec * SWIM_OMEGA;
        const pastRoll = rollPhase - ageSec * SWIM_OMEGA * ROLL_RATIO;
        projectVertexAtIndex(tipIndex, pastPhase, pastRoll, hoverX, hoverY, false, sharedPt);
        wakeXs[i] = sharedPt.x - B.fwdX * STREAM_SPEED * ageSec;
        wakeYs[i] = sharedPt.y - B.fwdY * STREAM_SPEED * ageSec;
    }

    wakeSegs[0] = `M${wakeXs[0].toFixed(2)},${wakeYs[0].toFixed(2)}`;
    for (let i = 1; i < TRAIL_POINTS - 1; i++) {
        const mx = ((wakeXs[i] + wakeXs[i + 1]) * 0.5).toFixed(2);
        const my = ((wakeYs[i] + wakeYs[i + 1]) * 0.5).toFixed(2);
        wakeSegs[i] = `Q${wakeXs[i].toFixed(2)},${wakeYs[i].toFixed(2)} ${mx},${my}`;
    }
    const lastIdx = TRAIL_POINTS - 1;
    wakeSegs[lastIdx] = `L${wakeXs[lastIdx].toFixed(2)},${wakeYs[lastIdx].toFixed(2)}`;

    return {
        d: wakeSegs.join(' '),
        xStart: wakeXs[0],
        yStart: wakeYs[0],
        xEnd: wakeXs[lastIdx],
        yEnd: wakeYs[lastIdx],
    };
}
