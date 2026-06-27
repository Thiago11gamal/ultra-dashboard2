import { describe, it, expect } from 'vitest';
import { calcularVariancia } from '../src/engine/variance.js';

describe('calcularVariancia Welford stability', () => {
    it('não deve explodir com 1 milhão de valores extremos', () => {
        const data = [];
        for (let i = 0; i < 1_000_000; i++) {
            data.push((Math.random() - 0.5) * Math.pow(10, Math.random() * 6));
        }
        const variance = calcularVariancia(data);
        expect(Number.isFinite(variance)).toBe(true);
        expect(variance).toBeGreaterThan(0);
        expect(variance).toBeLessThan(1e20);
    });

    it('retorna 0 para arrays vazios ou com 1 elemento', () => {
        expect(calcularVariancia([])).toBe(0);
        expect(calcularVariancia([42])).toBe(0);
    });

    it('calcula variância correta para série simples', () => {
        const variance = calcularVariancia([2, 4, 4, 4, 5, 5, 7, 9]);
        expect(variance).toBeCloseTo(4.5714, 2);
    });
});