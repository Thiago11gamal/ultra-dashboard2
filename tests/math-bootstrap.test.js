import { describe, it, expect } from 'vitest';
import { bootstrapCI } from '../src/engine/math/bootstrap.js';

describe('Motor Matemático: Bootstrap CI', () => {
    it('Deve calcular o intervalo de confiança para a média', () => {
        const dados = [10, 11, 12, 13, 14, 15, 16];
        const media = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;

        const resultado = bootstrapCI(dados, media, { iterations: 500 });

        expect(resultado.estimate).toBe(13);
        expect(resultado.low).toBeLessThan(13);
        expect(resultado.high).toBeGreaterThan(13);
        expect(resultado.n).toBe(dados.length);
    });

    it('Deve ser determinístico se o seed for fornecido', () => {
        const dados = [1, 5, 10, 20];
        const media = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;

        const res1 = bootstrapCI(dados, media, { seed: 123 });
        const res2 = bootstrapCI(dados, media, { seed: 123 });

        expect(res1.low).toBe(res2.low);
        expect(res1.high).toBe(res2.high);
    });

    it('Deve lidar com arrays vazios retornando zeros', () => {
        const media = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
        it('Deve lidar com amostras nulas ou indefinidas', () => {
            const media = (arr) => arr.length;
            expect(bootstrapCI(null, media).n).toBe(0);
            expect(bootstrapCI(undefined, media).n).toBe(0);
        });
    });
