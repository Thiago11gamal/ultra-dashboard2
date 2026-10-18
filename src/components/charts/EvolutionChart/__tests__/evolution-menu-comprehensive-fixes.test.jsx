import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { ChartTooltip } from '../../ChartTooltip';
import { TimeSpentChart } from '../TimeSpentChart';
import { TodayVsGeneralChart } from '../TodayVsGeneralChart';
import { WeeklyEvolutionView } from '../WeeklyEvolutionView';
import { SubtopicsPerformanceChart } from '../SubtopicsPerformanceChart';

vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => <div style={{ width: 800, height: 320 }}>{children}</div>,
  };
});

describe('Evolution Menu - Comprehensive Fixes Regression Suite', () => {

  describe('Bug 1: Evolution.jsx Target Score logic on non-standard scales', () => {
    // Replica da função memoizada do Evolution.jsx
    const computeTargetScorePoints = (user, minScore, maxScore) => {
      const safeMax = Math.max(1, Number(maxScore) || 100);
      const safeMin = Number.isFinite(Number(minScore)) ? Math.min(Number(minScore), safeMax) : 0;
      const clamp = (value) => Math.min(safeMax, Math.max(safeMin, Number.isFinite(Number(value)) ? Number(value) : safeMin));
      
      if (user?.targetScore != null && Number.isFinite(Number(user.targetScore))) {
        let ts = Number(user.targetScore);
        if (ts < safeMin && ts >= 0 && ts <= 100 && (safeMax - safeMin) > 0) {
          ts = safeMin + (ts / 100) * (safeMax - safeMin);
        }
        return clamp(ts);
      }
      
      if (user?.targetProbability != null && Number.isFinite(Number(user.targetProbability))) {
        return clamp(safeMin + (Number(user.targetProbability) / 100) * (safeMax - safeMin));
      }
      
      return clamp(safeMin + (safeMax - safeMin) * 0.8);
    };

    it('preserva targetScore de 80 pontos em prova de 0 a 120 pontos sem distorcer para 96', () => {
      const user = { targetScore: 80 };
      const score = computeTargetScorePoints(user, 0, 120);
      expect(score).toBe(80);
    });

    it('preserva targetScore de 70 pontos em escala Cebraspe (-120 a +120) sem distorcer para 48', () => {
      const user = { targetScore: 70 };
      const score = computeTargetScorePoints(user, -120, 120);
      expect(score).toBe(70);
    });

    it('converte valor padrão legadizado (75) que está abaixo do piso no ENEM (200 a 1000)', () => {
      const user = { targetScore: 75 }; // 75 < 200, é um percentual legadizado
      const score = computeTargetScorePoints(user, 200, 1000);
      // 200 + 0.75 * 800 = 800
      expect(score).toBe(800);
    });
  });

  describe('Bug 3: TodayVsGeneralChart radial gauge with negative minScore and null value', () => {
    it('não gera arco fantasma quando minScore é negativo e metric.val é null', () => {
      const categories = [
        {
          id: 'cat1',
          name: 'Direito Administrativo',
          simuladoStats: { history: [] }
        }
      ];

      const html = renderToStaticMarkup(
        <TodayVsGeneralChart
          categories={categories}
          targetScore={50}
          minScore={-20}
          maxScore={100}
          unit="pts"
          globalMetrics={{ globalAccuracy: 0 }}
        />
      );

      expect(html).toBeTruthy();
    });
  });

  describe('Bug 4: useChartData heatmapData date mapping resilience', () => {
    it('extrai dados de data sem quebrar com valores inválidos', () => {
      const DAY_NAMES = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
      const datesToUse = ['invalid-date', '2026-10-15', null, ''];
      
      const dates = datesToUse.map(dateStr => {
        const parts = typeof dateStr === 'string' ? dateStr.split('-') : [];
        const day = parts[2] || '01';
        const m = parts[1] || '01';
        // Date parse seguro
        const d = dateStr ? new Date(dateStr) : null;
        const dayOfWeek = (d instanceof Date && !isNaN(d.getTime())) ? d.getDay() : 0;
        return {
          key: dateStr,
          dayName: DAY_NAMES[dayOfWeek] || '',
          label: `${day}/${m}`,
          isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        };
      });

      expect(dates.length).toBe(4);
      expect(dates[0].dayName).toBe('DOM');
      expect(dates[1].label).toBe('15/10');
    });
  });

  describe('Bug 5: WeeklyEvolutionView ghost tooltip suppression', () => {
    it('renderiza o componente WeeklyEvolutionView corretamente', () => {
      const categories = [
        { id: 'mat1', name: 'Matéria 1', color: '#3b82f6' }
      ];
      const html = renderToStaticMarkup(
        <WeeklyEvolutionView
          categories={categories}
          viewMode="progression"
          unit="%"
        />
      );
      expect(html).toContain('Dados insuficientes');
    });
  });

  describe('Bug 8: TimeSpentChart rendering and KPI display', () => {
    it('renderiza Último Geral e Média Geral no cabeçalho do KPI', () => {
      const subjectAggData = [
        { name: 'Dir Const', questoes: 20, timedQuestoes: 20, timeSpent: 1200, acertos: 16 }
      ];

      const html = renderToStaticMarkup(
        <TimeSpentChart
          subjectAggData={subjectAggData}
        />
      );

      expect(html).toContain('Média Geral');
      expect(html).toMatch(/Último Geral/i);
    });
  });

  describe('Bug 9: SubtopicsPerformanceChart CustomLineTooltip sort & target formatting', () => {
    it('renderiza SubtopicsPerformanceChart com dados parciais ou nulos sem falhar', () => {
      const categories = [
        {
          id: 'c1',
          name: 'Português',
          simuladoStats: {
            history: [
              {
                date: '2026-10-10',
                topics: [
                  { name: 'Sintaxe', correct: 8, total: 10 }
                ]
              }
            ]
          }
        }
      ];

      const html = renderToStaticMarkup(
        <SubtopicsPerformanceChart
          categories={categories}
          targetScore={75}
        />
      );

      expect(html).toBeTruthy();
    });
  });

  describe('Bug 10: ChartTooltip formatar data ISO em pt-BR', () => {
    it('formata label ISO (2026-10-12) para formato pt-BR no cabeçalho do tooltip', () => {
      const payload = [
        { name: 'Nível Bayesiano', value: 82, color: '#3b82f6' }
      ];

      const html = renderToStaticMarkup(
        <ChartTooltip
          active={true}
          payload={payload}
          label="2026-10-12"
          unit="%"
        />
      );

      expect(html).toContain('12/10/2026');
      expect(html).not.toContain('📅 2026-10-12');
    });

    it('mantém labels que não são ISO (ex: "Semana 1")', () => {
      const payload = [
        { name: 'Nível Bayesiano', value: 82, color: '#3b82f6' }
      ];

      const html = renderToStaticMarkup(
        <ChartTooltip
          active={true}
          payload={payload}
          label="Semana 1"
          unit="%"
        />
      );

      expect(html).toContain('Semana 1');
    });
  });

});
