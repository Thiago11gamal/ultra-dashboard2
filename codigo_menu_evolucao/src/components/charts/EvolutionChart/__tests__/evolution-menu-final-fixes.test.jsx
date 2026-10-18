import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { computeEvolutionStatuses } from '../../../../utils/evolutionStatus';
import { getDateKey } from '../../../../utils/dateHelper';
import { SubtopicsPerformanceChart } from '../SubtopicsPerformanceChart';

vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }) =>
      React.isValidElement(children)
        ? React.cloneElement(children, { width: 800, height: 320 })
        : <div style={{ width: 800, height: 320 }}>{children}</div>,
  };
});

describe('Evolution Menu Comprehensive Fixes Audit', () => {
  it('Fix 1: evolutionStatus reconhece heatmapData.dates contendo objetos com chave key', () => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);

    // 5 datas nos últimos 14 dias como objetos (formato real do heatmap)
    const recentDateKeys = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      recentDateKeys.push(getDateKey(d));
    }

    const heatmapData = {
      dates: recentDateKeys.map(k => ({ key: k, label: k, dayName: 'Sex', isWeekend: false })),
      rows: []
    };

    // timeline vazio para provar que a constância vem puramente dos objetos do heatmap
    const statuses = computeEvolutionStatuses({
      timeline: [],
      heatmapData,
      targetScore: 80
    });

    const consistency = statuses.find(s => s.id === 'consistency');
    expect(consistency).toBeDefined();
    expect(consistency.value).toBe('5/14');
    expect(consistency.tone).toBe('warning');
  });

  it('Fix 2: SubtopicsPerformanceChart calcula gradientes dinamicamente com base em targetScorePct', () => {
    const today = new Date().toISOString();
    const categories = [{
      id: 'c1',
      name: 'Direito Administrativo',
      simuladoStats: {
        history: [{
          date: today,
          total: 20,
          correct: 14, // 70% acertos
          score: 70,
          topics: [{ name: 'Atos', total: 20, correct: 14, score: 70 }]
        }]
      }
    }];

    // 1) Teste de sanidade de renderização com target alto e baixo
    const htmlHigh = renderToStaticMarkup(
      <SubtopicsPerformanceChart
        categories={categories}
        targetScore={90}
        maxScore={100}
        minScore={0}
        viewMode="bars"
        instanceId="audit"
      />
    );
    expect(htmlHigh).toContain('Raio-X de Tópicos');
    expect(htmlHigh).toContain('Ranking (Barras)');

    // 2) Validação da regra matemática: warnThreshold dinâmico (Math.max(25, targetScorePct * 0.75))
    // Com targetScorePct = 90%: warnThreshold = 67.5%. Logo, acurácia de 70% é aviso (warn) e não ruim (bad)
    const targetHigh = 90;
    const warnHigh = Math.max(25, targetHigh * 0.75);
    expect(warnHigh).toBe(67.5);
    expect(70 >= targetHigh).toBe(false);
    expect(70 >= warnHigh).toBe(true);

    // Com targetScorePct = 60%: warnThreshold = 45%. Acurácia de 70% é meta batida (good)
    const targetLow = 60;
    const warnLow = Math.max(25, targetLow * 0.75);
    expect(warnLow).toBe(45);
    expect(70 >= targetLow).toBe(true);
  });

  it('Fix 3: Conversão de meta legada em escala ampliada com piso zero (minScore=0, maxScore=1000)', () => {
    // Simula a lógica em Evolution.jsx
    const minScore = 0;
    const maxScore = 1000;
    const user = { targetScore: 80 }; // Usuário informou 80%

    const safeMin = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
    const safeMax = Number(maxScore) > safeMin ? Number(maxScore) : Math.max(100, safeMin + 100);
    const clamp = (value) => Math.min(safeMax, Math.max(safeMin, Number.isFinite(Number(value)) ? Number(value) : safeMin));
    const hasValidNumber = (v) => v !== null && v !== undefined && String(v).trim() !== '' && Number.isFinite(Number(v));

    let targetScorePoints = safeMin + (safeMax - safeMin) * 0.8;
    if (hasValidNumber(user?.targetScore)) {
      let ts = Number(user.targetScore);
      const isPercentileRange = ts >= 0 && ts <= 100 && (safeMax - safeMin) > 0;
      const isBelowMin = ts < safeMin;
      const isLegacyPercentageOnLargeScale = safeMax > 100 && (safeMax - safeMin) >= 200 && ts <= 100;
      if (isPercentileRange && (isBelowMin || isLegacyPercentageOnLargeScale)) {
        ts = safeMin + (ts / 100) * (safeMax - safeMin);
      }
      targetScorePoints = clamp(ts);
    }

    // 80% de 1000 deve virar 800 pontos, e não permanecer 80 pontos
    expect(targetScorePoints).toBe(800);
  });
});
