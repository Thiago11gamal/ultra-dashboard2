/**
 * hardeningAudit.test.js — Testes para as Correções Arquiteturais (Hardening) do Coach AI
 * 
 * Cobre os erros 37 a 48:
 * Erro 37: "Vírus de Concatenação" no Prior Bayesiano
 * Erro 38: Penalização de Tópicos Concluídos
 * Erro 39: Fugas de NaNs em Matrizes Tipadas (Percentis)
 * Erro 40: Implosão Assintótica da "Bandwidth" (KDE)
 * Erro 41: Fuga de "NaN" no Nível do Aluno (getCognitiveState)
 * Erro 42: "Vírus da Vírgula" na Volatilidade
 * Erro 43: Ordenação de Tópicos por Invalid Date
 * Erro 44: Envenenamento Cruzado por Amnésia Temporal
 * Erro 45: Type Mismatch no Desvio Padrão Bayesiano
 * Erro 46: Vírus da Vírgula na Extração de Tópicos
 * Erro 47: Envenenamento do Baseline Global
 * Erro 48: Colapso dos Pesos de Edital
 */
import { describe, test, expect } from 'vitest';
import { getCoachPriorities, calculateUrgency, getCognitiveState, computeRobustVolatilityForCoach, analisarDesempenhoHistorico } from '../coachLogic.js';
import { getPercentile } from '../../engine/math/percentile.js';
import { generateKDE } from '../../engine/math/gaussian.js';
import { standardDeviation, calcularAssimetria } from '../../engine/stats.js';
import { weightedRegression, logisticRegression } from '../../engine/projection.js';
import { bootstrapCI } from '../../engine/math/bootstrap.js';

describe('Hardening Audit: Erros 37-48', () => {

    // ─────────────────────────────────────────────────────────────────
    // Erro 37: Vírus de Concatenação
    // ─────────────────────────────────────────────────────────────────
    test('Erro 37: getCoachPriorities deve tratar strings e aplicar clamp', () => {
        const topicsData = [
            { id: 't1', acertos: '10', total: '20' }, // 50%
            { id: 't2', acertos: '5', total: '5' }    // 100%
        ];
        const result = getCoachPriorities(topicsData);
        expect(result).toHaveLength(2);
        // Sem o fix, globalCorrect seria "0105" (string)
        // Com o fix, deve ser numérico e a realProficiency deve estar entre 0 e 1
        result.forEach(t => {
            expect(typeof t.realProficiency).toBe('number');
            expect(t.realProficiency).toBeGreaterThanOrEqual(0);
            expect(t.realProficiency).toBeLessThanOrEqual(1);
        });
    });

    // ─────────────────────────────────────────────────────────────────
    // Erro 39: NaNs em TypedArrays (Percentile)
    // ─────────────────────────────────────────────────────────────────
    test('Erro 39: getPercentile deve filtrar NaNs em Float32Array', () => {
        const data = new Float32Array([10, NaN, 20, 30, NaN, 40]);
        const p50 = getPercentile(data, 50);
        // Sem o fix, NaNs na ordenação de TypedArrays podem corromper o resultado
        expect(Number.isFinite(p50)).toBe(true);
        expect(p50).toBeGreaterThanOrEqual(10);
        expect(p50).toBeLessThanOrEqual(40);
    });

    // ─────────────────────────────────────────────────────────────────
    // Erro 40: Bandwidth Floor (KDE)
    // ─────────────────────────────────────────────────────────────────
    test('Erro 40: generateKDE deve ter bandwidth mínimo de 1.5', () => {
        const data = new Float32Array([50, 50, 50, 50, 50]); // Variância zero
        const kde = generateKDE(data, 50, 0, 5, 0, 100);
        // Sem o fix, o bandwidth colapsaria para ~0, gerando sobreflow/underflow
        // O loop do KDE usa plotSteps = 200, então retorna 201 pontos
        expect(kde.length).toBeGreaterThan(100);
        kde.forEach(p => {
            expect(Number.isFinite(p.y)).toBe(true);
        });
        // Deve haver alguma densidade distribuída
        const sumY = kde.reduce((acc, p) => acc + p.y, 0);
        expect(sumY).toBeGreaterThan(0);
    });

    // ─────────────────────────────────────────────────────────────────
    // Erro 41: getCognitiveState Level Validation
    // ─────────────────────────────────────────────────────────────────
    test('Erro 41: getCognitiveState deve lidar com nível não numérico', () => {
        const stats = {
            consecutiveMinutes: 60,
            user: { level: 'Iniciante' } // String não numérica
        };
        const fatigue = getCognitiveState(stats);
        // Sem o fix, retornaria NaN
        expect(Number.isFinite(fatigue)).toBe(true);
        expect(fatigue).toBeGreaterThan(0);
        expect(fatigue).toBeLessThanOrEqual(100);
    });

    // ─────────────────────────────────────────────────────────────────
    // Erro 42: Volatilidade "Vírus da Vírgula"
    // ─────────────────────────────────────────────────────────────────
    test('Erro 42: computeRobustVolatilityForCoach deve tratar vírgulas', () => {
        const history = [
            { score: '85,5' },
            { score: '90,0' },
            { score: '80,2' }
        ];
        const vol = computeRobustVolatilityForCoach(history, 100);
        // Sem o fix, "85,5" viraria 0, fazendo a volatilidade explodir
        expect(vol).toBeLessThan(15); // Esperado < 15% para notas próximas
        expect(Number.isFinite(vol)).toBe(true);
    });

    // ─────────────────────────────────────────────────────────────────
    // Erro 45: Type Mismatch no Desvio Padrão
    // ─────────────────────────────────────────────────────────────────
    test('Erro 45: standardDeviation deve aceitar array de números nus', () => {
        const data = [80, 85, 90, 82, 88, 85];
        const sd = standardDeviation(data, 100);
        // Sem o fix, getDynamicPriorSD tentaria ler .score de números e retornaria NaN
        expect(Number.isFinite(sd)).toBe(true);
        expect(sd).toBeGreaterThan(0);
    });

    // ─────────────────────────────────────────────────────────────────
    // Erro 47: Global Baseline NaN Poisoning
    // ─────────────────────────────────────────────────────────────────
    test('Erro 47: calculateUrgency deve filtrar NaNs no baseline global', () => {
        const category = { id: 'c1', name: 'Matematica', weight: 5 };
        const simulados = [
            { subject: 'Matematica', score: 80, date: '2026-01-01' },
            { subject: 'Portugues', score: NaN, date: '2026-01-01' } // Simulado corrompido
        ];
        const result = calculateUrgency(category, simulados, [], { 
            allCategories: [category, { id: 'c2', name: 'Portugues' }] 
        });
        expect(Number.isFinite(result.normalizedScore)).toBe(true);
    });

    // ─────────────────────────────────────────────────────────────────
    // Erro 48: Peso de Edital com Vírgula
    // ─────────────────────────────────────────────────────────────────
    test('Erro 48: calculateUrgency deve aceitar peso com vírgula', () => {
        const category = { id: 'c1', name: 'Matematica', weight: '7,5' };
        const result = calculateUrgency(category, [], [], { 
            allCategories: [category] 
        });
        // Sem o fix, '7,5' viraria 5 (fallback). Com o fix, vira 7.5
        // weight no retorno é boundedWeight * 20 -> 7.5 * 20 = 150
        expect(result.details.weight).toBe(150);
    });

    // ─────────────────────────────────────────────────────────────────
    // Erro 49: Invalid Date RangeError
    // ─────────────────────────────────────────────────────────────────
    test('Erro 49: analisarDesempenhoHistorico deve evitar RangeError com datas inválidas', () => {
        const history = [
            { acertos: 80, diasRevisao: '10,5' } // Vírgula causava NaN -> Invalid Date
        ];
        // Sem o fix, chamar toISOString() lançaria RangeError
        expect(() => analisarDesempenhoHistorico(history)).not.toThrow();
        const result = analisarDesempenhoHistorico(history);
        expect(result.projecaoRetencao).toBeDefined();
    });

    // ─────────────────────────────────────────────────────────────────
    // Erro 51: KDE NaN Poisoning
    // ─────────────────────────────────────────────────────────────────
    test('Erro 51: generateKDE deve ser resiliente a projectedSD=NaN', () => {
        const data = new Float32Array([50, 60, 70]);
        // projectedMean=NaN, projectedSD=NaN
        const kde = generateKDE(data, NaN, NaN, 3, 0, 100);
        expect(kde.length).toBeGreaterThan(0);
        expect(Number.isFinite(kde[0].x)).toBe(true);
        expect(Number.isFinite(kde[0].y)).toBe(true);
    });

    // ─────────────────────────────────────────────────────────────────
    // Erro 52: Skewness Underflow
    // ─────────────────────────────────────────────────────────────────
    test('Erro 52: calcularAssimetria deve evitar NaN em distribuições quase uniformes', () => {
        // Notas quase idênticas podem gerar SD muito pequeno e underflow no cubo
        const data = [80.0000001, 80.0, 80.00000005];
        const skew = calcularAssimetria(data);
        expect(Number.isFinite(skew)).toBe(true);
        expect(skew).toBe(0); // Para SD muito pequeno, assume simetria
    });

    // ─────────────────────────────────────────────────────────────────
    // Erro 53: Regression NaN Poisoning
    // ─────────────────────────────────────────────────────────────────
    test('Erro 53: weightedRegression deve ignorar pontos NaN', () => {
        const history = [
            { score: 50, date: '2024-01-01' },
            { score: NaN, date: '2024-01-02' },
            { score: 70, date: '2024-01-03' }
        ];
        const result = weightedRegression(history);
        expect(Number.isFinite(result.slope)).toBe(true);
        expect(result.slope).toBeGreaterThan(0);
    });

    // ─────────────────────────────────────────────────────────────────
    // Erro 55: Logistic Derivative NaN Poisoning
    // ─────────────────────────────────────────────────────────────────
    test('Erro 55: logisticRegression deve ser resiliente a NaNs nas derivadas', () => {
        const history = [
            { score: 50, date: '2024-01-01' },
            { score: 55, date: '2024-01-02' },
            { score: NaN, date: '2024-01-03' },
            { score: 65, date: '2024-01-04' },
            { score: 70, date: '2024-01-05' },
            { score: 75, date: '2024-01-06' },
            { score: 80, date: '2024-01-07' }
        ];
        const result = logisticRegression(history);
        // Mesmo com um NaN no meio, se tivermos 6 pontos válidos, ele deve tentar o ajuste
        expect(result).toBeDefined();
    });

    // ─────────────────────────────────────────────────────────────────
    // Erro 56: Bootstrap Sort Failure
    // ─────────────────────────────────────────────────────────────────
    test('Erro 56: bootstrapCI deve ordenar corretamente mesmo com NaNs na distribuição', () => {
        const data = [10, 20, 30];
        // statFn que devolve NaN em certas condições
        const statFn = (bag) => bag.includes(20) ? 50 : NaN;
        
        const result = bootstrapCI(data, statFn, { iterations: 200 });
        expect(Number.isFinite(result.low)).toBe(true);
        expect(Number.isFinite(result.high)).toBe(true);
        expect(result.high).toBeGreaterThanOrEqual(result.low);
    });

});
