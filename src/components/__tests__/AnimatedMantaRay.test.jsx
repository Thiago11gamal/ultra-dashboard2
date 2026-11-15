import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import AnimatedMantaRay from '../AnimatedMantaRay';
import { LEFT_TIP_INDEX, buildMantaPath, buildWakeData } from '../mantaKinematics';
import WelcomeScreen from '../WelcomeScreen';
import Login from '../Login';

vi.mock('../../context/useAuth', () => ({
    useAuth: () => ({
        login: vi.fn(),
        signup: vi.fn(),
    }),
}));

vi.mock('../../services/firebase', () => ({
    isLocalMode: false,
}));

function parsePathPoints(d) {
    const coords = d.match(/-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?/g) || [];
    return coords.map((pair) => {
        const [x, y] = pair.split(',').map(Number);
        return { x, y };
    });
}

describe('AnimatedMantaRay kinematics and entrance screens', () => {
    let rafCallbacks;
    let originalMatchMedia;

    const flushNextFrame = (timestamp) => {
        const entry = rafCallbacks.entries().next().value;
        if (!entry) return false;
        const [id, cb] = entry;
        rafCallbacks.delete(id);
        cb(timestamp);
        return true;
    };

    beforeEach(() => {
        rafCallbacks = new Map();
        let nextId = 1;
        vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
            const id = nextId++;
            rafCallbacks.set(id, cb);
            return id;
        });
        vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
            rafCallbacks.delete(id);
        });
        originalMatchMedia = window.matchMedia;
        window.matchMedia = vi.fn().mockImplementation((query) => ({
            matches: false,
            media: query,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        }));
    });

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
        window.matchMedia = originalMatchMedia;
    });

    it('generates finite, non-clipped SVG paths with distinct wing/tail kinematics across swim phases', () => {
        const restPath = buildMantaPath(0, 0, 0, 0, true);
        const phaseUp = buildMantaPath(Math.PI * 0.5, 0.2, 0, 0, false);
        const phaseDown = buildMantaPath(Math.PI * 1.5, -0.2, 0, 0, false);

        expect(restPath.startsWith('M')).toBe(true);
        expect(restPath.endsWith('Z')).toBe(true);
        expect(phaseUp).not.toBe(phaseDown);

        for (const d of [restPath, phaseUp, phaseDown]) {
            const pts = parsePathPoints(d);
            expect(pts.length).toBe(355);
            for (const { x, y } of pts) {
                expect(Number.isFinite(x)).toBe(true);
                expect(Number.isFinite(y)).toBe(true);
                expect(x).toBeGreaterThanOrEqual(0);
                expect(x).toBeLessThanOrEqual(510);
                expect(y).toBeGreaterThanOrEqual(0);
                expect(y).toBeLessThanOrEqual(470);
            }
        }

        // Left wingtip (vertex 0) sweeps significantly higher on upstroke than downstroke
        const upPts = parsePathPoints(phaseUp);
        const downPts = parsePathPoints(phaseDown);
        expect(upPts[0].y).toBeLessThan(downPts[0].y - 30);

        // Full 24-frame swim cycle + hover deflection remains bounded inside viewBox
        for (let k = 0; k < 24; k++) {
            const ph = (k / 24) * Math.PI * 2;
            const d = buildMantaPath(ph, ph * 0.36, 0.5, -0.5, false);
            const pts = parsePathPoints(d);
            expect(pts.length).toBe(355);
            for (const { x, y } of pts) {
                expect(x).toBeGreaterThanOrEqual(0);
                expect(x).toBeLessThanOrEqual(510);
                expect(y).toBeGreaterThanOrEqual(0);
                expect(y).toBeLessThanOrEqual(470);
            }
        }

        // Smooth quadratic wake spline starts at wingtip and advects downstream
        const wake = buildWakeData(LEFT_TIP_INDEX, Math.PI * 0.5, 0.2, 0, 0);
        expect(wake.d.startsWith('M')).toBe(true);
        expect(wake.d).toContain('Q');
        expect(Number.isFinite(wake.xEnd)).toBe(true);
    });

    it('animates smoothly via requestAnimationFrame and cancels on unmount', () => {
        const { container, unmount } = render(<AnimatedMantaRay ariaLabel="Arraia Teste" />);
        const wrapper = screen.getByRole('img', { name: 'Arraia Teste' });
        expect(wrapper).toBeTruthy();

        const pathEl = container.querySelector('path[data-manta-body="true"]');
        const initialD = pathEl.getAttribute('d');
        expect(rafCallbacks.size).toBe(1);

        expect(flushNextFrame(100)).toBe(true);
        const frame1D = pathEl.getAttribute('d');
        expect(frame1D).not.toBe(initialD);

        expect(flushNextFrame(500)).toBe(true);
        const frame2D = pathEl.getAttribute('d');
        expect(frame2D).not.toBe(frame1D);

        unmount();
        expect(rafCallbacks.size).toBe(0);
    });

    it('keeps swimming by default even under OS reduced-motion, and honors respectReducedMotion when enabled', () => {
        window.matchMedia = vi.fn().mockImplementation((query) => ({
            matches: query === '(prefers-reduced-motion: reduce)',
            media: query,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        }));

        const { container: defaultContainer, unmount: unmountDefault } = render(
            <AnimatedMantaRay ariaLabel="Arraia Padrão" />
        );
        expect(defaultContainer.querySelector('path[data-manta-body="true"]')).toBeTruthy();
        expect(rafCallbacks.size).toBe(1);
        unmountDefault();

        const { container } = render(<AnimatedMantaRay ariaLabel="Arraia Reduzida" respectReducedMotion />);
        const pathEl = container.querySelector('path[data-manta-body="true"]');
        expect(pathEl.getAttribute('d')).toBe(buildMantaPath(0, 0, 0, 0, true));
        expect(rafCallbacks.size).toBe(0);
    });

    it('resets body gradient, shadow, and wake motes to rest pose when OS toggles prefers-reduced-motion dynamically', () => {
        const listeners = [];
        const originalMatchMedia = window.matchMedia;
        window.matchMedia = vi.fn().mockImplementation((query) => ({
            matches: false,
            media: query,
            onchange: null,
            addEventListener: (_event, cb) => listeners.push(cb),
            removeEventListener: (_event, cb) => {
                const idx = listeners.indexOf(cb);
                if (idx >= 0) listeners.splice(idx, 1);
            },
            addListener: (cb) => listeners.push(cb),
            removeListener: (cb) => {
                const idx = listeners.indexOf(cb);
                if (idx >= 0) listeners.splice(idx, 1);
            },
            dispatchEvent: vi.fn()
        }));

        try {
            const { container } = render(<AnimatedMantaRay respectReducedMotion />);
            expect(listeners.length).toBeGreaterThan(0);

            act(() => {
                listeners.forEach((cb) => cb({ matches: true }));
            });

            const shadowEl = container.querySelector('g[transform*="translate(268 292)"]');
            expect(shadowEl).not.toBeNull();
            expect(shadowEl.getAttribute('transform')).toBe('translate(268 292) rotate(-31)');
            expect(shadowEl.getAttribute('opacity')).toBe('0.32');

            const motes = container.querySelectorAll('circle[r]');
            expect(motes.length).toBeGreaterThan(0);
            motes.forEach((mote) => {
                expect(mote.getAttribute('opacity')).toBe('0');
            });
        } finally {
            window.matchMedia = originalMatchMedia;
        }
    });

    it('renders AnimatedMantaRay on both Login and WelcomeScreen entrance views', () => {
        render(<Login />);
        expect(screen.getByRole('img', { name: 'Método Arraia' })).toBeTruthy();
        expect(screen.getByText('MÉTODO ARRAIA')).toBeTruthy();
        cleanup();

        render(<WelcomeScreen onDismiss={vi.fn()} />);
        expect(screen.getByRole('img', { name: 'Manta Logo' })).toBeTruthy();
        expect(screen.getByText('Bem-vindo')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Entrar no Método Arraia' })).toBeTruthy();
    });
});
