import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { TimeSpentChart } from '../TimeSpentChart';

vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => <div style={{ width: 800, height: 320 }}>{children}</div>,
  };
});

describe('TimeSpentChart bug fixes', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('inclui histórico de hoje na média recente mesmo de manhã (comparação por getDateKey)', () => {
    vi.useFakeTimers();
    // 10:00 em Manaus (UTC-4) = 14:00 UTC — antes do meio-dia ancorado (16:00 UTC)
    vi.setSystemTime(new Date('2026-05-08T14:00:00.000Z'));

    const subjectAggData = [{
      id: 'cat1',
      fullName: 'Física',
      timeSpent: 600,
      timedQuestoes: 10,
    }];

    const activeCategories = [{
      id: 'cat1',
      simuladoStats: {
        history: [{
          date: '2026-05-08',
          timeSpent: 120,
          total: 10,
        }],
      },
    }];

    const html = renderToStaticMarkup(
      <TimeSpentChart subjectAggData={subjectAggData} activeCategories={activeCategories} />
    );

    // Média recente de hoje: 12s/questão — não deve cair para a média geral de 60s
    expect(html).toContain('Média: 12s');
    expect(html).not.toContain('Média: 1m');
  });

  it('exclui entradas com data futura via chave YYYY-MM-DD', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-08T14:00:00.000Z'));

    const subjectAggData = [{
      id: 'cat1',
      fullName: 'Física',
      timeSpent: 600,
      timedQuestoes: 10,
    }];

    const activeCategories = [{
      id: 'cat1',
      simuladoStats: {
        history: [
          { date: '2026-04-20', timeSpent: 200, total: 10 },
          { date: '2026-05-09', timeSpent: 30, total: 10 },
        ],
      },
    }];

    const html = renderToStaticMarkup(
      <TimeSpentChart subjectAggData={subjectAggData} activeCategories={activeCategories} />
    );

    // Sem dados recentes válidos (futuro excluído, antigo fora da janela), usa média geral (60s)
    expect(html).toContain('Média: 1m');
    expect(html).not.toContain('Média: 3s');
    expect(html).not.toContain('Média: 20s');
  });

  it('usa vermelho para acima da média e verde para abaixo da média na legenda', () => {
    const subjectAggData = [{
      id: 'cat1',
      fullName: 'Física',
      timeSpent: 300,
      timedQuestoes: 10,
    }];

    const activeCategories = [{
      id: 'cat1',
      simuladoStats: {
        history: [{
          date: '2026-05-01',
          timeSpent: 450,
          total: 10,
        }],
      },
    }];

    const html = renderToStaticMarkup(
      <TimeSpentChart subjectAggData={subjectAggData} activeCategories={activeCategories} />
    );

    const aboveIdx = html.indexOf('Acima da média');
    const belowIdx = html.indexOf('Abaixo da média');
    expect(aboveIdx).toBeGreaterThan(-1);
    expect(belowIdx).toBeGreaterThan(-1);
    expect(html.lastIndexOf('bg-rose-400', aboveIdx)).toBeGreaterThan(-1);
    expect(html.lastIndexOf('bg-emerald-400', belowIdx)).toBeGreaterThan(-1);
  });

  it('não distorce média da legenda quando latestSeconds é null', () => {
    const subjectAggData = [
      { id: 'cat1', fullName: 'Física A', timeSpent: 300, timedQuestoes: 10 },
      { id: 'cat2', fullName: 'Física B', timeSpent: 300, timedQuestoes: 10 },
    ];

    const activeCategories = [
      {
        id: 'cat1',
        simuladoStats: {
          history: [{ date: '2026-05-01', timeSpent: 90, total: 10 }],
        },
      },
      {
        id: 'cat2',
        simuladoStats: {
          history: [{ date: '2026-05-01', timeSpent: 0, total: 10 }],
        },
      },
    ];

    const html = renderToStaticMarkup(
      <TimeSpentChart subjectAggData={subjectAggData} activeCategories={activeCategories} />
    );

    // Apenas cat1 tem último tempo (9s); cat2 com null não deve puxar a média para 5s
    expect(html).toContain('Último: 9s');
    expect(html).not.toContain('Último: 5s');
  });
});
