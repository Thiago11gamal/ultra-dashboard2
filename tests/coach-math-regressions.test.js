import { describe, it, expect } from 'vitest';
import { monteCarloSimulation } from '../src/engine/projection.js';
import { computeForgettingRisk } from '../src/engine/diagnostics.js';

describe('Suíte de Regressão Histórica do Coach AI', () => {
    
    it('Não deve projetar retenção acima de 100% (Bug corrigido em Maio/2026)', () => {
        // Dados de uma semana onde o usuário estudou perfeitamente
        const historicoEstudos = [
            { correct: 50, total: 50, date: new Date(Date.now() - 2 * 86400000).toISOString() },
            { correct: 100, total: 100, date: new Date(Date.now() - 1 * 86400000).toISOString() }
        ];

        const resultado = computeForgettingRisk(historicoEstudos, 100, 1);

        // A projeção nunca pode ultrapassar o teto lógico da probabilidade
        expect(resultado.retentionPct).toBeLessThanOrEqual(100);
        expect(resultado.retentionPct).toBeGreaterThan(0);
    });

    it('A projeção de Monte Carlo deve ser consistente com o Backtest da Semana 14', () => {
        // Injetando dados históricos reais (formato Array esperado pela nova matemática)
        const metricasPassadas = [
            { score: 75, date: '2026-05-01' },
            { score: 78, date: '2026-05-08' },
            { score: 77, date: '2026-05-15' },
            { score: 80, date: '2026-05-22' }
        ];

        // O motor deve projetar que a próxima semana ficará no intervalo lógico
        const projecao = monteCarloSimulation(metricasPassadas, 7, 1000); 

        expect(projecao.mean).toBeGreaterThanOrEqual(70);
        expect(projecao.mean).toBeLessThanOrEqual(99); // Limite superior alargado face ao novo modelo O-U
    });

    it('Deve lidar graciosamente com ausência total de dados sem disparar erros', () => {
        const historicoVazio = [];
        const maxScore = 100;
        
        // MC deve retornar contrato de interface sem quebrar. Em ausência total de dados agora retorna 0 seguro.
        const projecao = monteCarloSimulation(historicoVazio, 30, 100);
        expect(projecao.mean).toBeGreaterThanOrEqual(0);
        expect(projecao.mean).toBeLessThanOrEqual(maxScore);
        
        // Diagnóstico deve assumir fallback crítico/low em vez de NaN
        const resultado = computeForgettingRisk(historicoVazio, 100);
        expect(resultado.risk).toBeDefined();
    });
});
