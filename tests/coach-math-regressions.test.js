import { describe, it, expect } from 'vitest';
import { analisarDesempenhoHistorico } from '../src/utils/coachLogic.js';
import { simularMonteCarlo } from '../src/engine/monteCarlo.js';

describe('Suíte de Regressão Histórica do Coach AI', () => {
    
    it('Não deve projetar retenção acima de 100% (Bug corrigido em Maio/2026)', () => {
        // Dados de uma semana onde o usuário estudou perfeitamente
        const historicoEstudos = [
            { acertos: 50, total: 50, diasRevisao: 1 },
            { acertos: 100, total: 100, diasRevisao: 2 }
        ];

        const resultado = analisarDesempenhoHistorico(historicoEstudos);

        // A projeção nunca pode ultrapassar o teto lógico da probabilidade
        expect(resultado.projecaoRetencao).toBeLessThanOrEqual(100);
        expect(resultado.projecaoRetencao).toBeGreaterThan(0);
    });

    it('A projeção de Monte Carlo deve ser consistente com o Backtest da Semana 14', () => {
        // Injetando dados históricos reais cujo resultado futuro já aconteceu e é conhecido
        const metricasPassadas = {
            volumeSemanasAnteriores: [12, 15, 14, 10], // Horas
            focoMedio: 0.85
        };

        // O motor deve projetar que a próxima semana ficará entre 11 e 16 horas
        // com base no histórico real, sem alucinações.
        const projecao = simularMonteCarlo(metricasPassadas, 1000); // 1000 iterações

        expect(projecao.p50).toBeGreaterThanOrEqual(11);
        expect(projecao.p50).toBeLessThanOrEqual(16);
    });

    it('Deve lidar graciosamente com ausência total de dados sem disparar erros', () => {
        const historicoVazio = [];
        const resultado = analisarDesempenhoHistorico(historicoVazio);
        
        // Em vez de NaN, o motor deve retornar estados padrões calibrados
        expect(resultado.tendencia).toBe('neutra');
        expect(resultado.confiabilidadeDosDados).toBe('insuficiente');
    });
});
