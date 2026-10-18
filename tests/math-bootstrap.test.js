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
        const resultado = bootstrapCI([], media);
        expect(resultado.estimate).toBe(0);
        expect(resultado.n).toBe(0);
    });

    it('Deve lidar com amostras contendo valores não numéricos', () => {
        const dados = [10, "20", NaN, 30];
        const media = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
        const resultado = bootstrapCI(dados, media);
        expect(resultado.n).toBe(3); // 10, 20, 30
        expect(resultado.estimate).toBe(20);
    });

    it('Deve lidar com funções estatísticas que retornam valores não finitos', () => {
        const dados = [1, 2, 3];
        const badStat = (arr) => arr.length > 2 ? NaN : 10;
        const resultado = bootstrapCI(dados, badStat, { iterations: 200 });
        // O fallback deve ser o estimate original (10 se n <= 2, mas aqui n=3 so estimate é NaN)
        // Se estimate for NaN, ele continua sendo NaN.
        expect(resultado.estimate).toBeNaN();
    });

    it('Deve cobrir o caso lo === hi no cálculo de quartil', () => {
        const dados = [1, 2, 3, 4, 5];
        const media = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
        // iters = 200. idx = 199 * p. Se idx = 4, p = 4/199. alpha = 8/199 ~ 0.040201
        const resultado = bootstrapCI(dados, media, { iterations: 200, alpha: 8/199 });
        expect(resultado.low).toBeDefined();
    });

    it('Deve lidar com amostras nulas ou indefinidas', () => {
        const media = (arr) => arr.length;
        expect(bootstrapCI(null, media).n).toBe(0);
        expect(bootstrapCI(undefined, media).n).toBe(0);
    });
});
