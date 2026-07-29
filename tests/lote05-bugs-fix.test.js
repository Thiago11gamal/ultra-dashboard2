import { describe, it, expect } from 'vitest';
import { toPoints, toPct, toRatio, pointsToPct, pctToPoints, ratioToPoints } from '../src/utils/scoreHelper.js';
import { calculateSlope } from '../src/engine/projection.js';
import { parseNoonLocal } from '../src/utils/dateHelper.js';

describe('LOTE 05 — Hardening e Correção de Bugs Conceituais', () => {
  describe('1. Unidades de Pontuação (scoreHelper)', () => {
    it('toPoints não deve inflar notas brutas pequenas (<= 1) em modo padrão', () => {
      // Bug 1: aluno que tirou 1 ponto em 100 não pode ter a nota transformada em 100 pontos
      expect(toPoints(1, 100)).toBe(1);
      expect(toPoints(0.5, 10)).toBe(0.5);
    });

    it('toPoints não deve interpretar notas brutas em escalas > 100 como porcentagem em modo padrão', () => {
      // Bug 1: 80 pontos numa prova de 0..200 não pode ser interpretado como 80% (160)
      expect(toPoints(80, 200)).toBe(80);
    });

    it('pctToPoints e toPoints(..., "pct") convertem porcentagem adequadamente', () => {
      expect(pctToPoints(80, 200)).toBe(160);
      expect(toPoints(80, 200, 0, 'pct')).toBe(160);
    });

    it('toPct não deve inflar pontos pequenos em provas de escala curta (< 10)', () => {
      // Bug 2: 1 ponto de 10 deve ser 10% (não 100%)
      expect(toPct(1, 10)).toBe(10);
      expect(pointsToPct(5, 20)).toBe(25);
    });
  });

  describe('2. Clamp de calculateSlope com minScore (projection)', () => {
    it('deve limitar a inclinação diária ao range real (maxScore - minScore)', () => {
      // Em escala ENEM (400..1000, range=600), 0.4% por dia = 2.4 pts/dia (não 4.0)
      const clamped = calculateSlope(10, 1000, { minScore: 400 });
      expect(clamped).toBe(2.4);

      const clampedObj = calculateSlope(10, { maxScore: 1000, minScore: 400 });
      expect(clampedObj).toBe(2.4);
    });
  });

  describe('3. Robustez de parseNoonLocal (dateHelper)', () => {
    it('deve ancorar datas ao meio-dia e não regredir anos de 2 dígitos para 1900', () => {
      const d1 = parseNoonLocal('2026-07-29');
      expect(d1.getFullYear()).toBe(2026);
      expect(d1.getHours()).toBe(12);

      const d2 = parseNoonLocal('26-07-29');
      if (d2) {
        expect(d2.getFullYear()).toBe(2026);
      }
    });
  });
});
