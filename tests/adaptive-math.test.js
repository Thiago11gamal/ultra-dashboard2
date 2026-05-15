import { describe, it, expect } from 'vitest';
import { 
    computeAdaptiveSignal, 
    getConfidenceMultiplier, 
    winsorizeSeries,
    calcSlopeWithSignificance,
    adaptiveConfidenceShrinkage,
    calculateSafeRetention
} from '../src/utils/adaptiveMath.js';

describe('Adaptive Math Utilities - High Precision Audit', () => {
    
    describe('getConfidenceMultiplier (T-Student Interpolation)', () => {
        it('deve retornar valores exatos da tabela T para amostras pequenas (df=1, 2, 3)', () => {
            // df = n - 1
            expect(getConfidenceMultiplier(2)).toBeCloseTo(12.706, 3); // df=1
            expect(getConfidenceMultiplier(3)).toBeCloseTo(4.303, 3);  // df=2
            expect(getConfidenceMultiplier(4)).toBeCloseTo(3.182, 3);  // df=3
        });

        it('deve realizar interpolação log-linear entre graus de liberdade', () => {
            // Para n=3.5 (não-inteiro, se permitido), deve estar entre T(df=2) e T(df=3)
            const m = getConfidenceMultiplier(3.5, { allowFractional: true });
            expect(m).toBeLessThan(4.303);
            expect(m).toBeGreaterThan(3.182);
        });

        it('deve convergir para o valor assintótico Z (1.96) em amostras grandes', () => {
            const largeN = getConfidenceMultiplier(1000);
            expect(largeN).toBeCloseTo(1.96, 2);
            expect(largeN).toBeGreaterThanOrEqual(1.96);
        });
    });

    describe('winsorizeSeries (Memory & NaN Protection)', () => {
        it('deve preservar o comprimento original e lidar com NaNs', () => {
            const values = [10, NaN, 12, 100, 11];
            const result = winsorizeSeries(values, 0.1, 0.9);
            expect(result.length).toBe(5);
            expect(Number.isNaN(result[1])).toBe(true);
        });

        it('deve retornar os valores originais se houver excesso de lixo (>50% NaN)', () => {
            const trash = [NaN, NaN, NaN, 10];
            const result = winsorizeSeries(trash);
            expect(result).toEqual(trash);
        });

        it('deve clampear extremos baseado nos percentis reais', () => {
            const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 100];
            const result = winsorizeSeries(values, 0.1, 0.8); // 80th percentile is 9
            expect(result[9]).toBeLessThan(100);
            expect(result[9]).toBe(9);
            expect(result[0]).toBeGreaterThanOrEqual(1);
        });
    });

    describe('calcSlopeWithSignificance (Temporal Real Deltas)', () => {
        it('deve calcular inclinação correta com X customizado', () => {
            const data = [
                { x: 0, y: 10 },
                { x: 10, y: 20.1 }, // Pequeno ruído para evitar SE=0
                { x: 20, y: 30 }
            ];
            const res = calcSlopeWithSignificance(data);
            expect(res.slope).toBeCloseTo(1.0, 1);
            expect(res.tStat).toBeGreaterThan(10); 
        });

        it('deve retornar zero se N < 3 (insuficiente para SE)', () => {
            const res = calcSlopeWithSignificance([10, 20]);
            expect(res.slope).toBe(0);
            expect(res.se).toBe(0);
        });
    });

    describe('computeAdaptiveSignal (Entropy & Plateau)', () => {
        it('deve detectar platô (estagnação) estatística', () => {
            // Série com oscilação aleatória em torno de 50 (sem tendência clara)
            const noisyPlateau = [50, 52, 48, 51, 49, 50, 52, 48];
            const signal = computeAdaptiveSignal(noisyPlateau);
            expect(signal.isPlateau).toBe(true);
            expect(signal.trendStrength).toBe(0);
        });

        it('deve calcular effectiveN (Kish) corretamente para séries temporais', () => {
            const data = [80, 82, 85];
            const signal = computeAdaptiveSignal(data);
            expect(signal.effectiveN).toBeGreaterThan(1);
            expect(signal.effectiveN).toBeLessThanOrEqual(3);
        });
    });

    describe('adaptiveConfidenceShrinkage (Unified Bayesian logic)', () => {
        it('deve aplicar contração proporcional à incerteza', () => {
            const shrinker = adaptiveConfidenceShrinkage({ 
                sampleSize: 2, 
                calibrationPenalty: 0.5 
            });
            const originalValue = 90;
            const shrunk = shrinker.apply(originalValue);
            // Com N pequeno e penalidade de calibração, deve puxar para o neutro (50)
            expect(shrunk).toBeLessThan(90);
            expect(shrunk).toBeGreaterThan(50);
        });
    });

    describe('calculateSafeRetention (FSRS Engine)', () => {
        it('deve decair conforme o tempo passa (Ebbinghaus modernizado)', () => {
            const s1 = calculateSafeRetention(1, 5); // 1 hora
            const s2 = calculateSafeRetention(48, 5); // 48 horas
            expect(s1).toBeGreaterThan(s2);
        });

        it('deve respeitar o baseline mínimo de retenção (0.2)', () => {
            const deepForget = calculateSafeRetention(10000, 0); 
            expect(deepForget).toBeGreaterThanOrEqual(0.2);
        });
    });
});
