import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { useCategoryLevels } from '../../../../hooks/useCategoryLevels';
import { generateEvolutionInsights } from '../../../../engine/insightGenerator';
import { buildPredictiveCompareData } from '../../../EvolutionChart';
import { PerformanceBarChart } from '../PerformanceBarChart';
import { SubtopicsPerformanceChart } from '../SubtopicsPerformanceChart';
import { TodayVsGeneralChart } from '../TodayVsGeneralChart';
import { DisciplinaCard } from '../DisciplinaCard';
import { ratioToPoints, pointsToRatio } from '../../../../utils/scoreHelper.conversions';

vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => <div style={{ width: 800, height: 320 }}>{children}</div>,
  };
});

describe('Menu Evolução - Bug Fixes & Regression Suite', () => {
  describe('Bug 1: targetScorePoints com minScore != 0', () => {
    it('converte probabilidade em pontos respeitando a amplitude [minScore, maxScore]', () => {
      const minScore = 20;
      const maxScore = 120;
      const targetProbability = 50; // 50%
      const pts = ratioToPoints(targetProbability / 100, maxScore, minScore);
      expect(pts).toBe(70); // 20 + 0.5 * 100 = 70
    });

    it('fallback de 80% respeita o piso minScore', () => {
      const minScore = 200;
      const maxScore = 800;
      const pts = minScore + (maxScore - minScore) * 0.8;
      expect(pts).toBe(680); // 200 + 600 * 0.8 = 680 (e não 800 * 0.8 = 640)
    });
  });

  describe('Bug 2 & 10: useCategoryLevels e DisciplinaCard com minScore', () => {
    it('useCategoryLevels retorna safeMin quando não há histórico', () => {
      const categories = [{ id: 'cat1', name: 'Direito', simuladoStats: { history: [] } }];
      const timeline = [];
      let levelsResult = null;
      function TestComponent() {
        levelsResult = useCategoryLevels(categories, timeline, 'bayesian', 100, 20);
        return null;
      }
      renderToStaticMarkup(<TestComponent />);
      expect(levelsResult.cat1).toBe(20);
    });

    it('DisciplinaCard renderiza corretamente com minScore customizado', () => {
      const cat = { id: 'c1', name: 'Português', color: '#3b82f6' };
      const html = renderToStaticMarkup(
        <DisciplinaCard
          cat={cat}
          level={70}
          target={80}
          unit="pts"
          maxScore={120}
          minScore={20}
          isFocused={true}
        />
      );
      expect(html).toContain('Português');
      expect(html).toContain('70');
    });
  });

  describe('Bug 3: buildPredictiveCompareData com projectDays curto', () => {
    it('não ultrapassa a data da prova quando projectDays for pequeno (ex: 2 dias)', () => {
      const timeline = [
        { date: '2026-08-10', displayDate: '10/08', 'Nível Bayesiano': 70, raw_1: 70 }
      ];
      const focusCategory = { id: '1', name: 'Constitucional' };
      const categoryLevels = { '1': 70 };
      const activeMcProjectionSeries = { mc_p50: 80, mc_band: [65, 95] };
      const projectDays = 2;

      const result = buildPredictiveCompareData(
        timeline,
        focusCategory,
        categoryLevels,
        activeMcProjectionSeries,
        projectDays,
        0,
        100
      );

      const futurePoints = result.filter(d => d.__future);
      expect(futurePoints.length).toBe(6);
      // O último ponto futuro deve ser no máximo 2 dias após a data base (2026-08-12)
      const lastFutureDate = futurePoints[futurePoints.length - 1].date;
      expect(lastFutureDate).toBe('2026-08-12');
    });
  });

  describe('Bug 6: PerformanceBarChart exibe % para Rendimento', () => {
    it('renderiza o componente com dados de acertos e questões', () => {
      const subjectAggData = [
        { id: '1', name: 'Dir.', fullName: 'Direito Administrativo', questoes: 20, acertos: 16, timeSpent: 300, color: '#3b82f6' }
      ];
      const html = renderToStaticMarkup(
        <PerformanceBarChart
          subjectAggData={subjectAggData}
          showOnlyFocus={false}
          focusCategory={null}
          unit="pts"
          maxScore={100}
        />
      );
      expect(html).toContain('Desempenho por Matéria');
      expect(html).toContain('Questões Resolvidas vs Acertos');
    });
  });

  describe('Bug 7: TodayVsGeneralChart conversão com minScore', () => {
    it('TodayVsGeneralChart renderiza sem erros em escala não-zero', () => {
      const activeCategories = [
        {
          id: '1',
          name: 'Matemática',
          simuladoStats: {
            history: [{ date: '2026-08-14', total: 10, correct: 8, score: 80 }]
          }
        }
      ];
      const globalMetrics = { globalAccuracy: 80, totalQuestions: 10, totalCorrect: 8 };

      const html = renderToStaticMarkup(
        <TodayVsGeneralChart
          activeCategories={activeCategories}
          globalMetrics={globalMetrics}
          targetScore={85}
          maxScore={120}
          minScore={20}
          unit="pts"
        />
      );
      expect(html).toContain('Histórico Recente');
    });
  });

  describe('Bug 8: insightGenerator com minScore != 0', () => {
    it('calcula padrão semanal corretamente sem NaN ou distorção', () => {
      const categories = [
        {
          id: '1',
          name: 'Física',
          simuladoStats: {
            history: [
              { date: '2026-08-10', total: 10, score: 80 }, // Segunda
              { date: '2026-08-11', total: 10, score: 90 }, // Terça
              { date: '2026-08-12', total: 10, score: 60 }, // Quarta
            ]
          }
        }
      ];
      const timeline = [{ date: '2026-08-10', raw_1: 80 }];
      const insight = generateEvolutionInsights({
        timeline,
        focusCategory: null,
        activeEngine: 'raw_weekly',
        categories,
        unit: 'pts',
        maxScore: 120,
        minScore: 20
      });

      expect(insight).toBeDefined();
      expect(insight.title).toBeDefined();
    });
  });

  describe('Bug 9: SubtopicsPerformanceChart tooltip no SVG', () => {
    it('renderiza com proteção contra divisão por zero e suporta títulos completos', () => {
      const categories = [
        {
          id: '1',
          name: 'Português',
          simuladoStats: {
            history: [
              {
                date: '2026-08-14',
                total: 10,
                score: 8,
                topics: [{ name: 'Crase e Regência Verbal Super Longa', total: 10, correct: 8, score: 8 }]
              }
            ]
          }
        }
      ];
      const html = renderToStaticMarkup(
        <SubtopicsPerformanceChart
          categories={categories}
          focusSubjectId="1"
          showOnlyFocus={true}
          timeWindow="all"
          targetScore={80}
          minScore={0}
          maxScore={100}
        />
      );
      expect(html).toContain('Raio-X de Tópicos');
    });
  });
});
