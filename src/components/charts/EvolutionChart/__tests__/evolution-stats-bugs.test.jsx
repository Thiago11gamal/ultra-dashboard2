import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { mapRetentionData } from '../../../../utils/chartDataMappers';
import { SubtopicsPerformanceChart } from '../SubtopicsPerformanceChart';

// Mock recharts assim como nos outros testes de componentes de gráficos
vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => <div style={{ width: 800, height: 320 }}>{children}</div>,
  };
});

describe('Evolution & Stats Bugs Audit', () => {
    it('Bug C: SubtopicsPerformanceChart deve se proteger contra Divisão por Zero (maxScore === minScore)', () => {
        const today = new Date().toISOString();
        const categories = [{
            id: '1', 
            name: 'CatZeroDivision', 
            simuladoStats: { 
                history: [{ 
                    date: today, 
                    total: 10, 
                    correct: 5, 
                    score: 5, 
                    topics: [{ name: 'Top1', total: 10, correct: 5, score: 5 }] 
                }] 
            }
        }];
        
        // Passando maxScore igual a minScore para forçar divisão por zero caso a proteção (range = Math.max(1e-9...)) falhe
        const html = renderToStaticMarkup(
            <SubtopicsPerformanceChart categories={categories} maxScore={100} minScore={100} viewMode="lines" instanceId="test" />
        );
        
        // Deve renderizar sem lançar erro de divisão por zero (Infinity/NaN no Recharts)
        expect(html).toContain('Raio-X de Tópicos');
    });

    it('Bug D: mapRetentionData deve ler simuladoStats.average quando bayesianStats.mean não existir (Amnésia Bayesiana)', () => {
        const now = Date.now();
        const pastDate = new Date(now - 14 * 24 * 60 * 60 * 1000); // 14 dias atrás
        
        // Categoria 1: Com Alto Average no simulado (deve ter decaimento mais lento/melhor retenção)
        const catWithHighAverage = {
            id: '1',
            name: 'Cat1',
            lastStudiedAt: pastDate.toISOString(),
            maxScore: 100,
            simuladoStats: { totalQuestions: 100, average: 90 }, // Alta precisão de fallback
            // Sem bayesianStats.mean
        };
        
        // Categoria 2: Com Baixo Average no simulado
        const catWithLowAverage = {
            id: '2',
            name: 'Cat2',
            lastStudiedAt: pastDate.toISOString(),
            maxScore: 100,
            simuladoStats: { totalQuestions: 100, average: 0 }, // Baixa precisão de fallback
        };
        
        const resultHigh = mapRetentionData([catWithHighAverage]);
        const resultLow = mapRetentionData([catWithLowAverage]);
        
        // Como o Bug D foi corrigido, o accuracy agora usa simuladoStats.average quando a bayesiana falha.
        // Portanto, a retenção do que tem 90 de average deve ser MAIOR, o que significa que o Nível Crítico (100 - retention) deve ser MENOR do que a do que tem 0.
        expect(resultHigh[0].nivelCritico).toBeLessThan(resultLow[0].nivelCritico);
        expect(resultHigh[0].nivelCritico).toBeLessThan(100);
    });
});
