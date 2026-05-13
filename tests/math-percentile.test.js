import { describe, it, expect } from 'vitest';
import { getPercentile } from '../src/engine/math/percentile.js';

describe('Motor Matemático: Percentil', () => {
    it('Deve calcular corretamente a Mediana (Percentil 0.5) de um array ímpar', () => {
        const dados = [1, 2, 3, 4, 5];
        // O motor espera p entre 0 e 1
        expect(getPercentile(dados, 0.5)).toBe(3);
    });

    it('Deve interpolar corretamente arrays de tamanho par', () => {
        const dados = [1, 2, 3, 4];
        // O percentil 0.5 (mediana) de [1,2,3,4] cai exatamente entre 2 e 3 (ou seja, 2.5)
        expect(getPercentile(dados, 0.5)).toBeCloseTo(2.5);
    });

    it('Deve calcular os limites extremos corretamente (Percentil 0 e 1)', () => {
        const dados = [10, 20, 30, 40, 50];
        // P0 é o valor mínimo, P1 é o valor máximo
        expect(getPercentile(dados, 0)).toBe(10);
        expect(getPercentile(dados, 1)).toBe(50);
    });

    it('Deve lidar com arrays não ordenados de forma autónoma', () => {
        const dadosDesorganizados = [50, 10, 30, 40, 20];
        // O motor tem a responsabilidade de ordenar os dados antes de calcular
        expect(getPercentile(dadosDesorganizados, 1)).toBe(50);
    });

    it('Deve proteger contra arrays vazios ou valores inválidos (Edge Cases)', () => {
        expect(getPercentile([], 0.9)).toBe(0); // No código, retorna 0 para arrays vazios
        expect(getPercentile([5], 0.9)).toBe(5); // Com apenas 1 elemento, qualquer percentil é esse elemento
    });

    it('Deve lidar com Float64Array (caminho otimizado)', () => {
        const dados = new Float64Array([10, 20, 30]);
        expect(getPercentile(dados, 0.5)).toBe(20);
    });

    it('Deve filtrar valores não finitos no array', () => {
        const dados = [10, NaN, Infinity, 20];
        expect(getPercentile(dados, 0.5)).toBe(15);
        expect(getPercentile([NaN, Infinity], 0.5)).toBe(0);
    });

    it('Deve retornar 0 se p não for finito', () => {
        expect(getPercentile([1, 2, 3], NaN)).toBe(0);
    });
});
