import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { renderHook } from '@testing-library/react';

import { DisciplinaCard } from '../DisciplinaCard';
import { SubtopicsPerformanceChart } from '../SubtopicsPerformanceChart';
import { TodayVsGeneralChart } from '../TodayVsGeneralChart';
import { ChartTooltip } from '../../ChartTooltip';
import { useCategoryLevels } from '../../../../hooks/useCategoryLevels';
import { useSubjectAggData } from '../../../../hooks/useSubjectAggData';
import { computeEvolutionStatuses } from '../../../../utils/evolutionStatus';
import { getDateKey } from '../../../../utils/dateHelper';

vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => <div style={{ width: 800, height: 320 }}>{children}</div>,
  };
});

describe('Evolution Menu - Data Integrity & Edge Case Fixes', () => {
  describe('Fix 1: DisciplinaCard rawVal fallback', () => {
    it('exibe a nota bruta do último simulado da matéria quando o último dia geral não teve teste nela', () => {
      const cat = {
        id: 'dir_const',
        name: 'Direito Constitucional',
        color: '#3b82f6',
        maxScore: 100,
        minScore: 0,
        simuladoStats: {
          history: [
            { date: '2026-08-01', score: 75, total: 20, correct: 15 },
            { date: '2026-08-10', score: 85, total: 20, correct: 17 }
          ]
        }
      };

      // Simula métricas do último dia da timeline onde APENAS outra matéria foi feita
      const metrics = {
        date: '2026-08-15',
        raw_dir_const: null, // Não fez teste de constitucional no dia 15
        stats_dir_const: 80,
        bay_dir_const: 82
      };

      const html = renderToStaticMarkup(
        <DisciplinaCard
          cat={cat}
          level={82}
          metrics={metrics}
          target={80}
          unit="%"
        />
      );

      // Deve exibir 85% para a nota bruta em vez de '—'
      expect(html).toContain('85%');
      expect(html).not.toContain('>—</span>');
    });
  });

  describe('Fix 2: useCategoryLevels com activeEngine raw', () => {
    it('retorna a nota bruta mais recente para activeEngine raw quando o último dia geral teve null', () => {
      const cat = {
        id: 'matematica',
        name: 'Matemática',
        maxScore: 100,
        minScore: 0,
        simuladoStats: {
          history: [
            { date: '2026-09-01', score: 60, total: 10, correct: 6 },
            { date: '2026-09-05', score: 90, total: 10, correct: 9 }
          ]
        }
      };

      const timeline = [
        { date: '2026-09-01', raw_matematica: 60 },
        { date: '2026-09-05', raw_matematica: 90 },
        { date: '2026-09-10', raw_matematica: null } // Último ponto geral sem matemática
      ];

      const { result } = renderHook(() =>
        useCategoryLevels([cat], timeline, 'raw', 100, 0)
      );

      // Deve ser 90 (último teste de matemática), e não fallback de EMA
      expect(result.current['matematica']).toBe(90);
    });
  });

  describe('Fix 3: evolutionStatus Constância (14 dias) e Volume (7 dias)', () => {
    it('não calcula 14/14 quando 14 simulados ocorreram em datas distantes no passado', () => {
      // 14 simulados em 2024 (nenhum nos últimos 14 dias)
      const ancientDates = Array.from({ length: 14 }, (_, i) => `2024-0${Math.floor(i / 2) + 1}-10`);
      const heatmapData = {
        dates: ancientDates,
        rows: [{ cells: Array(14).fill(true) }]
      };

      const statuses = computeEvolutionStatuses({
        timeline: ancientDates.map(d => ({ date: d, global_total: 50 })),
        heatmapData,
        targetScore: 80
      });

      const consistency = statuses.find(s => s.id === 'consistency');
      expect(consistency).toBeDefined();
      // Não deve ser 14/14, deve ser 0/14 pois nenhum ocorreu nos últimos 14 dias
      expect(consistency.value).toBe('0/14');
      expect(consistency.tone).toBe('danger');
    });

    it('calcula volume de 7 dias baseado no calendário real recente e não nos últimos 7 pontos históricos', () => {
      // 7 simulados antigos
      const ancientDates = Array.from({ length: 7 }, (_, i) => `2023-0${i + 1}-01`);
      const timeline = ancientDates.map(d => ({ date: d, global_total: 100 }));

      const statuses = computeEvolutionStatuses({
        timeline,
        targetScore: 80
      });

      const volume = statuses.find(s => s.id === 'volume');
      expect(volume).toBeDefined();
      // Deve ser 0 q pois nenhum simulado ocorreu nos últimos 7 dias corridos
      expect(volume.value).toBe('0 q');
      expect(volume.tone).toBe('warning');
    });

    it('calcula volume recente corretamente quando há simulados nos últimos 7 dias', () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const timeline = [
        { date: '2023-01-01', global_total: 500 },
        { date: getDateKey(yesterday), global_total: 35 },
        { date: getDateKey(today), global_total: 45 }
      ];

      const statuses = computeEvolutionStatuses({
        timeline,
        targetScore: 80
      });

      const volume = statuses.find(s => s.id === 'volume');
      expect(volume).toBeDefined();
      expect(volume.value).toBe('80 q');
      expect(volume.tone).toBe('success');
    });
  });

  describe('Fix 4: SubtopicsPerformanceChart com tópicos deserializados como objeto', () => {
    it('renderiza sem crash quando topics é um objeto (TypeError fix)', () => {
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
                topics: {
                  '0': { name: 'Poder de Polícia', total: 5, correct: 4, score: 80 },
                  '1': { name: 'Atos Administrativos', total: 5, correct: 4, score: 80 }
                }
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
        />
      );

      // Não deve lançar TypeError: (h.topics || []).forEach is not a function
      expect(html).toContain('Raio-X de Tópicos');
      expect(html).toContain('Ranking (Barras)');
    });
  });

  describe('Fix 5: TodayVsGeneralChart rótulo dinâmico para dia ativo', () => {
    it('exibe "Último dia ativo (%)" quando o usuário não fez simulados hoje', () => {
      const categories = [
        {
          id: '1',
          name: 'Português',
          simuladoStats: {
            history: [
              { date: '2025-01-10', total: 20, correct: 16, score: 80 }
            ]
          }
        }
      ];

      const html = renderToStaticMarkup(
        <TodayVsGeneralChart
          categories={categories}
          unit="%"
        />
      );

      expect(html).toContain('Último dia ativo (%)');
      expect(html).not.toContain('Acertos de hoje (%)');
    });
  });

  describe('Fix 6: ChartTooltip formatação sem unidade pendente em valores nulos', () => {
    it('renderiza "—" e não "—%" quando valor é null', () => {
      const payload = [
        {
          color: '#3b82f6',
          name: 'Matemática',
          payload: {
            subject: 'Matemática',
            raw_mat: null,
            stats_mat: null,
            bay_mat: null
          }
        }
      ];

      const html = renderToStaticMarkup(
        <ChartTooltip
          active={true}
          payload={payload}
          unit="%"
          subjectKey="mat"
        />
      );

      expect(html).not.toContain('—%');
      expect(html).not.toContain('—pts');
    });
  });

  describe('Fix 7: useSubjectAggData com tópicos como objeto', () => {
    it('agrega tempo e questões cronometradas mesmo quando topics é um objeto', () => {
      const categories = [
        {
          id: '1',
          name: 'Raciocínio Lógico',
          simuladoStats: {
            history: [
              {
                date: '2026-09-01',
                total: 10,
                correct: 8,
                topics: {
                  '0': { name: 'Lógica Proposicional', total: 5, timedQuestoes: 5, timeSpent: 300 },
                  '1': { name: 'Equivalências', total: 5, timedQuestoes: 5, timeSpent: 200 }
                }
              }
            ]
          }
        }
      ];

      const { result } = renderHook(() =>
        useSubjectAggData({ categories, timeWindow: 'all', maxScore: 100, minScore: 0 })
      );

      expect(result.current).toHaveLength(1);
      expect(result.current[0].timeSpent).toBe(500);
      expect(result.current[0].timedQuestoes).toBe(10);
    });
  });
});
