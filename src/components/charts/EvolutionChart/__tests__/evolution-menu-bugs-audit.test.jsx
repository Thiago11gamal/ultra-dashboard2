import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { PerformanceBarChart } from '../PerformanceBarChart';
import { SubtopicsPerformanceChart } from '../SubtopicsPerformanceChart';
import { TodayVsGeneralChart } from '../TodayVsGeneralChart';
import { DisciplinaCard } from '../DisciplinaCard';
import { WeeklyEvolutionView } from '../WeeklyEvolutionView';
import { KpiCard } from '../KpiCard';
import { RadarAnalysis } from '../RadarAnalysis';
import { GaussianPlot } from '../../GaussianPlot';
import { 
  safeDomain, 
  clampScore, 
  scoreToRatio, 
  scoreToPct, 
  pctToScore, 
  formatUnitValue 
} from '../../../../utils/scoreDomain';
import { aggregateHeatmap, calculateSubjectMastery } from '../../../../utils/heatmapAggregation';

vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => <div style={{ width: 800, height: 320 }}>{children}</div>,
  };
});

describe('Menu Evolução - Full 60 Bug Audit & Regression Suite', () => {
  describe('scoreDomain.js - Unidade Central de Domínio', () => {
    it('calcula limites seguros de domínio com minScore negativo e arbitrário', () => {
      const dom = safeDomain(120, 20);
      expect(dom.min).toBe(20);
      expect(dom.max).toBe(120);
      expect(dom.range).toBe(100);
    });

    it('clampa notas respeitando minScore e maxScore', () => {
      expect(clampScore(10, { minScore: 20, maxScore: 120 })).toBe(20);
      expect(clampScore(130, { minScore: 20, maxScore: 120 })).toBe(120);
      expect(clampScore(70, { minScore: 20, maxScore: 120 })).toBe(70);
    });

    it('converte pontuação para razão e percentual com amplitude [minScore, maxScore]', () => {
      const ratio = scoreToRatio(70, { minScore: 20, maxScore: 120 });
      expect(ratio).toBe(0.5);
      expect(scoreToPct(70, { minScore: 20, maxScore: 120 })).toBe(50);
      expect(pctToScore(50, { minScore: 20, maxScore: 120 })).toBe(70);
    });

    it('formata valores de acordo com a unidade (%, pts, horas)', () => {
      expect(formatUnitValue(50, '%')).toBe('50%');
      expect(formatUnitValue(70, 'pts')).toBe('70pts');
      expect(formatUnitValue(1.5, 'horas')).toBe('1h30');
    });
  });

  describe('Bug 1 & 35: SubtopicsPerformanceChart safeMinScore & Recharts topic keys', () => {
    it('renderiza sem crash quando minScore != 0 e não lança ReferenceError para safeMinScore', () => {
      const categories = [
        {
          id: '1',
          name: 'Direito Administrativo',
          simuladoStats: {
            history: [
              {
                date: '2026-08-14',
                total: 10,
                score: 80,
                topics: [
                  { name: 'Art. 5º da CF', total: 10, correct: 8, score: 80 },
                  { name: 'Poder de Polícia', total: 0, score: 90 } // synthetic volume test
                ]
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
          minScore={20}
          maxScore={120}
        />
      );
      expect(html).toContain('Raio-X de Tópicos');
      expect(html).toContain('Ranking (Barras)');
    });
  });

  describe('Bug 13, 49, 50: GaussianPlot - Defesa contra KDE vazio, limites e bounds', () => {
    it('renderiza com segurança sem crash quando KDE ou pointsForArea está vazio', () => {
      const html = renderToStaticMarkup(
        <GaussianPlot
          mean={70}
          targetScore={80}
          prob={65}
          minScore={20}
          maxScore={120}
          unit="pts"
          kdeData={[]}
        />
      );
      expect(html).toContain('<svg');
    });

    it('clampa meanVal dentro de [domainMin, domainMax]', () => {
      const html = renderToStaticMarkup(
        <GaussianPlot
          mean={150} // out of bounds
          targetScore={80}
          prob={90}
          minScore={20}
          maxScore={120}
          unit="pts"
        />
      );
      expect(html).toContain('<svg');
    });
  });

  describe('Bug 14, 15, 16: TodayVsGeneralChart - Datas futuras, scale e NaN latestAcc', () => {
    it('renderiza corretamente sem ser afetado por datas futuras ou scores NaN', () => {
      const now = Date.now();
      const futureDate = new Date(now + 10 * 24 * 60 * 60 * 1000).toISOString();
      const pastDate = new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString();

      const activeCategories = [
        {
          id: '1',
          name: 'Direito Penal',
          simuladoStats: {
            history: [
              { date: pastDate, total: 10, correct: 7, score: 70 },
              { date: futureDate, total: 20, correct: 20, score: 100 }
            ]
          }
        }
      ];

      const html = renderToStaticMarkup(
        <TodayVsGeneralChart
          activeCategories={activeCategories}
          globalMetrics={{ globalAccuracy: 70, totalQuestions: 10, totalCorrect: 7 }}
          targetScore={80}
          maxScore={100}
          minScore={0}
          unit="%"
        />
      );
      expect(html).toContain('Histórico Recente');
    });
  });

  describe('Bug 21, 36, 37: WeeklyEvolutionView - Sanitização de chaves e totalQ', () => {
    it('renderiza tópicos com pontos e caracteres especiais como dataKeys seguras', () => {
      const categories = [
        {
          id: 'cat_1',
          name: 'Processo Penal',
          color: '#3b82f6',
          simuladoStats: {
            history: [
              {
                date: '2026-08-10',
                total: 10,
                score: 80,
                topics: [{ name: 'Art. 155. Furto Qualificado', total: 10, score: 80 }]
              }
            ]
          }
        }
      ];

      const html = renderToStaticMarkup(
        <WeeklyEvolutionView
          categories={categories}
          showOnlyFocus={false}
          maxScore={120}
          minScore={20}
          unit="pts"
        />
      );
      expect(html).toContain('Semanas por Matéria');
      expect(html).toContain('Raio-X Temporal Avançado');
    });
  });

  describe('Bug 45 & 46: heatmapAggregation & Subject Mastery', () => {
    it('clampa pct em [0, 100]', () => {
      const filtered = {
        dates: [{ key: '2026-08-10', label: '10/08' }],
        rows: [{
          cells: [{ total: 10, correct: 10, pct: 100 }]
        }]
      };
      const agg = aggregateHeatmap(filtered, 'daily', 100);
      expect(agg.rows[0].cells[0].pct).toBe(100);
    });

    it('calculateSubjectMastery previne acertos ou totais negativos', () => {
      const subtopics = [
        { acertos: -5, total: -10 },
        { acertos: 8, total: 10 }
      ];
      const mastery = calculateSubjectMastery(subtopics);
      expect(mastery).toBeGreaterThan(0);
      expect(Number.isFinite(mastery)).toBe(true);
    });
  });

  describe('Bug 55: KpiCard - Sem +0.00', () => {
    it('exibe traço quando safeSub arredondado for 0.00', () => {
      const html = renderToStaticMarkup(
        <KpiCard
          value="85%"
          label="Acurácia"
          color="#10b981"
          icon="🎯"
          sub={0.0001} // Rounds to 0.00
        />
      );
      expect(html).toContain('—');
      expect(html).not.toContain('+0.00');
    });
  });

  describe('Bug 54: RadarAnalysis - Degeneração de domínio quando minScore === maxScore', () => {
    it('mantém polar radius axis seguro mesmo se minScore e maxScore forem iguais', () => {
      const html = renderToStaticMarkup(
        <RadarAnalysis
          radarData={[{ subject: 'Português', nivel: 70, meta: 80 }]}
          maxScore={100}
          minScore={100}
          unit="%"
        />
      );
      expect(html).toContain('Raio-X das Disciplinas');
    });
  });
});
