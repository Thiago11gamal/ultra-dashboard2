import { describe, it, expect } from 'vitest';
import { normalCDF_complement, asymmetricGaussian, inverseNormalCDF, sampleTruncatedNormal, choleskyDecomposition, generateGaussianPoints, generateKDE, applyCovariance } from '../src/engine/math/gaussian.js';

describe('Motor Matemático: Distribuição Gaussiana', () => {
    
    describe('Cálculo de CDF Complementar (Normal Padrão)', () => {
        it('Deve calcular o CDF complementar correto', () => {
            // normalCDF_complement(z) retorna 1 - P(X <= z)
            // Para z = 0, P(X <= 0) = 0.5, logo complementar = 0.5
            expect(normalCDF_complement(0)).toBeCloseTo(0.5, 5);
            
            // Para z = 1.96, complementar ~ 0.025
            expect(normalCDF_complement(1.96)).toBeCloseTo(0.025, 2);
        });

        it('Deve lidar com limites extremos', () => {
            expect(normalCDF_complement(10)).toBe(0);
            expect(normalCDF_complement(-10)).toBe(1);
        });
    });

    describe('Gaussiana Assimétrica (PDF-like)', () => {
        it('O centro da curva (Média) deve ter a probabilidade mais alta (1.0 por padrão)', () => {
            const probNaMedia = asymmetricGaussian(50, 50, 10, 10);
            const probAfastada = asymmetricGaussian(60, 50, 10, 10);
            expect(probNaMedia).toBe(1); // heightFactor default é 1
            expect(probNaMedia).toBeGreaterThan(probAfastada);
        });

        it('Deve usar o desvio padrão correto dependendo do lado (assimetria)', () => {
            // x < mean usa sdLeft, x > mean usa sdRight
            const valLeft = asymmetricGaussian(40, 50, 5, 20); // 2 SDs para a esquerda (5)
            const valRight = asymmetricGaussian(60, 50, 5, 20); // 0.5 SDs para a direita (20)
            
            // valLeft deve ser menor que valRight porque está mais "longe" em termos de SD
            expect(valLeft).toBeLessThan(valRight);
        });

        it('Deve lidar com SD inválido retornando um valor pequeno mas finito', () => {
            expect(asymmetricGaussian(50, 50, 0, 0)).toBe(1);
        });
    });

    describe('Inverse Normal CDF (Probit)', () => {
        it('Deve mapear probabilidades de volta para Z-scores', () => {
            expect(inverseNormalCDF(0.5)).toBe(0);
            expect(inverseNormalCDF(0.975)).toBeCloseTo(1.96, 2);
            expect(inverseNormalCDF(0.025)).toBeCloseTo(-1.96, 2);
        });

        it('Deve lidar com limites extremos de probabilidade', () => {
            expect(inverseNormalCDF(0)).toBe(-8);
            expect(inverseNormalCDF(1)).toBe(8);
        });
    });

    describe('Amostragem Truncada (Monte Carlo Core)', () => {
        it('Deve gerar valores dentro dos limites solicitados', () => {
            const rng = () => 0.5; // Stub RNG
            const val = sampleTruncatedNormal(70, 10, 0, 100, rng);
            expect(val).toBeGreaterThanOrEqual(0);
            expect(val).toBeLessThanOrEqual(100);
        });

        it('Deve lançar erro se RNG não for fornecido', () => {
            expect(() => sampleTruncatedNormal(70, 10, 0, 100)).toThrow('STRICT_DETERMINISM');
        });

        it('Deve lidar com SD muito baixo retornando a média clampada', () => {
            const rng = () => 0.5;
            expect(sampleTruncatedNormal(70, 0.00001, 0, 100, rng)).toBe(70);
        });

        it('Deve lidar com min > max invertendo-os', () => {
            const rng = () => 0.5;
            const val = sampleTruncatedNormal(50, 10, 100, 0, rng);
            expect(val).toBeGreaterThanOrEqual(0);
            expect(val).toBeLessThanOrEqual(100);
        });

        it('Deve lidar com parâmetros não finitos', () => {
            const rng = () => 0.5;
            expect(sampleTruncatedNormal(NaN, 10, 0, 100, rng)).toBe(50);
            expect(sampleTruncatedNormal(50, 10, NaN, 100, rng)).toBe(50);
        });

        it('Deve lidar com diff de probabilidade extremamente pequena', () => {
            const rng = () => 0.5;
            // Média 1000, SD 1, range [0, 100]. A prob de estar em [0, 100] é quase 0.
            const val = sampleTruncatedNormal(1000, 1, 0, 100, rng);
            expect(val).toBe(100); // Retorna o ponto mais provável no intervalo
        });
    });

    describe('Álgebra Linear (Cholesky e Covariância)', () => {
        it('Deve decompor uma matriz de covariância', () => {
            const matrix = [
                [1, 0.5],
                [0.5, 1]
            ];
            const lower = choleskyDecomposition(matrix);
            expect(lower[0][0]).toBe(1);
            expect(lower[1][0]).toBe(0.5);
            expect(lower[1][1]).toBeCloseTo(Math.sqrt(0.75), 5);
        });

        it('Deve aplicar covariância a um vetor de ruído', () => {
            const matrix = [[1, 0.5], [0.5, 1]];
            const lower = choleskyDecomposition(matrix);
            const noise = [1, 0];
            const correlated = applyCovariance(lower, noise);
            expect(correlated[0]).toBe(1);
            expect(correlated[1]).toBe(0.5);
        });
    });

    describe('Visualização Avançada (KDE)', () => {
        it('Deve gerar densidades KDE para um array de scores', () => {
            const scores = new Float32Array([10, 20, 30, 40, 50]).sort();
            const result = generateKDE(scores, 30, 15, 5, 0, 100);
            expect(result.length).toBeGreaterThan(0);
            expect(result[0]).toHaveProperty('x');
            expect(result[0]).toHaveProperty('y');
            expect(result[0]).toHaveProperty('density');
        });

        it('Deve lidar com arrays vazios no KDE', () => {
            expect(generateKDE([], 30, 15, 5)).toEqual([]);
        });

        it('Deve lidar com plot extremamente estreito (SD baixo)', () => {
            const scores = new Float32Array([50, 50, 50, 50]);
            const result = generateKDE(scores, 50, 0.001, 4, 0, 100);
            expect(result.length).toBeGreaterThan(0);
        });

        it('Deve lidar com plot estreito em fronteiras', () => {
            const scores = new Float32Array([100, 100, 100]);
            const result = generateKDE(scores, 100, 0.001, 3, 0, 100);
            expect(result.length).toBeGreaterThan(0);
        });
    });

    describe('Utilidades de Visualização', () => {
        it('Deve gerar pontos para curvas Gaussianas', () => {
            const points = generateGaussianPoints(0, 100, 10, 50, 10, 10, 1, (v) => v, (v) => v);
            expect(points.length).toBeGreaterThan(10);
            expect(points[0]).toContain(',');
        });
    });
});
