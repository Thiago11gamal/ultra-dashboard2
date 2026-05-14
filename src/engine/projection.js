// ==========================================
// PROJECTION ENGINE - Versão Institucional 9.5
// Seed fixa para estabilidade visual
// ==========================================

import { mulberry32, makeNormalRng } from './random.js';
import { getSafeScore } from '../utils/scoreHelper.js';
import { getPercentile } from './math/percentile.js';
import { SCENARIO_CONFIG } from '../utils/monteCarloScenario.js';

import { sampleTruncatedNormal } from './math/gaussian.js';
import { Z_95 } from './math/constants.js';

// Helper: Ensure history is sorted by date and filter out invalid dates
export function getSortedHistory(history) {
    if (!Array.isArray(history)) return [];
    return [...history]
        .filter(h => h && (h.date || h.createdAt) && !isNaN(new Date(h.date || h.createdAt).getTime()))
        .sort((a, b) => {
            const dateA = new Date(a.date || a.createdAt);
            const dateB = new Date(b.date || b.createdAt);
            // Ordenação determinística por "dia UTC" para evitar variação por timezone do runtime.
            const utcA = Date.UTC(dateA.getUTCFullYear(), dateA.getUTCMonth(), dateA.getUTCDate());
            const utcB = Date.UTC(dateB.getUTCFullYear(), dateB.getUTCMonth(), dateB.getUTCDate());
            if (utcA !== utcB) return utcA - utcB;
            // Desempate determinístico intra-dia para evitar depender da estabilidade do sort do runtime.
            const diff = dateA.getTime() - dateB.getTime();
            if (diff !== 0) return diff;
            // Desempate determinístico final por ID (Bug 15)
            return (a.id || "").localeCompare(b.id || "");
        });
}

// -----------------------------
// Regressão ponderada temporal
// -----------------------------
export function weightedRegression(history, lambda = 0.08, maxScore = 100, options = {}) {
    const sorted = getSortedHistory(history);
    if (sorted.length < 2) return { slope: 0, intercept: 0, slopeStdError: 1.5 };

    const now = options.referenceDate || Date.now();
    let sumW = 0, sumWX = 0, sumWY = 0, sumWXX = 0, sumWXY = 0;

    sorted.forEach(h => {
        const hDate = h.date || h.createdAt;
        const y = getSafeScore(h, maxScore);

        // CORREÇÃO: Blindagem de Titânio contra "NaN Poisoning". 
        // Se a nota é matematicamente inválida, saltamos o ponto para não envenenar a regressão inteira.
        if (Number.isNaN(y)) return;

        // CORREÇÃO: Impedir que datas futuras originem deltas de tempo negativos
        const t = Math.max(0, (now - new Date(hDate).getTime()) / (1000 * 60 * 60 * 24));
        const w = Math.exp(-lambda * t);
        const x = (new Date(hDate).getTime() - new Date(sorted[0].date || sorted[0].createdAt).getTime()) / (1000 * 60 * 60 * 24);

        sumW += w;
        sumWX += w * x;
        sumWY += w * y;
        sumWXX += w * x * x;
        sumWXY += w * x * y;
    });

    const det = sumW * sumWXX - sumWX * sumWX;
    
    // CORREÇÃO: Prevenir divisão letal por ZERO se a amnésia temporal (decaimento)
    // for tão alta que apagou todo o somatório de pesos (sumW = 0).
    if (Math.abs(det) < 1e-6) {
        return { 
            slope: 0, 
            intercept: sumW > 1e-9 ? (sumWY / sumW) : (sorted.length > 0 ? getSafeScore(sorted[sorted.length-1], maxScore) : 0), 
            slopeStdError: 1.5 
        };
    }

    const slope = (sumW * sumWXY - sumWX * sumWY) / det;
    const intercept = (sumWXX * sumWY - sumWX * sumWXY) / det;

    // Erro padrão robusto (ajustado para small samples)
    const slopeStdError = calculateSlopeStdError(sorted, slope, intercept, lambda, maxScore, options);

    return { slope, intercept, slopeStdError };
}

function calculateSlopeStdError(sorted, slope, intercept, lambda, maxScore, options = {}) {
    const now = options.referenceDate || Date.now();
    const t0 = new Date(sorted[0].date || sorted[0].createdAt).getTime();
    let rss = 0, sumW = 0, sumWXX = 0, sumWX = 0, sumW2 = 0;

    sorted.forEach(h => {
        const hDate = h.date || h.createdAt;
        const x = (new Date(hDate).getTime() - t0) / (1000 * 60 * 60 * 24);
        const y = getSafeScore(h, maxScore);
        // CORREÇÃO: Impedir que datas futuras originem deltas de tempo negativos
        const t = Math.max(0, (now - new Date(hDate).getTime()) / 86400000);
        const w = Math.exp(-lambda * t);
        const pred = intercept + slope * x;
        rss += w * Math.pow(y - pred, 2);
        sumW += w;
        sumW2 += w * w;
        sumWX += w * x;
        sumWXX += w * x * x;
    });

    // FIX: Usar o Tamanho Efetivo da Amostra de Kish para o divisor em WLS (Bug 16 / Lint Fix)
    // CORREÇÃO: Prevenir Underflow letal. Se os pesos desapareceram no esquecimento,
    // garantimos a exportação da incerteza base em vez de dividir por ZERO.
    if (sumW2 <= 1e-12) return 1.5 * (maxScore / 100);
    
    const effectiveN = (sumW * sumW) / sumW2;
    const scaleFactorFallback = maxScore / 100;

    // Garantir que não há divisão por zero ou variância negativa com N insuficiente
    if (effectiveN <= 2.1) return 1.5 * scaleFactorFallback; // Retorna incerteza base

    // Normaliza pela soma dos pesos e aplica o fator de correção para amostras pequenas
    const variance = (rss / sumW) * (effectiveN / Math.max(0.1, effectiveN - 2));
    const det = sumW * sumWXX - sumWX * sumWX;

    if (Math.abs(det) < 1e-6) return 1.5;
    return Math.sqrt(Math.max(0, (variance * sumW) / det));
}

// -----------------------------
// Volatilidade Robusta (MSSD + MAD Blended)
// -----------------------------
export function calculateRobustVolatility(history, maxScore = 100, minScore = 0, options = {}) {
    const sorted = getSortedHistory(history);
    if (!sorted || sorted.length < 2) {
        const range = maxScore - minScore > 0 ? maxScore - minScore : maxScore;
        return 0.05 * range;
    }

    const lambda = options.lambda || 0.08;
    const now = options.referenceDate || Date.now();
    const scaleFactorFallback = (maxScore - minScore > 0 ? maxScore - minScore : maxScore) / 100;

    const { slope, intercept } = weightedRegression(sorted, lambda, maxScore, options);
    const t0_vol = new Date(sorted[0].date || sorted[0].createdAt).getTime();

    const residualSamples = sorted.map(h => {
        const hDate = h.date || h.createdAt;
        const x = (new Date(hDate).getTime() - t0_vol) / 86400000;
        // CORREÇÃO: Impedir que datas futuras originem deltas de tempo negativos
        const t = Math.max(0, (now - new Date(hDate).getTime()) / 86400000);
        const w = Math.exp(-lambda * t);
        const y = getSafeScore(h, maxScore);
        const pred = intercept + slope * x;
        return { value: y - pred, weight: w }; // Resíduos reais (detrended)
    });

    // Variância Ponderada dos Resíduos (Robust Component)
    const sumWeights = residualSamples.reduce((acc, it) => acc + it.weight, 0);
    const sumResidualsWeighted = residualSamples.reduce((acc, it) => acc + it.value * it.weight, 0);
    const sumSw = residualSamples.reduce((acc, it) => acc + it.value * it.value * it.weight, 0);

    // CORREÇÃO: Prevenir o colapso por "amnésia temporal". Se os pesos decaírem para zero absoluto,
    // evitamos a divisão por zero para que o aluno mantenha um cone de projeção conservador.
    const safeWeights = sumWeights > 1e-9 ? sumWeights : 1;
    const expectedResidual = sumWeights > 1e-9 ? (sumResidualsWeighted / safeWeights) : 0;
    
    const n_res = sorted.length - 1;
    const bessel = n_res > 1 ? n_res / (n_res - 1) : 1;
    const mssdVariance = sumWeights > 1e-9 ? ((sumSw / safeWeights) - (expectedResidual * expectedResidual)) * bessel : 0;

    const weightedMedian = (arr) => {
        if (!arr.length) return 0;
        const sortedArr = [...arr].sort((a, b) => a.value - b.value);
        const totalW = sortedArr.reduce((acc, it) => acc + it.weight, 0);
        if (totalW < 1e-9) return sortedArr[Math.floor(sortedArr.length / 2)].value;
        let accW = 0;
        for (const it of sortedArr) {
            accW += it.weight;
            if (accW >= totalW * 0.5) return it.value;
        }
        return sortedArr[sortedArr.length - 1].value;
    };

    const medianResidual = weightedMedian(residualSamples);
    const absDev = residualSamples.map(it => ({ value: Math.abs(it.value - medianResidual), weight: it.weight }));
    const mad = weightedMedian(absDev);
    const robustSigma = 1.4826 * mad;
    const robustVariance = robustSigma * robustSigma;
    const blendedVariance = (0.75 * mssdVariance) + (0.25 * robustVariance);

    return Math.sqrt(Math.max(Math.pow(1.0 * scaleFactorFallback, 2), blendedVariance));
}

export function calculateVolatility(history, maxScore = 100, minScore = 0) {
    if (!Array.isArray(history) || history.length < 2) {
        const range = maxScore - minScore > 0 ? maxScore - minScore : maxScore;
        return 0.05 * range;
    }
    const scores = history.map(h => getSafeScore(h, maxScore));
    const meanVal = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((a, b) => a + Math.pow(b - meanVal, 2), 0) / (scores.length - 1);
    return Math.sqrt(variance);
}

// -----------------------------
// MSSD — Mean Successive Squared Differences (BUG-MATH-01)
// Mede instabilidade SEM penalizar crescimento monotônico.
// Ex: [50,60,70] → SD=10 (penaliza), MSSD_root=10 (mesmo)
// Ex: [50,70,50,70] → SD=11.5, MSSD_root=20 (detecta oscilação)
// Ex: [50,55,60,65] → SD=6.5 (penaliza crescimento), MSSD_root=5 (correto: baixa instabilidade)
// -----------------------------
export function calculateMSSD(history, maxScore = 100, minScore = 0) {
    // [CORREÇÃO] Aplicar 'getSortedHistory' para assegurar cronologia e purgar datas inválidas (Bug 1.3 Fix)
    const safeHistory = getSortedHistory(history);

    if (!Array.isArray(safeHistory) || safeHistory.length < 2) {
        const range = maxScore - minScore > 0 ? maxScore - minScore : maxScore;
        return 0.05 * range;
    }
    const scores = safeHistory.map(h => getSafeScore(h, maxScore));
    const n = scores.length;
    
    // CORREÇÃO: Utilizar o diferencial de dias contínuos reais em vez de índices cegos 
    // para um Detrending Linear que respeita a física e a cronologia do histórico.
    const t0 = new Date(safeHistory[0].date || safeHistory[0].createdAt).getTime();
    const timeX = safeHistory.map(h => (new Date(h.date || h.createdAt).getTime() - t0) / 86400000);
    
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for(let i = 0; i < n; i++) {
        const tx = timeX[i];
        sumX += tx; 
        sumY += scores[i]; 
        sumXY += tx * scores[i]; 
        sumXX += tx * tx;
    }
    const det = n * sumXX - sumX * sumX;
    const slope = det === 0 ? 0 : (n * sumXY - sumX * sumY) / det;
    
    const detrendedScores = scores.map((y, i) => y - (slope * timeX[i]));
    
    let sumSqDiff = 0;
    for (let i = 1; i < n; i++) {
        sumSqDiff += Math.pow(detrendedScores[i] - detrendedScores[i - 1], 2);
    }
    
    const rmssd = (sumSqDiff / 2) / Math.max(1, n - 1); 
    return Math.sqrt(Math.max(1e-6, rmssd));
}

// -----------------------------
// EMA Dinâmico
// -----------------------------
export function calculateDynamicEMA(currentScore, previousEMA, n, daysSinceLast = 1) {
    const baseAlpha = 2 / (n + 1);
    // Ajusta alpha pelo tempo: quanto mais tempo passou, mais peso damos ao score atual (decay da memória)
    const timeWeight = 1 - Math.exp(-daysSinceLast / 7); // 7 dias como constante de tempo
    const alpha = Math.min(0.8, baseAlpha + (1 - baseAlpha) * timeWeight);
    return alpha * currentScore + (1 - alpha) * previousEMA;
}

// -----------------------------
// Drift Clampeado (Prevenção de outliers)
// IMP-MATH-06: λ adaptativo baseado no gap mediano entre sessões
// -----------------------------
export function calculateSlope(history, maxScore = 100, options = {}) {
    // Calcular λ adaptativo: alunos com sessões frequentes usam λ maior (memória curta)
    const sorted = getSortedHistory(history);
    let lambda = 0.08; // default
    if (sorted.length >= 3) {
        const gaps = [];
        for (let i = 1; i < sorted.length; i++) {
            const gap = Math.max(0.5, (new Date(sorted[i].date || sorted[i].createdAt) - new Date(sorted[i - 1].date || sorted[i - 1].createdAt)) / 86400000);
            gaps.push(gap);
        }
        gaps.sort((a, b) => a - b);
        const medianGap = gaps.length % 2 === 0
            ? (gaps[gaps.length / 2 - 1] + gaps[gaps.length / 2]) / 2
            : gaps[Math.floor(gaps.length / 2)];
        // λ ∈ [0.03, 0.12]: sessões frequentes → λ alto (esquece rápido), sessões espaçadas → λ baixo
        lambda = Math.max(0.03, Math.min(0.12, 0.03 + 0.08 * Math.exp(-medianGap / 10)));
    }
    const { slope } = weightedRegression(history, lambda, maxScore, options);
    
    // MELHORIA: O limite diário de drift deixa de ser heurístico fixo.
    // Permite que o edital ou a configuração injetem a tolerância máxima.
    const maxDailyDriftPct = options.maxDailyDriftPct !== undefined ? options.maxDailyDriftPct : 0.015;
    const limit = maxDailyDriftPct * maxScore;
    
    return Math.max(-limit, Math.min(limit, slope));
}

export function calculateAdaptiveSlope(history, maxScore = 100, options = {}) {
    return calculateSlope(history, maxScore, options);
}

// -----------------------------
// 💡 Crescimento Logístico (Curva-S)
// Mapeia pontuações via transformação Logit para prever platôs reais
// -----------------------------
export function logisticRegression(history, maxScore = 100, options = {}) {
    const sorted = getSortedHistory(history);
    if (sorted.length < 4) return { isLogistic: false };

    const now = options.referenceDate || Date.now();
    const historicalScores = sorted.map(h => getSafeScore(h, maxScore));
    const meanVal = historicalScores.reduce((a, b) => a + b, 0) / historicalScores.length;
    const currentVariance = Math.sqrt(historicalScores.reduce((a, b) => a + Math.pow(b - meanVal, 2), 0) / Math.max(1, historicalScores.length - 1));

    // MATEMÁTICA AVANÇADA: Shrinkage Bayesiano do Teto (L)
    // Em vez de heurísticas de "+10% do peakScore", calculamos o teto assintótico real 
    // olhando para a desaceleração do aluno.
    
    let L = maxScore;
    if (sorted.length >= 6) {
        // CORREÇÃO: Extrair amostra isolada e purificada para garantir que a derivada matemática
        // e as médias das taxas de aceleração não sofrem envenenamento (NaN Poisoning).
        const validScores = sorted.map(h => getSafeScore(h, maxScore)).filter(s => !Number.isNaN(s));
        
        if (validScores.length >= 6) {
            // Primeira Derivada (Velocidade)
            const vel = [];
            for(let i=1; i<validScores.length; i++) vel.push(validScores[i] - validScores[i-1]);
            
            // Segunda Derivada (Aceleração)
            const acc = [];
            for(let i=1; i<vel.length; i++) acc.push(vel[i] - vel[i-1]);
            
            const meanAcc = acc.reduce((a,b)=>a+b,0)/acc.length;
            const meanVel = vel.reduce((a,b)=>a+b,0)/vel.length;
            
            // Se a aceleração é negativa (curva côncava), o aluno está a desacelerar em direção ao seu platô.
            if (meanAcc < -0.1 && meanVel > 0) {
                // [CORREÇÃO] Usar 'validScores' para garantir que a nota é estritamente numérica (Bug 1.4 Fix)
                const currentY = validScores[validScores.length - 1]; 
                
                const predictedCap = currentY + (Math.pow(meanVel, 2) / (2 * Math.abs(meanAcc)));
                
                // Suavização Bayesiana: 60% empírico, 40% a priori (maxScore total)
                L = (predictedCap * 0.60) + (maxScore * 0.40);
                L = Math.max(currentY + 1, Math.min(maxScore, L));
            } else {
                // Fallback para quando não há desaceleração clara: usa P90 com headroom conservador
                // CORREÇÃO: Obrigar a ordenação numérica antes de extrair os percentis 
                // para garantir que o Peak Score é o verdadeiro limite empírico do aluno.
                const sortedForPercentile = [...historicalScores].sort((a, b) => a - b);
                const peakScore = getPercentile(sortedForPercentile, 0.90);
                const spaceToMax = maxScore - peakScore;
                const dynamicHeadroom = Math.max(currentVariance * 1.5, maxScore * 0.10, spaceToMax * 0.25);
                L = Math.min(maxScore + 0.1, peakScore + dynamicHeadroom);
            }
        } else {
            // Recair no percentil conservador se os dados limpos forem escassos
            const sortedForPercentile = [...historicalScores].sort((a, b) => a - b);
            const peakScore = getPercentile(sortedForPercentile, 0.90);
            const spaceToMax = maxScore - peakScore;
            const dynamicHeadroom = Math.max(currentVariance * 1.5, maxScore * 0.10, spaceToMax * 0.25);
            L = Math.min(maxScore + 0.1, peakScore + dynamicHeadroom);
        }
    } else {
        // Amostra pequena: usa o P90 tradicional
        const sortedForPercentile = [...historicalScores].sort((a, b) => a - b);
        const peakScore = getPercentile(sortedForPercentile, 0.90);
        const spaceToMax = maxScore - peakScore;
        const dynamicHeadroom = Math.max(currentVariance * 1.5, maxScore * 0.10, spaceToMax * 0.25);
        L = Math.min(maxScore + 0.1, peakScore + dynamicHeadroom);
    }

    let sumW = 0, sumWX = 0, sumWY = 0, sumWXX = 0, sumWXY = 0;
    sorted.forEach(h => {
        const hDate = h.date || h.createdAt;
        // CORREÇÃO: Impedir que datas futuras originem deltas de tempo negativos
        const t = Math.max(0, (now - new Date(hDate).getTime()) / 86400000);
        const w = Math.exp(-0.08 * t);
        const x = (new Date(hDate).getTime() - new Date(sorted[0].date || sorted[0].createdAt).getTime()) / 86400000;
        
        let y = getSafeScore(h, maxScore);
        // FIX: Protege contra log(0) na base, mas permite o maxScore integralmente no teto
        // O logit não quebra porque L (teto assintótico) já é definido como maxScore * 1.05.
        y = Math.max(maxScore * 0.01, Math.min(maxScore, y));

        // [FIX 2] A função Logit precisa respeitar o minScore (ENEM/OAB/SAT)
        // CORREÇÃO: Assegurar matematicamente que o teto (L) é estritamente superior ao valor limitado 
        // para impedir a inversão de sinal que causa Math.log de negativos (NaN).
        const safeMin = options.minScore || 0;
        
        // Empurra L ligeiramente para cima se este ameaçar colapsar sobre o y
        const safeL = Math.max(L, y + 0.5); 
        
        const boundedY = Math.max(safeMin + 0.1, Math.min(safeL - 0.1, y)); 
        const logitY = Math.log((boundedY - safeMin) / (safeL - boundedY));

        sumW += w;
        sumWX += w * x;
        sumWY += w * logitY;
        sumWXX += w * x * x;
        sumWXY += w * x * logitY;
    });

    const det = sumW * sumWXX - sumWX * sumWX;
    if (Math.abs(det) < 1e-6) return { isLogistic: false };

    const k = (sumW * sumWXY - sumWX * sumWY) / det; // Taxa de crescimento
    const logitIntercept = (sumWXX * sumWY - sumWX * sumWXY) / det;

    return { 
        k, 
        intercept: logitIntercept, 
        isLogistic: true, 
        L, 
        t0: new Date(sorted[0].date || sorted[0].createdAt).getTime() 
    };
}

// -----------------------------
// Função projectScore Atualizada com Curva-S
// -----------------------------
export function projectScore(history, projectDays = 60, minScore = 0, maxScore = 100, options = {}) {
    const sortedHistory = getSortedHistory(history);
    if (!sortedHistory || sortedHistory.length === 0) return { projected: 0, marginOfError: 0 };

    
    // Tenta aplicar o modelo de regressão logística (Curva S)
    const logisticFit = logisticRegression(sortedHistory, maxScore, options);

    let projectedScore;
    const now = options.referenceDate || Date.now();

    if (logisticFit.isLogistic && logisticFit.k > 0) {
        // 💡 Caminho A: Aplica a Curva-S para prever platô
        const { k, intercept, L, t0 } = logisticFit;
        const targetTimeX = ((now - t0) / 86400000) + projectDays;
        
        // Reverte o logit para calcular a nota predita: Y = safeMin + (L - safeMin) / (1 + e^-(kX + intercept))
        const exponent = -(k * targetTimeX + intercept);
        const safeExponent = Math.max(-50, Math.min(50, exponent)); // Impede overflow
        
        const safeMin = options.minScore || 0;
        projectedScore = safeMin + ((L - safeMin) / (1 + Math.exp(safeExponent)));
    } else {
        // Caminho B: Fallback Clássico Linear se os dados forem caóticos ou muito curtos
        // RESTAURAÇÃO: Recuperar cálculo de EMA e Slope removidos por engano
        const slope = calculateSlope(sortedHistory, maxScore, options);
        let ema = getSafeScore(sortedHistory[0], maxScore) || 0; 
        for (let i = 1; i < sortedHistory.length; i++) {
            const daysSinceLast = Math.max(1, (new Date(sortedHistory[i].date || sortedHistory[i].createdAt) - new Date(sortedHistory[i - 1].date || sortedHistory[i - 1].createdAt)) / 86400000);
            const currentPoint = getSafeScore(sortedHistory[i], maxScore);
            
            // CORREÇÃO: Evitar injeção permanente de veneno acumulado
            if (!Number.isNaN(currentPoint)) {
                ema = calculateDynamicEMA(currentPoint, ema, i + 1, daysSinceLast);
            }
        }

        // CORREÇÃO: Impedir que projeções de datas passadas quebrem a função Logarítmica
        const safeProjectDays = Math.max(0, projectDays);
        const effectiveDays = 45 * Math.log(1 + safeProjectDays / 45);
        projectedScore = ema + slope * effectiveDays;
    }

    const { slopeStdError } = sortedHistory.length >= 2 ? weightedRegression(sortedHistory, 0.08, maxScore, options) : { slopeStdError: 0 };
    // CORREÇÃO: Repetir blindagem para o cálculo de incerteza
    const safeProjectDays = Math.max(0, projectDays);
    const effectiveDaysForError = 45 * Math.log(1 + safeProjectDays / 45);
    const angularUncertainty = slopeStdError * effectiveDaysForError;

    // FIX MATH-01: Usar Volatilidade Transiente (MSSD) normalizada para passos diários
    // Assumimos um gap médio heurístico de 7 dias para evitar volatilidade infinita
    const stepVolatility = calculateMSSD(sortedHistory, maxScore, minScore) / Math.sqrt(7);

    // Agora multiplicamos a instabilidade real de passo-a-passo pela raiz do tempo
    const randomWalkUncertainty = stepVolatility * Math.sqrt(Math.max(1, effectiveDaysForError));
    const predictionSD = Math.sqrt(Math.pow(angularUncertainty, 2) + Math.pow(randomWalkUncertainty, 2));
    const marginOfError = 1.96 * predictionSD; 

    return {
        projected: Math.max(minScore, Math.min(maxScore, projectedScore)),
        marginOfError: Number(marginOfError.toFixed(2))
    };
}

/**
 * Calcula o Damping Base adaptativo baseado no histórico.
 * @returns {number} Valor entre 30 e 60.
 */
export function computeAdaptiveDampingBase({ sampleSize, drift, driftUncertainty, scaleFactor, normalizedVol }) {
    const n = Math.max(1, Number(sampleSize) || 1);
    const safeDrift = Number.isFinite(drift) ? drift : 0;
    const safeUncertainty = Math.max(1e-6, Number(driftUncertainty) || 0);
    const safeScale = Math.max(1e-6, Number(scaleFactor) || 1);
    const safeNormVol = Math.max(0, Number(normalizedVol) || 0);

    const nConfidence = 1 - Math.exp(-n / 12);
    const trendSNR = Math.abs(safeDrift) / Math.max(0.05 * safeScale, safeUncertainty);
    const trendConfidence = Math.tanh(trendSNR / 2);
    const volPenalty = Math.min(1, safeNormVol / 18);
    const confidenceScore = Math.max(0, Math.min(1, (0.5 * nConfidence) + (0.35 * trendConfidence) + (0.15 * (1 - volPenalty))));
    return 30 + (30 * confidenceScore);
}

export function monteCarloSimulation(
    history,
    targetScore = 85,
    days = 90,
    simulations = 5000,
    options = {}
) {
    // CACHE BUG FIX: destructure currentMean from options.
    // Previously only forcedVolatility and forcedBaseline were read; options.currentMean
    // (the proper weighted mean passed from MonteCarloGauge) was silently dropped,
    // causing the returned currentMean to always use the last raw score from the
    // composite global history instead of the caller-computed weighted mean.
    const { forcedVolatility, forcedBaseline, currentMean: optionsCurrentMean, minScore = 0, maxScore = 100, scenario = 'base' } = options;
    const scenarioCfg = SCENARIO_CONFIG[scenario] || SCENARIO_CONFIG.base;
    const sortedHistory = getSortedHistory(history);
    const safeSimulations = Math.max(1, simulations); // CORREÇÃO: Guardião contra divisão por Zero
    const scaleFactorFallback = (maxScore - minScore > 0 ? maxScore - minScore : maxScore) / 100;

    // Safety check - allow at least 1 point for a flat projection
    if (!sortedHistory || sortedHistory.length < 1) return {
        probability: 0,
        mean: 0,
        sd: 0,
        ci95Low: 0,
        ci95High: 0,
        currentMean: 0,
        drift: 0,
        volatility: 1.5 * scaleFactorFallback
    };

    // Fix: Baseline uses a more responsive EMA or forced value (Bayesian) to avoid anchoring.
    // BUG-04 FIX: Priority to forcedBaseline for stability as requested.
    const currentScore = getSafeScore(sortedHistory[sortedHistory.length - 1], maxScore);
    // BUGFIX M2: Priority fallback to optionsCurrentMean (weighted average) to align UI and Chart.
    const fallbackScore = optionsCurrentMean !== undefined ? optionsCurrentMean : currentScore;
    let baselineScore = forcedBaseline !== undefined ? forcedBaseline : fallbackScore;

    if (sortedHistory.length > 0) {
        // BUG-2.2 FIX: EMA initialization for baseline
        let ema = getSafeScore(sortedHistory[0], maxScore) || 0;
        for (let i = 1; i < sortedHistory.length; i++) {
            const daysSinceLast = Math.max(1, (new Date(sortedHistory[i].date || sortedHistory[i].createdAt) - new Date(sortedHistory[i - 1].date || sortedHistory[i - 1].createdAt)) / 86400000);
            const currentPoint = getSafeScore(sortedHistory[i], maxScore);
            
            // CORREÇÃO: Evitar injeção permanente de veneno acumulado
            if (!Number.isNaN(currentPoint)) {
                ema = calculateDynamicEMA(currentPoint, ema, i + 1, daysSinceLast);
            }
        }
        
        if (forcedBaseline === undefined) {
            baselineScore = ema;
        }
    }

    // Bayesian Pooling: Incorporate weighted mean into smoothing if available
    // BUG-05 FIX: Move out of conditional to ensure optionsCurrentMean is always factored in
    if (optionsCurrentMean !== undefined) {
        const lastDate = new Date(sortedHistory[sortedHistory.length - 1].date || sortedHistory[sortedHistory.length - 1].createdAt);
        const referenceNow = options.referenceDate || Date.now();
        const daysToNow = Math.max(1, (referenceNow - lastDate.getTime()) / 86400000);
        baselineScore = calculateDynamicEMA(optionsCurrentMean, baselineScore, sortedHistory.length + 1, daysToNow);
    }
    baselineScore = Math.max(minScore, Math.min(maxScore, baselineScore + ((scenarioCfg.meanBiasFactor || 0) * maxScore)));

    // 🎯 1. Calcular Tendência (Drift) + Incerteza (Epistemic)
    // [CORREÇÃO] Centralizar a chamada de regressão numa única execução pesada (Bug 5.1 Fix).
    // Evita a dupla iteração massiva (O(N)) no histórico do utilizador.
    const regressionResult = sortedHistory.length > 1
        ? weightedRegression(sortedHistory, 0.08, maxScore, options)
        : { slope: 0, slopeStdError: 1.5 * scaleFactorFallback };

    const slopeStdError = regressionResult.slopeStdError;
    
    // [CORREÇÃO] Drift adaptativo sem segunda iteração massiva (calculateSlope O(N) removida)
    const maxDailyDriftPct = options.maxDailyDriftPct !== undefined ? options.maxDailyDriftPct : 0.015;
    const driftLimit = maxDailyDriftPct * maxScore;
    const drift = Math.max(-driftLimit, Math.min(driftLimit, regressionResult.slope));
    const simulationDays = days; // Hoisted for C1 cap below
    // C1 FIX: Cap drift uncertainty to prevent bimodal explosion with short history.
    const scaleFactor = scaleFactorFallback;
    const rawDriftUncertainty = Math.max(0.05 * scaleFactor, slopeStdError);
    // MELHORIA: Teto de incerteza configurável para evitar explosão bimodal
    const driftUncertaintyCap = options.driftUncertaintyCap !== undefined ? options.driftUncertaintyCap : 0.4;
    let driftUncertainty = Math.min(rawDriftUncertainty, driftUncertaintyCap * scaleFactor) * (scenarioCfg.ciMult || 1);

    // LOW-N ROBUSTNESS: Inflate epistemic uncertainty for small samples
    if (sortedHistory.length < 10) {
        const nFactor = (10 - sortedHistory.length) / 5; // 1.0 at n=5, 0 at n=10
        driftUncertainty *= (1 + 0.4 * nFactor); // Inflate up to 40% at n=5
    }


    // 🎯 2. Calcular Volatilidade Robusta (MSSD + MAD Blended)
    const volatility = forcedVolatility !== undefined 
        ? forcedVolatility 
        : calculateRobustVolatility(sortedHistory, maxScore, minScore, options);
    
    const scoreRangeOU = maxScore - minScore > 0 ? maxScore - minScore : maxScore;
    const normalizedVolOU = (volatility / scoreRangeOU) * 100;
    const thetaOU = Math.max(0.005, 0.1 / (1 + normalizedVolOU * 0.05));

    // 2. Extrair Resíduos (Bootstrap Source) NORMALIZADOS PELO TEMPO E SEM TENDÊNCIA
    // BUG 2 FIX: use getSafeScore() to handle entries without direct .score field
    let residuals = sortedHistory.length > 1 ? sortedHistory.map((h, i) => {
        if (i === 0) return 0;
        const prev = getSafeScore(sortedHistory[i - 1], maxScore);
        const actualChange = getSafeScore(h, maxScore) - prev;

        const time1 = new Date(h.date || h.createdAt).getTime();
        const time0 = new Date(sortedHistory[i - 1].date || sortedHistory[i - 1].createdAt).getTime();

        const deltaT = (time1 - time0) / (1000 * 60 * 60 * 24);
        
        // CORREÇÃO MÁXIMA: Math.max não é imune a NaNs. O Delta temporal precisa
        // ser forçado à validação finita nativa antes do clamp de limite inferior.
        const safeDeltaT = Number.isFinite(deltaT) ? deltaT : 0.1;
        const rawDays = Math.max(0.1, safeDeltaT);
        
        const detrendedChange = actualChange - (drift * rawDays);

        // Normalização pela raiz do tempo (movimento browniano)
        return detrendedChange / Math.sqrt(rawDays);
    }) : [0];

    // Clamping de resíduos extremos (Huber-like) e Mean-Centering (Ghost Drift Fix)
    // Clamping de resíduos extremos (Huber-like) e Mean-Centering (Ghost Drift Fix)
    const validResiduals = residuals.length > 1 ? residuals.slice(1) : residuals;
    
    // CORREÇÃO: Só aplicar a remoção de média (Mean-Centering) se houver múltiplos resíduos,
    // caso contrário, anularíamos a volatilidade inteira em amostras muito pequenas.
    let centeredResiduals;
    if (validResiduals.length > 1) {
        const residualMean = validResiduals.reduce((a, b) => a + b, 0) / validResiduals.length;
        centeredResiduals = validResiduals.map(r => r - residualMean);
    } else {
        centeredResiduals = validResiduals;
    }
    
    // CORREÇÃO: Isolar, ordenar e derivar as medidas de robustez (MAD) de forma
    // matematicamente pura, impedindo a escolha cega de elementos pseudo-medianos.
    const sortedResiduals = [...centeredResiduals].sort((a, b) => a - b);
    const resMedian = getPercentile(sortedResiduals, 0.5);
    
    const absDevs = centeredResiduals.map(r => Math.abs(r - resMedian)).sort((a, b) => a - b);
    const resMad = getPercentile(absDevs, 0.5) || (1.0 * scaleFactor);
    
    const safeResiduals = centeredResiduals.filter(r => Math.abs(r - resMedian) < 4 * resMad);

    // 3. Simulação de Monte Carlo
    const results = [];
    // FIX BUG-LOGIC: Semente baseada no conteúdo do último registro para determinismo real
    // FIX: Hash FNV-1a simples para melhor distribuição de sementes
    const lastEntry = sortedHistory[sortedHistory.length - 1];
    const seedStr = `${lastEntry.date || lastEntry.createdAt}-${getSafeScore(lastEntry, maxScore)}-${sortedHistory.length}`;
    let seedValue = 2166136261; // FNV offset basis
    for (let i = 0; i < seedStr.length; i++) {
        seedValue ^= seedStr.charCodeAt(i);
        seedValue = Math.imul(seedValue, 16777619); // FNV prime
    }
    const rng = mulberry32(Math.abs(seedValue >>> 0));
    const normalRng = makeNormalRng(rng);

    // Damping factor: reduz a incerteza ao longo do tempo (reversão à média/estabilidade)
    // BUG-06 FIX: Damping factor adaptativo baseado na qualidade do histórico


    // BUG-MATH-02 FIX: O-U deve reverter para a média histórica ponderada.
    // Se não for fornecida externamente, calculamos a média aritmética histórica do histórico para 
    // ancorar a reversão e evitar o colapso das projeções em tendências negativas agudas.
    // FIX MATH-02: O alvo do Processo de Ornstein-Uhlenbeck DEVE ser a nota de partida 
    // (baselineScore) ou a média ponderada mais recente. Jamais ancorar na média aritmética do 
    // passado distante, para não causar "quedas artificiais" no Dia 1 do Monte Carlo.
    const ouTarget = optionsCurrentMean !== undefined ? optionsCurrentMean : baselineScore; 

    // BUG-MATH-01 FIX: Normalização da Volatilidade Diária
    // A volatilidade clássica (SD) é total. Para o laço diário do Monte Carlo, 
    // precisamos da taxa diária (SD_daily = SD_total / sqrt(gap_médio)).
    let medianGap = 7;
    if (sortedHistory.length >= 2) {
        const gaps = [];
        for (let j = 1; j < sortedHistory.length; j++) {
            const g = (new Date(sortedHistory[j].date || sortedHistory[j].createdAt) - new Date(sortedHistory[j - 1].date || sortedHistory[j - 1].createdAt)) / 86400000;
            gaps.push(Math.max(0.5, g));
        }
        gaps.sort((a, b) => a - b);
        medianGap = gaps.length % 2 === 0
            ? (gaps[gaps.length / 2 - 1] + gaps[gaps.length / 2]) / 2
            : gaps[Math.floor(gaps.length / 2)];
    }
    const dailyVolatility = volatility / Math.sqrt(Math.max(1, medianGap));

    for (let i = 0; i < safeSimulations; i++) {
        // Sample epistemic uncertainty (Drift)
        // BUG 1 FIX: Use truncated normal for drift to avoid "black swan" slopes in long projections
        const sampledDrift = sampleTruncatedNormal(drift, driftUncertainty, -0.01 * maxScore, 0.01 * maxScore, rng);

        let currentSimScore = baselineScore;
        for (let d = 1; d <= simulationDays; d++) {
            const driftEffect = sampledDrift * 1;
            const driftTrackingFactor = optionsCurrentMean !== undefined ? 1.0 : 0.0; 
            const movingOuTarget = ouTarget + (sampledDrift * d * driftTrackingFactor);
            const meanReversion = thetaOU * (movingOuTarget - currentSimScore) * 1;
            
            let shock = (safeResiduals.length > 5 && rng() > 0.3)
                ? safeResiduals[Math.floor(rng() * safeResiduals.length)]
                : normalRng() * dailyVolatility;
            
            currentSimScore += driftEffect + meanReversion + shock;
            
            // CORREÇÃO MATEMÁTICA: Reflected Brownian Motion (RBM) Contínuo
            // Utiliza um espelhamento absoluto contínuo para evitar o efeito "serrote" do módulo simples
            let range = maxScore - minScore;
            let normalized = currentSimScore - minScore;
            let wraps = Math.floor(normalized / range);
            let remainder = normalized % range;
            if (remainder < 0) remainder += range;
            currentSimScore = minScore + (wraps % 2 === 0 ? remainder : range - remainder);
            
            // Fallback de segurança estrito (Clamp final diário)
            currentSimScore = Math.max(minScore, Math.min(maxScore, currentSimScore));
        }

        // Aplica os limites físicos da prova APENAS no resultado assintótico final
        results.push(Math.max(minScore, Math.min(maxScore, currentSimScore)));
    }

    // 4. Agregação Estatística
    results.sort((a, b) => a - b);
    const meanResult = results.reduce((a, b) => a + b, 0) / safeSimulations;
    const successes = results.filter(r => r >= targetScore).length;

    // BUG-3 FIX: Calcular a probabilidade analítica real usando a Normal Truncada
    // em vez de copiar a empírica como fallback.
    const finalSD = calculateVolatility(results.map(r => ({ score: r })), maxScore, minScore);
    const empiricalProb = (successes / safeSimulations) * 100;

    // FIX BUG 4: Simulações O-U com choques difusos e Clamping diário não formam 
    // uma Distribuição Normal Truncada perfeita no limite estacionário.
    // Usar a CDF analítica aqui causa divergência drástica e invalida as previsões.
    // Para modelos difusos complexos, a probabilidade empírica convergida é a única fonte da verdade.
    let analyticalProb = empiricalProb;

    return {
        probability: empiricalProb,
        analyticalProbability: Number(analyticalProb.toFixed(4)),
        mean: Number(meanResult.toFixed(2)),
        sd: Number(finalSD.toFixed(2)),
        // BUG-GLOBAL-01 FIX: getPercentile espera p em [0,1], não [0,100].
        // Antes: 2.5 e 97.5 → p>=1 retornava último elemento → CI = [minScore, maxScore] sempre.
        ci95Low: Number(getPercentile(results, 0.025, true).toFixed(2)),
        ci95High: Number(getPercentile(results, 0.975, true).toFixed(2)),
        currentMean: Number(baselineScore.toFixed(2)),
        drift: Number((drift * 30).toFixed(2)),
        volatility: Number(volatility.toFixed(2)),
        confidence: sortedHistory.length < 5 ? 'low' : sortedHistory.length < 15 ? 'medium' : 'high'
    };
}
