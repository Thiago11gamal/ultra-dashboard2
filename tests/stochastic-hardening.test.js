import { describe, it, expect } from 'vitest';
import { projectScore, monteCarloSimulation } from '../src/engine/projection.js';
import { computeBayesianLevel, computeCategoryStats } from '../src/engine/stats.js';
import { makeNormalRng } from '../src/engine/random.js';
import { generateGaussian } from '../src/engine/math/gaussian.ts';
import { estimateInterSubjectCorrelation } from '../src/engine/variance.js';
import { computeRollingCalibrationParams } from '../src/utils/calibration.js';

describe('Stochastic Engine Hardening & Architectural Safety', () => {

    it('1. options.currentMean deve ser respeitada transversalmente em projection.js', () => {
        const history = [
            { date: '2026-05-01', score: 40 },
            { date: '2026-05-05', score: 45 },
            { date: '2026-05-10', score: 50 }
        ];
        
        // Com o fix, passar options.currentMean deve influenciar a projeção
        const resNoOptions = projectScore(history, 30, 0, 100);
        const resWithOptions = projectScore(history, 30, 0, 100, { currentMean: 85 });
        
        expect(resWithOptions.projected).toBeGreaterThan(resNoOptions.projected);

        // Deve também influenciar monteCarloSimulation
        const simNoOptions = monteCarloSimulation(history, 60, 30, 1000);
        const simWithOptions = monteCarloSimulation(history, 60, 30, 1000, { currentMean: 85 });
        expect(simWithOptions.mean).toBeGreaterThan(simNoOptions.mean);
    });

    it('2. computeCategoryStats deve ser robusto a outliers usando MAD e Winsorization', () => {
        // Histórico com um outlier massivo (9999) e valores normais
        const normalHistory = [50, 52, 48, 51, 49];
        const outlierHistory = [50, 52, 48, 51, 49, 9999]; // Outlier extremo
        
        const statsNormal = computeCategoryStats(normalHistory, 1, 60, 100);
        const statsOutlier = computeCategoryStats(outlierHistory, 1, 60, 100);
        
        // Sem o fix, a variância e desvio padrão explodiriam devido ao outlier.
        // Com o fix robusto (MAD + clamp), o desvio padrão deve se manter sob controle e próximo ao normal.
        expect(statsOutlier.sd).toBeLessThan(statsNormal.sd * 5); // A robustez deve segurar a explosão
        expect(statsOutlier.mean).toBeLessThan(100); // A média também deve ser razoável
    });

    it('3. computeBayesianLevel deve tolerar score negativo, alpha/beta negativo e safeMaxScore <= 0', () => {
        // Tolerância a maxScore <= 0 (deve fallback para 100 e evitar divisão por zero)
        const resZeroMax = computeBayesianLevel(50, 10, 0);
        expect(resZeroMax.mean).toBeGreaterThan(0);
        
        // Tolerância a score negativo (deve clamp para >= 0)
        const resNegScore = computeBayesianLevel(-50, 10, 100);
        expect(resNegScore.mean).toBeLessThan(1);
        expect(resNegScore.mean).toBeGreaterThanOrEqual(0);

        // Tolerância a alpha/beta negativos
        const resNegParams = computeBayesianLevel([], -5, -10, 100);
        expect(resNegParams.alpha).toBeGreaterThanOrEqual(0);
        expect(resNegParams.beta).toBeGreaterThanOrEqual(0);
    });

    it('4. Geradores normais devem ter controle de loop infinito com limite de tentativas', () => {
        // Simulamos um gerador de números aleatórios quebrado que retorna sempre 0
        const brokenRng = () => 0;
        
        // Box-Muller generator não deve congelar a CPU, mas sair do loop graciosamente
        const normalRng = makeNormalRng(brokenRng);
        const normalVal = normalRng();
        expect(Number.isFinite(normalVal)).toBe(true);

        const gaussianVal = generateGaussian(brokenRng);
        expect(Number.isFinite(gaussianVal)).toBe(true);
    });

    it('5. estimateInterSubjectCorrelation deve usar ESS e shrinkage no nível do par', () => {
        const rows = [
            { math: 80, physics: 85 },
            { math: 82, physics: 88 }
        ];
        
        // Apenas dois registros têm sobreposição fraca (n = 2)
        // Com o fix, a correlação deve sofrer shrinkage forte em direção ao fallback (0.15)
        const correlation = estimateInterSubjectCorrelation(rows, ['math', 'physics'], 0.15);
        expect(correlation).toBeCloseTo(0.15, 1);
    });

    it('6. computeRollingCalibrationParams deve estabilizar os parâmetros sob escassez de dados', () => {
        // Escassez de dados: apenas 4 amostras (minSamples)
        // Usando probability e observed correspondentes a um Brier Score na faixa de 0.35 (ex: prob 0.59, obs 0 -> Brier ~0.35)
        const history = [
            { timestamp: Date.now() - 1000, probability: 0.59, observed: 0 },
            { timestamp: Date.now() - 2000, probability: 0.6, observed: 0 },
            { timestamp: Date.now() - 3000, probability: 0.58, observed: 0 },
            { timestamp: Date.now() - 4000, probability: 0.59, observed: 0 }
        ];

        // Sem o fix, confidenceFactor seria 1.0 (jump brusco).
        // Com o fix, confidenceFactor deve ser escalado pelo target (12 amostras), i.e., 4/12 = 0.33
        const params = computeRollingCalibrationParams(history, { minSamples: 4, targetSamples: 12 });
        expect(params.confidenceFactor).toBeCloseTo(0.33, 1);
        expect(params.baseline).toBeGreaterThan(0.2); // Deve estar entre o default (0.2) e a média (0.35)
    });

});
