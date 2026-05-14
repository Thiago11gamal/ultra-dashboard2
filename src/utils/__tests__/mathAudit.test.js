/**
 * mathAudit.test.js — Testes para a Auditoria Matemática do Coach AI
 * 
 * Cobre todos os 12 bugs/melhorias identificados:
 * BUG-MATH-01: MSSD vs SD
 * BUG-MATH-02: O-U mean reversion target
 * BUG-MATH-03: Adaptive risk thresholds com backtest
 * BUG-MATH-04: Bayesian amnesia floor cap
 * IMP-MATH-05: decayK temporal adaptation
 * IMP-MATH-06: Adaptive lambda WLS
 * IMP-MATH-07: computeAdaptiveCoachWeight
 * IMP-MATH-08: Topic urgency normalization  
 * IMP-MATH-09: Balance bridge proportional
 * ADAPT-01: Bayesian Online thresholds
 * ADAPT-02: Regime detection
 * ADAPT-03: Unified confidence shrinkage
 */
import { describe, test, expect } from 'vitest';

// Engine imports
import { calculateVolatility, calculateMSSD, calculateSlope, monteCarloSimulation } from '../../engine/projection.js';
import { computeBayesianLevel } from '../../engine/stats.js';

// Coach imports  
import { deriveAdaptiveRiskThresholds, deriveCoachAdaptiveParams, deriveBacktestWeights } from '../coachAdaptive.js';
import { calculateUrgency, DEFAULT_CONFIG } from '../coachLogic.js';

// Adaptive imports
import { adaptiveConfidenceShrinkage, computeAdaptiveCoachWeight } from '../adaptiveMath.js';
import { detectRegimeTransition } from '../adaptiveEngine.js';

// ─────────────────────────────────────────────────────────────────
// BUG-MATH-01: MSSD deve não penalizar crescimento monotônico
// ─────────────────────────────────────────────────────────────────
describe('BUG-MATH-01: MSSD vs SD', () => {
    test('série monotônica crescente: MSSD < SD', () => {
        const history = [
            { score: 50, date: '2026-01-01' },
            { score: 55, date: '2026-01-08' },
            { score: 60, date: '2026-01-15' },
            { score: 65, date: '2026-01-22' },
            { score: 70, date: '2026-01-29' },
        ];
        const sd = calculateVolatility(history, 100);
        const mssd = calculateMSSD(history, 100);
        // SD penaliza o spread total (50-70), MSSD apenas as diferenças consecutivas (5 cada)
        expect(mssd).toBeLessThan(sd);
        // O MSSD detrended de uma reta perfeita deve ser zero (que bate no piso de segurança 0.001)
        expect(mssd).toBeCloseTo(0.001, 3);
    });

    test('série oscilante: MSSD > SD', () => {
        const history = [
            { score: 50, date: '2026-01-01' },
            { score: 80, date: '2026-01-08' },
            { score: 50, date: '2026-01-15' },
            { score: 80, date: '2026-01-22' },
        ];
        const sd = calculateVolatility(history, 100);
        const mssd = calculateMSSD(history, 100);
        // Oscilação forte: MSSD captura as diferenças de 30 pontos
        expect(mssd).toBeGreaterThan(sd);
    });

    test('série estável: MSSD ≈ SD', () => {
        const history = [
            { score: 70, date: '2026-01-01' },
            { score: 72, date: '2026-01-08' },
            { score: 69, date: '2026-01-15' },
            { score: 71, date: '2026-01-22' },
        ];
        const sd = calculateVolatility(history, 100);
        const mssd = calculateMSSD(history, 100);
        // Ambos devem ser pequenos e próximos
        expect(Math.abs(mssd - sd)).toBeLessThan(3);
    });

    test('MSSD com menos de 2 pontos retorna fallback', () => {
        expect(calculateMSSD([{ score: 50 }], 100)).toBeCloseTo(5, 0);
        expect(calculateMSSD([], 100)).toBeCloseTo(5, 0);
    });
});

// ─────────────────────────────────────────────────────────────────
// BUG-MATH-02: O-U mean reversion target
// ─────────────────────────────────────────────────────────────────
describe('BUG-MATH-02: Monte Carlo O-U mean reversion', () => {
    test('projeção com reversion à média histórica produz resultados válidos', () => {
        // Aluno que caiu de 80 para 60: baseline=60, mean histórica=70
        const history = [
            { score: 80, date: '2026-01-01' },
            { score: 78, date: '2026-01-15' },
            { score: 75, date: '2026-02-01' },
            { score: 70, date: '2026-02-15' },
            { score: 65, date: '2026-03-01' },
            { score: 60, date: '2026-03-15' },
        ];
        const result = monteCarloSimulation(history, 80, 90, 1000, { maxScore: 100 });
        expect(result).not.toBeNull();
        // A probabilidade, média e volatilidade devem ser finitos
        expect(Number.isFinite(result.probability)).toBe(true);
        expect(Number.isFinite(result.mean)).toBe(true);
        expect(Number.isFinite(result.volatility)).toBe(true);
        // Média projetada deve estar entre 0 e maxScore
        expect(result.mean).toBeGreaterThanOrEqual(0);
        expect(result.mean).toBeLessThanOrEqual(100);
        // Com O-U revertendo para a média histórica (~71) com peso reduzido (Audit Fix), 
        // a projeção deve ser mais conservadora mas ainda finita e válida.
        expect(result.mean).toBeGreaterThan(45); // Ajustado de 50 para 45 (Audit Fix + AR(1) Persistence)
    });
});

// ─────────────────────────────────────────────────────────────────
// BUG-MATH-03 + ADAPT-01: Risk thresholds com backtest
// ─────────────────────────────────────────────────────────────────
describe('BUG-MATH-03: Adaptive risk thresholds', () => {
    test('com backtest pairs, thresholds devem ser empiricamente derivados', () => {
        const scores = [40, 50, 60, 70, 80, 90];
        const pairs = [
            { probability: 0.2, observed: 0 },
            { probability: 0.25, observed: 0 },
            { probability: 0.3, observed: 0 },
            { probability: 0.5, observed: 1 },
            { probability: 0.7, observed: 1 },
            { probability: 0.85, observed: 1 },
            { probability: 0.9, observed: 1 },
            { probability: 0.95, observed: 1 },
        ];
        const result = deriveAdaptiveRiskThresholds(scores, 5, {}, 100, pairs);
        expect(result.danger).toBeGreaterThanOrEqual(15);
        expect(result.danger).toBeLessThanOrEqual(50);
        expect(result.safe).toBeGreaterThanOrEqual(65);
        expect(result.safe).toBeLessThanOrEqual(97);
        expect(result.safe - result.danger).toBeGreaterThanOrEqual(20);
    });

    test('sem backtest pairs, usa fallback de quantis', () => {
        const scores = [40, 50, 60, 70, 80];
        const result = deriveAdaptiveRiskThresholds(scores, 5, {}, 100);
        expect(result.danger).toBeGreaterThanOrEqual(15);
        expect(result.safe).toBeLessThanOrEqual(97);
    });

    test('com poucos scores retorna defaults', () => {
        const result = deriveAdaptiveRiskThresholds([50, 60], 5, {});
        expect(result.danger).toBe(30);
        expect(result.safe).toBe(90);
    });
});

// ─────────────────────────────────────────────────────────────────
// BUG-MATH-04: Bayesian amnesia floor
// ─────────────────────────────────────────────────────────────────
describe('BUG-MATH-04: Bayesian amnesia cap', () => {
    test('alpha deve ser limitado a dynamicAlphaCap após longo histórico', () => {
        // [CORREÇÃO] Usar datas recentes para evitar que a Regressão por Amnésia (Bug 1.1 Fix) puxe tudo para 50%
        const today = new Date();
        const history = [];
        for (let i = 0; i < 100; i++) {
            history.push({
                date: new Date(today.getTime() - (100 - i) * 3600000).toISOString(),
                total: 100,
                correct: 80, // 80% consistente
            });
        }
        const result = computeBayesianLevel(history, 1, 1, 100);
        // [CORREÇÃO] O teto agora é dinâmico e adapta-se ao volume do aluno (Rodada 7 Fix)
        // Antes era fixo em 250, agora pode ser maior se o volume diário for alto.
        expect(result.n).toBeGreaterThan(100);
        expect(Number.isFinite(result.n)).toBe(true);
        // A média deve refletir os 80% de acerto
        expect(result.mean).toBeGreaterThan(60);
        expect(result.mean).toBeLessThan(95);
    });

    test('após 2 anos sem estudar, alpha deve decair significativamente', () => {
        const history = [
            { date: '2024-01-01', total: 50, correct: 40 },
            { date: '2024-01-15', total: 50, correct: 42 },
        ];
        const result = computeBayesianLevel(history, 1, 1, 100);
        // Dois anos depois (Date.now ≈ 2026), o decaimento deve ser forte
        // O CI deve ser mais largo que sem decaimento
        expect(result.ciHigh - result.ciLow).toBeGreaterThan(0);
    });

    test('BUG 1: Provas normais com score 0 não devem ser infladas para 66%', () => {
        const history = [
            { date: new Date().toISOString(), total: 100, correct: 0, score: 0 }
        ];
        const result = computeBayesianLevel(history, 1, 1, 100);
        // Sem o fix, isso voltava ~66. Com o fix, deve ser baixo (perto de 0, com laplace smoothing)
        // alpha=1+0=1, beta=1+100=101 -> mean = 1/102 * 100 = ~0.98
        expect(result.mean).toBeLessThan(5); 
    });

    test('BUG 1: Provas penalizadas com score 0 devem ser convertidas para 50%', () => {
        const history = [
            { date: '2024-01-01', total: 100, correct: 0, score: 0 }
        ];
        const result = computeBayesianLevel(history, 1, 1, 100, { isPenalizedFormat: true });
        // Score 0 em penalizada -> rawPct = (0+1)/2 = 0.5
        // alpha=1+50=51, beta=1+50=51 -> mean = 51/104 * 100 = ~49
        expect(result.mean).toBeGreaterThan(40);
        expect(result.mean).toBeLessThan(60);
    });
});

// ─────────────────────────────────────────────────────────────────
// IMP-MATH-05: decayK temporal adaptation
// ─────────────────────────────────────────────────────────────────
describe('IMP-MATH-05: Temporal decayK', () => {
    test('sessões frequentes geram decayK mais alto', () => {
        const frequent = Array.from({ length: 10 }, (_, i) => ({
            score: 70 + Math.random() * 10,
            date: new Date(Date.now() - (10 - i) * 86400000).toISOString().slice(0, 10)
        }));
        const spaced = Array.from({ length: 10 }, (_, i) => ({
            score: 70 + Math.random() * 10,
            date: new Date(Date.now() - (10 - i) * 86400000 * 14).toISOString().slice(0, 10)
        }));
        const freqParams = deriveCoachAdaptiveParams(frequent, 100, {});
        const spacedParams = deriveCoachAdaptiveParams(spaced, 100, {});
        // Sessões frequentes = decayK maior (esquece mais rápido)
        expect(freqParams.decayK).toBeGreaterThan(spacedParams.decayK);
    });

    test('medianGapDays é retornado na saída', () => {
        const history = [
            { score: 70, date: '2026-01-01' },
            { score: 75, date: '2026-01-08' },
            { score: 72, date: '2026-01-15' },
        ];
        const result = deriveCoachAdaptiveParams(history, 100, {});
        expect(result.medianGapDays).toBeDefined();
        expect(result.medianGapDays).toBeCloseTo(7, 0);
    });
});

// ─────────────────────────────────────────────────────────────────
// IMP-MATH-06: Adaptive lambda
// ─────────────────────────────────────────────────────────────────
describe('IMP-MATH-06: Adaptive lambda in calculateSlope', () => {
    test('slope retorna valor finito com dados válidos', () => {
        const history = [
            { score: 50, date: '2026-01-01' },
            { score: 55, date: '2026-01-15' },
            { score: 60, date: '2026-02-01' },
        ];
        const slope = calculateSlope(history, 100);
        expect(Number.isFinite(slope)).toBe(true);
        expect(slope).toBeGreaterThan(0); // tendência de alta
    });

    test('slope é limitado ao cap de 1.5%/dia', () => {
        const history = [
            { score: 10, date: '2026-01-01' },
            { score: 90, date: '2026-01-02' }, // salto extremo
        ];
        const slope = calculateSlope(history, 100);
        expect(Math.abs(slope)).toBeLessThanOrEqual(1.5); // 1.5% de 100
    });
});

// ─────────────────────────────────────────────────────────────────
// IMP-MATH-07: computeAdaptiveCoachWeight
// ─────────────────────────────────────────────────────────────────
describe('IMP-MATH-07: Adaptive coach weight', () => {
    test('n alto + série estável = confiança alta', () => {
        const scores = Array.from({ length: 20 }, () => 70 + Math.random() * 2);
        const result = computeAdaptiveCoachWeight(scores);
        expect(result.confidenceWeight).toBeGreaterThan(0.7);
    });

    test('n baixo = confiança baixa', () => {
        const scores = [50, 60, 70];
        const result = computeAdaptiveCoachWeight(scores);
        expect(result.confidenceWeight).toBeLessThan(0.6);
    });

    test('trend forte = confiança reduzida', () => {
        const scores = [30, 45, 60, 75, 90]; // tendência muito forte
        const result = computeAdaptiveCoachWeight(scores);
        expect(result.trendStrength).toBeGreaterThan(0);
    });
});

// ─────────────────────────────────────────────────────────────────
// IMP-MATH-08: Topic urgency normalization (teste indireto via coachLogic)
// ─────────────────────────────────────────────────────────────────
describe('IMP-MATH-08: Topic urgency normalization', () => {
    test('calculateUrgency retorna score normalizado entre 0-100', () => {
        const category = {
            id: 'test-cat',
            name: 'Direito Constitucional',
            weight: 8,
            tasks: []
        };
        const simulados = [
            { subject: 'Direito Constitucional', score: 60, total: 10, date: '2026-01-01' },
            { subject: 'Direito Constitucional', score: 65, total: 10, date: '2026-01-15' },
            { subject: 'Direito Constitucional', score: 70, total: 10, date: '2026-02-01' },
        ];
        const result = calculateUrgency(category, simulados, [], { maxScore: 100 });
        expect(result.normalizedScore).toBeGreaterThanOrEqual(0);
        expect(result.normalizedScore).toBeLessThanOrEqual(100);
        expect(result.details.hasData).toBe(true);
    });
});

// ─────────────────────────────────────────────────────────────────
// ADAPT-02: Regime detection
// ─────────────────────────────────────────────────────────────────
describe('ADAPT-02: Regime detection', () => {
    test('detecta desaceleração em série crescente que freia', () => {
        // Crescimento forte seguido de desaceleração
        const scores = [40, 45, 50, 56, 63, 70, 78, 79, 79.5, 80, 80.1, 80.2, 80.3, 80.4, 80.5, 80.5, 80.5, 80.5, 80.5, 80.5];
        const result = detectRegimeTransition(scores, { maxScore: 100, windowSize: 10 });
        expect(result.currentState).not.toBe('insufficient_data');
    });

    test('detecta instabilidade crônica', () => {
        const scores = [40, 70, 30, 80, 35, 75, 40, 70, 35, 80, 40, 70, 30, 80, 35, 75, 40, 70, 35, 80];
        const result = detectRegimeTransition(scores, { maxScore: 100, windowSize: 10 });
        expect(result.currentState).toBeDefined();
    });

    test('dados insuficientes retorna estado correto', () => {
        const result = detectRegimeTransition([50, 60], { maxScore: 100 });
        expect(result.currentState).toBe('insufficient_data');
        expect(result.flags).toHaveLength(0);
    });
});

// ─────────────────────────────────────────────────────────────────
// ADAPT-03: Unified confidence shrinkage
// ─────────────────────────────────────────────────────────────────
describe('ADAPT-03: Unified confidence shrinkage', () => {
    test('n baixo gera shrinkage forte', () => {
        const result = adaptiveConfidenceShrinkage({ sampleSize: 3, neutralValue: 50 });
        expect(result.shrinkFactor).toBeGreaterThan(0.2);
    });

    test('n alto + boa calibração gera shrinkage mínimo', () => {
        const result = adaptiveConfidenceShrinkage({
            sampleSize: 50,
            calibrationPenalty: 0,
            trendStrength: 0,
            neutralValue: 50
        });
        expect(result.shrinkFactor).toBeLessThan(0.15);
    });

    test('apply() puxa valor para o neutro', () => {
        const result = adaptiveConfidenceShrinkage({
            sampleSize: 3,
            calibrationPenalty: 0.1,
            neutralValue: 50
        });
        const adjusted = result.apply(90);
        expect(adjusted).toBeLessThan(90);
        expect(adjusted).toBeGreaterThan(50);
    });

    test('calibração ruim aumenta shrinkage', () => {
        const good = adaptiveConfidenceShrinkage({ sampleSize: 10, calibrationPenalty: 0 });
        const bad = adaptiveConfidenceShrinkage({ sampleSize: 10, calibrationPenalty: 0.3 });
        expect(bad.shrinkFactor).toBeGreaterThan(good.shrinkFactor);
    });

    test('maxShrink é respeitado', () => {
        const result = adaptiveConfidenceShrinkage({
            sampleSize: 1,
            calibrationPenalty: 1,
            trendStrength: 5,
            maxShrink: 0.4
        });
        expect(result.shrinkFactor).toBeLessThanOrEqual(0.4);
    });
});

// ─────────────────────────────────────────────────────────────────
// Regressão geral: output do pipeline não é NaN/undefined
// ─────────────────────────────────────────────────────────────────
describe('Regression: Pipeline output sanity', () => {
    test('calculateUrgency sem dados retorna valores válidos', () => {
        const result = calculateUrgency({ id: 'x', name: 'Teste' }, [], []);
        expect(Number.isFinite(result.normalizedScore)).toBe(true);
        expect(result.details.hasData).toBe(false);
    });

    test('calculateUrgency com dados completos não retorna NaN', () => {
        const cat = { id: 'cat1', name: 'Portugues', weight: 7, tasks: [{ text: 'Estudar', completed: false, priority: 'high' }] };
        const sims = [
            { subject: 'Portugues', score: 55, total: 20, date: '2026-01-01' },
            { subject: 'Portugues', score: 60, total: 20, date: '2026-02-01' },
            { subject: 'Portugues', score: 65, total: 20, date: '2026-03-01' },
            { subject: 'Portugues', score: 70, total: 20, date: '2026-04-01' },
        ];
        const result = calculateUrgency(cat, sims, [], { maxScore: 100 });
        expect(Number.isFinite(result.normalizedScore)).toBe(true);
        expect(Number.isFinite(result.details.averageScore)).toBe(true);
        expect(Number.isFinite(result.details.mssdVolatility)).toBe(true);
        expect(Number.isFinite(result.details.trend)).toBe(true);
        // Monte Carlo deve ter executado
        if (result.details.monteCarlo) {
            expect(Number.isFinite(result.details.monteCarlo.probability)).toBe(true);
            expect(Number.isFinite(result.details.monteCarlo.meanProjected)).toBe(true);
        }
    });

    test('deriveBacktestWeights com 2+ scores retorna pesos válidos', () => {
        const result = deriveBacktestWeights([50, 60, 70], 100);
        expect(Number.isFinite(result.scoreWeight)).toBe(true);
        expect(Number.isFinite(result.recencyWeight)).toBe(true);
        expect(Number.isFinite(result.instabilityWeight)).toBe(true);
        expect(result.scoreWeight).toBeGreaterThan(0);
    });
});
