import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';

// E-03
import {
  RX_SYSTEM_ALERT_TEST,
  RX_SYSTEM_ALERT_GLOBAL,
  RX_BRACKET_TOPIC
} from '../coachText.js';

// E-04
import { repairContestHistory } from '../../store/schemas.js';

// E-05
import { getSafeScore } from '../scoreHelper.js';

// E-06, E-07
import { buildCumulativeStatsPerDate } from '../../hooks/useChartData.js';

// E-09
import { computeTrendStatus } from '../trendStatus.js';

// E-12
import { detectRegimeTransition } from '../adaptiveEngine.js';

// E-13
import { average, averageOrZero } from '../../engine/stats.js';

// E-14, E-15
import { getManausDayRange, getStreakDateKey } from '../dateHelper.js';

// E-16
import { toArray } from '../evolutionGuards.js';

// E-19
import { GaussianPlot } from '../../components/charts/GaussianPlot.jsx';

// E-20
import { computeStackingWeights } from '../calibration.js';

// E-24
import Sidebar from '../../components/Sidebar.jsx';

// E-26
import { useAppStore } from '../../store/useAppStore.js';

// E-31
import { getCombinedHistory } from '../coachLogic.js';

describe('Patches E-01 to E-35 Verification Suite', () => {
  // E-03 — Regexes válidas
  describe('E-03: Regexes em coachText.js', () => {
    it('valida detecção e captura correta de colchetes e alertas', () => {
      expect(RX_SYSTEM_ALERT_TEST.test('[ALERTA MESTRE]')).toBe(true);
      expect(RX_SYSTEM_ALERT_TEST.test('ALERTA')).toBe(false);

      expect('[ALERTA MESTRE] teste'.replace(RX_SYSTEM_ALERT_GLOBAL, '')).toBe(' teste');

      const match = RX_BRACKET_TOPIC.exec('[Tópico] conteúdo');
      expect(match[1]).toBe('Tópico');
      expect(match[2]).toBe('conteúdo');
    });
  });

  // E-04 — repairContestHistory com array de scores puros
  describe('E-04: repairContestHistory com score puro', () => {
    it('mantém score e cria volume sintético sem zerar dados', () => {
      const repaired = repairContestHistory([{ score: 85 }], 100, 0);

      expect(repaired[0].score).toBe(85);
      expect(repaired[0].total).toBeGreaterThan(0);
      expect(repaired[0].correct).toBeGreaterThan(0);
      expect(repaired[0].syntheticVolume).toBe(true);
    });
  });

  // E-05 — getSafeScore respeita minScore e maxScore
  describe('E-05: getSafeScore com minScore e maxScore', () => {
    it('calcula pontos respeitando escalas arbitrárias e valores vazios', () => {
      expect(getSafeScore({ correct: 18, total: 20 }, 100, 0)).toBe(90);
      expect(getSafeScore({ correct: 18, total: 20 }, 120, 20)).toBe(110);
      expect(getSafeScore({ score: 75 }, 100, 0)).toBe(75);
      expect(Number.isNaN(getSafeScore({}, 100, 0))).toBe(true);
    });
  });

  // E-07 — buildCumulativeStatsPerDate isola realTotal e compTotal
  describe('E-07: buildCumulativeStatsPerDate com percent-only', () => {
    it('não contamina realTotal em registros percent-only', () => {
      const history = [{ date: '2026-01-01', score: 80 }];
      const result = buildCumulativeStatsPerDate(history, ['2026-01-01'], 100, 0);

      expect(result['2026-01-01'].stats.realTotal).toBe(0);
      expect(result['2026-01-01'].stats.compTotal).toBeGreaterThan(0);
      expect(result['2026-01-01'].stats.hasSynthetic).toBe(true);
    });
  });

  // E-09 — Tendência
  describe('E-09: computeTrendStatus sensibilidade e guarda', () => {
    it('produz neutro em movimento muito sutil e detecta variação real', () => {
      expect(computeTrendStatus([80, 81]).tone).toBe('neutral');
      expect(computeTrendStatus([70, 71, 72, 73, 85, 90, 95]).tone).not.toBe('neutral');
    });
  });

  // E-12 — detectRegimeTransition respeita minScore
  describe('E-12: detectRegimeTransition com escala negativa', () => {
    it('detecta transição com notas na faixa negativa', () => {
      const result = detectRegimeTransition([-20, -10, 0, 10], {
        minScore: -50,
        maxScore: 100,
        minHistory: 4
      });

      expect(result).toBeTruthy();
      expect(result.currentState).toBeDefined();
    });
  });

  // E-13 — average retorna NaN para array vazio
  describe('E-13: average e averageOrZero', () => {
    it('retorna NaN para vazio e calcula média quando há dados', () => {
      expect(Number.isNaN(average([]))).toBe(true);
      expect(average([10, 20])).toBe(15);
      expect(averageOrZero([])).toBe(0);
    });
  });

  // E-14 — getManausDayRange
  describe('E-14: getManausDayRange', () => {
    it('retorna limites numéricos válidos e ordem start < end', () => {
      const range = getManausDayRange(new Date());
      expect(range.start).not.toBeNaN();
      expect(range.end).toBeGreaterThan(range.start);
    });
  });

  // E-15 — getStreakDateKey
  describe('E-15: getStreakDateKey', () => {
    it('retorna string de data no padrão YYYY-MM-DD', () => {
      expect(getStreakDateKey(new Date())).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  // E-16 — toArray
  describe('E-16: toArray normalização', () => {
    it('converte tanto arrays quanto objetos em arrays de valores', () => {
      expect(toArray({ 0: 'a', 1: 'b' })).toHaveLength(2);
      expect(toArray(['a', 'b'])).toHaveLength(2);
    });
  });

  // E-19 — GaussianPlot com volatilidade zero
  describe('E-19: GaussianPlot com volatilidade 0', () => {
    it('renderiza GaussianPlot sem divisão por zero ou exceção', () => {
      expect(() => render(<GaussianPlot mean={70} volatility={0} />)).not.toThrow();
    });
  });

  // E-20 — Ensemble AIC / stacking weights
  describe('E-20: computeStackingWeights estabilidade e escala', () => {
    it('gera pesos finitos que somam 1', () => {
      const weights = computeStackingWeights(
        [[0.2, 0.4, 0.6, 0.8], [0.3, 0.5, 0.7, 0.9]],
        [0, 0, 1, 1],
        [0, 2]
      );
      expect(weights.every(Number.isFinite)).toBe(true);
      expect(weights.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 5);
    });
  });

  // E-26 — useAppStore lastUpdated inicial
  describe('E-26: lastUpdated no estado inicial', () => {
    it('inicializa lastUpdated como null e não como epoch 1970', () => {
      expect(useAppStore.getState().appState.lastUpdated).toBeNull();
    });
  });

  // E-31 — Dedupe de simulados
  describe('E-31: getCombinedHistory dedupe preserves correct: 0', () => {
    it('não colapsa simulado zerado com simulado indefinido', () => {
      const sZero = { subject: 'Dir', date: '2026-05-01', total: 50, correct: 0, score: 0 };
      const sMissing = { subject: 'Dir', date: '2026-05-01', total: 50, correct: undefined, score: 50 };

      const res = getCombinedHistory([], [sZero, sMissing], 100, 0);
      expect(res.length).toBe(2);
    });
  });
});
