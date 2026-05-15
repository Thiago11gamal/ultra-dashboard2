import { describe, it, expect } from 'vitest';
import { calculateUrgency } from '../src/utils/coachLogic.js';
import { simuladosToHistory } from '../src/utils/coachAdaptive.js';

const baseCategory = { id: 'test-cat', name: 'Matemática', weight: 8 };

describe('Nova Matemática do Coach AI - Auditoria de Regressão', () => {

    it('⚖️ scoreComponent deve escalar o teto pelo weightMultiplier', () => {
        // Matéria com peso alto (8 -> multiplicador ~1.2)
        // Aluno com nota 0. Sem o fix, o scoreComponent estaria travado em dynamicScoreMax (45).
        // Com o fix, deve chegar a ~45 * 1.2 = 54.
        const res = calculateUrgency(baseCategory, [], [], { maxScore: 100 });
        
        // No config padrão: dynamicScoreMax = 45, dynamicRecencyMax = 25, dynamicInstabilityMax = 15
        // total ~85 + boosts.
        // Verificamos se a componente de performance (scoreComponent) ultrapassou os 45.
        expect(res.details.components.scoreComponent).toBeGreaterThan(45);
        expect(res.details.components.scoreComponent).toBeLessThanOrEqual(45 * 1.35); // Limite do multiplicador
    });

    it('🕳️ RAW_MAX_ACTUAL deve incluir o teto de ineficiência via recencyComponent', () => {
        // Setup: Aluno com muitas tarefas pendentes (ineficiência alta)
        const categories = [{
            ...baseCategory,
            tasks: Array.from({ length: 10 }, (_, i) => ({ id: `t${i}`, completed: false }))
        }];
        
        // Simulamos algum tempo sem estudar para ter recência > 0
        const simulados = [{ subject: 'Matemática', score: 50, total: 100, date: '2026-01-01' }];
        
        const res = calculateUrgency(categories[0], simulados, [], { 
            maxScore: 100, 
            allCategories: categories 
        });

        // Verificamos se o normalizedScore não ultrapassa 100 mesmo com ineficiência máxima
        expect(res.normalizedScore).toBeLessThanOrEqual(100);
        // Recency deve estar inflada pela ineficiência (padrão é dynamicRecencyMax * 0.8 * multiplier)
        expect(res.details.components.recencyComponent).toBeGreaterThan(0);
    });

    it('☀️ Elite Maintenance: não deve marcar como estagnado acima de 95%', () => {
        const simulados = [
            { subject: 'Matemática', score: 98, total: 100, date: '2026-01-01' },
            { subject: 'Matemática', score: 98, total: 100, date: '2026-01-10' },
        ];
        
        // Nota estável em 98% (trend = 0). trendThreshold costuma ser > 0.
        const res = calculateUrgency(baseCategory, simulados, [], { maxScore: 100 });
        
        // Se isEliteMaintenance funcionou, a recomendação não deve conter o alerta de estagnação/burnout
        expect(res.recommendation).not.toContain('nota estagnou');
        expect(res.recommendation).not.toContain('Sinais de estafa');
    });

    it('🧠 Rotation Penalty deve escalar com a performance (fatigueRatio)', () => {
        const studyLogs = [{ categoryId: 'test-cat', date: new Date().toISOString(), minutes: 60 }];
        
        // Caso A: Aluno com performance baixa (10%)
        const resLow = calculateUrgency(baseCategory, [{ subject: 'Matemática', score: 10, total: 100, date: '2026-01-01' }], studyLogs, { maxScore: 100 });
        
        // Caso B: Aluno com performance alta (90%)
        const resHigh = calculateUrgency(baseCategory, [{ subject: 'Matemática', score: 90, total: 100, date: '2026-01-01' }], studyLogs, { maxScore: 100 });
        
        // Pelo fix, o rotationPenalty (penalidade negativa) deve ser maior no resHigh 
        // porque fatigueRatio é maior.
        
        expect(resLow.details.components.rotationPenalty).toBeDefined();
        expect(resHigh.details.components.rotationPenalty).toBeDefined();
        expect(resHigh.details.components.rotationPenalty).toBeGreaterThan(resLow.details.components.rotationPenalty);
    });

    it('💥 simuladosToHistory deve manter a ordem intra-dia por timestamp', () => {
        const now = Date.now();
        const simulados = [
            { id: 2, score: 80, total: 100, createdAt: new Date(now + 1000).toISOString() }, // Segundo teste
            { id: 1, score: 70, total: 100, createdAt: new Date(now).toISOString() },        // Primeiro teste
        ];
        
        const history = simuladosToHistory(simulados, 100);
        
        expect(history[0].score).toBe(70);
        expect(history[1].score).toBe(80);
    });

    it('🌋 RAW_MAX_ACTUAL deve ser simétrico na véspera de prova (Crunch)', () => {
        // Simular véspera de prova (crunchMultiplier = 2.0)
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + 3); // Prova em 3 dias
        
        const res = calculateUrgency(baseCategory, [], [], { 
            maxScore: 100, 
            targetDate: targetDate.toISOString() 
        });
        
        // Se a simetria funcionar, o normalizedScore deve estar em 100% (ou próximo) se as notas forem 0,
        // mas NÃO deve estourar para 120% ou algo assim devido ao desalinhamento do crunchMultiplier.
        expect(res.normalizedScore).toBeLessThanOrEqual(100);
    });

});
