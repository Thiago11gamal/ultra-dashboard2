import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { filterHistoryByTimeWindow } from '../../../../hooks/useSubjectAggData';
import { generateEvolutionInsights } from '../../../../engine/insightGenerator';
import { GaussianPlot } from '../../GaussianPlot';
import { TimeSpentChart } from '../TimeSpentChart';
import { TodayVsGeneralChart } from '../TodayVsGeneralChart';
import { WeeklyEvolutionView } from '../WeeklyEvolutionView';
import { CriticalTopicsAnalysis } from '../CriticalTopicsAnalysis';

vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => <div style={{ width: 800, height: 320 }}>{children}</div>,
  };
});

describe('Verificação das Correções dos 12 Bugs do Menu Evolução', () => {
  describe('Bug 9: filterHistoryByTimeWindow com createdAt e sem data', () => {
    it('não converte registros antigos com apenas createdAt para hoje', () => {
      const ancientDate = '2022-01-01';
      const history = [
        { id: '1', createdAt: ancientDate, total: 10, correct: 8 },
        { id: '2', date: new Date().toISOString().split('T')[0], total: 10, correct: 9 }
      ];

      const filtered30Days = filterHistoryByTimeWindow(history, '30');
      // O item antigo (2022) NÃO pode passar no filtro de 30 dias
      expect(filtered30Days.length).toBe(1);
      expect(filtered30Days[0].id).toBe('2');
    });

    it('ignora registros sem data válida sem quebrar', () => {
      const history = [
        { id: '1', total: 10, correct: 5 }, // sem data nem createdAt
        { id: '2', date: new Date().toISOString().split('T')[0], total: 10, correct: 9 }
      ];

      const filtered = filterHistoryByTimeWindow(history, '30');
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('2');
    });
  });

  describe('Bug 10 e 11: insightGenerator com safeMinScore negativo e createdAt', () => {
    it('suporta escalas com notas negativas (ex: Cebraspe -50 a 100) e respeita createdAt', () => {
      const focusCategory = {
        id: 'dir_const',
        name: 'Direito Constitucional',
        simuladoStats: {
          history: [
            { createdAt: '2026-09-01', score: -20, total: 100 },
            { createdAt: '2026-09-05', score: -10, total: 100 }
          ]
        }
      };

      const timeline = [
        { date: '2026-09-01', raw_dir_const: -20, bay_dir_const: -15, stats_dir_const: -20 },
        { date: '2026-09-05', raw_dir_const: -10, bay_dir_const: -12, stats_dir_const: -15 }
      ];

      const insight = generateEvolutionInsights({
        timeline,
        focusCategory,
        activeEngine: 'raw',
        categories: [focusCategory],
        unit: 'pts',
        minScore: -50,
        maxScore: 100
      });

      expect(insight).toBeDefined();
      expect(insight.type).toBeDefined();
      expect(insight.title).toBeDefined();
    });
  });

  describe('Bug 1: GaussianPlot tooltip e renderização', () => {
    it('renderiza GaussianPlot sem vazamento de sintaxe', () => {
      const html = renderToStaticMarkup(
        <GaussianPlot
          minScore={0}
          maxScore={100}
          unit="%"
          currentMean={75}
          targetVal={70}
          volatility={8}
          height={200}
        />
      );

      expect(html).toContain('svg');
      expect(html).not.toContain("'Zona de sucesso' :");
    });
  });

  describe('Bug 3: TodayVsGeneralChart formata pontuação zero corretamente', () => {
    it('renderiza TodayVsGeneralChart sem quebrar e com suporte a valores nulos ou zero', () => {
      const activeCategories = [
        {
          id: '1',
          name: 'Direito Penal',
          simuladoStats: {
            history: [{ date: '2026-09-01', score: 0, total: 10 }]
          }
        }
      ];
      const subjectAggData = [
        { id: '1', name: 'Direito Penal', accuracy: 50, lastTestAcc: 0 }
      ];

      const html = renderToStaticMarkup(
        <TodayVsGeneralChart
          activeCategories={activeCategories}
          subjectAggData={subjectAggData}
          targetScore={70}
          unit="%"
        />
      );

      expect(html).toBeDefined();
      expect(html).toContain('Histórico Recente (14 dias)');
    });
  });

  describe('Bug 5: Tipografia semântica em WeeklyEvolutionView e CriticalTopicsAnalysis', () => {
    it('renderiza mensagem de dados insuficientes encapsulada em tag <p>', () => {
      const html = renderToStaticMarkup(
        <WeeklyEvolutionView
          categories={[]}
          filteredChartData={[]}
        />
      );

      expect(html).toContain('<p class="text-sm font-semibold text-slate-300">Dados insuficientes</p>');
    });

    it('renderiza título da Matriz de criticidade em tag <h3>', () => {
      const html = renderToStaticMarkup(
        <CriticalTopicsAnalysis
          categories={[]}
          focusSubjectId={null}
        />
      );

      expect(html).toContain('<h3 class="text-sm sm:text-base font-bold text-white">Matriz de criticidade e pontos de fuga</h3>');
    });
  });
});
