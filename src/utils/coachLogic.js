// ==================== CONSTANTES ====================
import { calculateMSSD, calculateSlope } from '../engine/projection.js';
import { computeForgettingRisk } from '../engine/diagnostics.js';
import { getSafeScore, getSyntheticTotal, formatValue, formatPercent } from './scoreHelper.js';
import { safeDateParse as _safeDateParse } from './dateHelper.js';
import { normalize } from './normalization.js';
import { computeRollingCalibrationParams } from './calibration.js';
import { 
    deriveAdaptiveRiskThresholds, 
    computeContinuousMcBoost, 
    deriveBacktestWeights,
    deriveCoachAdaptiveParams,
    runCoachMonteCarlo,
    clearMcCache,
    simuladosToHistory
} from './coachAdaptive.js';
import { computeAdaptiveCoachWeight } from './adaptiveMath.js';
export { deriveAdaptiveRiskThresholds, computeContinuousMcBoost, deriveBacktestWeights, clearMcCache, runCoachMonteCarlo };


export const DEFAULT_CONFIG = {
    SCORE_MAX: 50,
    RECENCY_MAX: 30,
    INSTABILITY_MAX: 30,
    PRIORITY_BOOST: 30,
    EFFICIENCY_MAX: 15,
    SRS_BOOST: 20,
    BASE_HOURS_THRESHOLD: 5,

    // Monte Carlo
    MC_SIMULATIONS: 800,          // ← BUG-C2 FIX: era 5000 (conflitava com o comentário "MC leve")
    MC_MIN_DATA_POINTS: 3,
    MC_PROB_DANGER: 30,
    MC_PROB_SAFE: 90,
    MC_VOLATILITY_HIGH: 8,
    INSTABILITY_MSSD_DIVISOR: 10,
    MC_BACKTEST_HORIZON: 3,
    MC_BACKTEST_HORIZON_MAX: 6,
    MC_CALIBRATION_BRIER_BASELINE: 0.18,
    MC_CALIBRATION_MAX_PENALTY: 0.25,
    MC_CALIBRATION_NEUTRAL_PCT: 50,
    MC_CALIBRATION_MAX_APPLIED_PENALTY: 0.5,
    MC_ENABLE_ADAPTIVE_CALIBRATION: true,
    MC_CALIB_WINDOW_DAYS: 60,
    MC_CALIB_MIN_SAMPLES: 4,
    MC_CALIB_MAX_SAMPLES: 20,
    MC_ECE_BINS_MIN: 4,
    MC_ECE_BINS_MID: 6,
    MC_ECE_BINS_MAX: 8,
    MC_LOW_SAMPLE_THRESHOLD: 10,

    // ── A) Constantes do urgency boost nomeadas ──────────────────────────────
    // Antes: mcUrgencyBoost = 12 + 13 * (1 - p/MC_PROB_DANGER)
    //        → 12 = boost base na fronteira de perigo
    //        → 25 = boost máximo quando probabilidade é 0% (12+13)
    //        → -8 = recompensa passiva quando em modo cruzeiro (prob >= 90%)
    MC_BOOST_DANGER_BASE: 12,     // boost quando prob está exactly no limiar (30%)
    MC_BOOST_DANGER_RANGE: 13,    // faixa adicional conforme prob se aproxima de 0%
    MC_BOOST_MODERATE_BASE: 12,   // boost na transição danger→moderate
    MC_BOOST_SAFE_PENALTY: -8,    // redução de urgência quando prob >= 90% (modo cruzeiro)
    MC_MODERATE_MIDPOINT: 55,     // prob (%) que separa zona moderate-alta de moderate-baixa
};

function getDynamicTrendThreshold(currentScore, maxScore) {
    const currentPct = currentScore / maxScore;
    
    // Fator de amortecimento: se o aluno tirou 40%, damping = 0.6. Se tirou 95%, damping = 0.05.
    const damping = Math.max(0, 1 - currentPct);
    
    // Curva de exigência: Inicia agressiva (ex: 4~5% para novatos) e cai para um mínimo de 0.2% para veteranos.
    const baseRequirement = 0.05; 
    const dynamicPct = (baseRequirement * Math.pow(damping, 1.5)) + 0.002; 
    
    return dynamicPct * maxScore;
}

// ==================== FUNÇÕES AUXILIARES ====================

const normalizeDate = (dateInput) => {
    if (!dateInput) return new Date(0);
    try {
        const d = new Date(dateInput);
        if (isNaN(d.getTime())) return new Date(0);
        // 🎯 FIX: Isola a data UTC explicitamente para evitar drift de fuso horário
        return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    } catch {
        return new Date(0);
    }
};

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const getDaysDiff = (newer, older) => {
    const newerDate = normalizeDate(newer);
    const olderDate = normalizeDate(older);
    return Math.max(0, Math.floor((newerDate.getTime() - olderDate.getTime()) / MS_PER_DAY));
};

/**
 * Calcula o multiplicador de urgência baseado nos dias restantes para a prova.
 * Substituição da escada em degraus por uma curva Exponencial Contínua.
 */
export function getCrunchMultiplier(daysToExam, firstActivityDate = null) {
    if (daysToExam === null || daysToExam === undefined) return 1.0; 
    if (daysToExam < 0) return 1.0; 
    if (daysToExam === 0) return 2.0; 
    
    // CORREÇÃO: A urgência (Crunch) adapta-se ao tamanho da jornada do aluno.
    let timeDivisor = 21; // Padrão
    if (firstActivityDate && firstActivityDate.getTime() > 0) {
        const totalJourneyDays = Math.max(1, (normalizeDate(new Date()).getTime() - firstActivityDate.getTime()) / 86400000) + daysToExam;
        // Se a jornada é longa (ex: 300 dias), a rampa começa mais cedo.
        timeDivisor = Math.max(14, totalJourneyDays * 0.15); 
    }
    
    const urgency = 1.0 + Math.exp(-daysToExam / timeDivisor);
    return Number(Math.min(2.0, urgency).toFixed(4));
}

function _getSRSBoost(history, daysSince, maxScore, cfg, mssdVolatility = null, effectiveN = null) {
    // CORREÇÃO: Transmitir a recência real (dias desde a última interação teórica ou prática)
    const forgettingData = computeForgettingRisk(history, maxScore, daysSince, mssdVolatility, effectiveN);
    
    const retention = forgettingData.retentionPct;

    if (retention < 30) return { boost: cfg.SRS_BOOST * 2.0, label: "⚠️ Memória Crítica (Risco de Branco)" };
    if (retention < 55) return { boost: cfg.SRS_BOOST * 1.4, label: "🧠 Revisão Necessária (Curva de Esquecimento)" };
    if (retention < 75) return { boost: cfg.SRS_BOOST * 0.8, label: "🔄 Revisão de Reforço" };
    
    return { boost: 0, label: null };
}

/**
 * Média Bayesiana para Proficiência Real
 * Ancorada na média global do aluno para evitar penalização artificial de pequenas amostras.
 */
/**
 * Calcula a proficiência bayesiana de um tópico, tratando o Prior de forma adaptativa.
 * [AUDIT-FIX-01] Resolve o "Efeito Halo": Tópicos nunca estudados assumem 25% de ignorância,
 * impedindo que a média global do aluno oculte lacunas de base.
 */
export const computeBayesianProficiency = (acertos, total, mediaGlobal = 0.5, globalTotal = 0) => {
    const rawAcertos = Number(acertos) || 0;
    const rawTotal = Number(total) || 0;

    // Fator de suavização (K) adaptativo baseado na experiência global do aluno
    const K = Math.max(3, Math.min(15, Math.log10(globalTotal + 1) * 3));
    
    // Quando o aluno começa a estudar, aí sim a média global atua como âncora de segurança
    const smoothedAcertos = rawAcertos + (mediaGlobal * K);
    const smoothedTotal = rawTotal + K;
    
    return smoothedAcertos / smoothedTotal;
};

/**
 * Calcula uma volatilidade robusta para o Coach, combinando o desvio padrão empírico
 * com um piso de incerteza (Bayesian shrinkage) para evitar subestimar o risco em amostras pequenas.
 */
export function computeRobustVolatilityForCoach(history = [], maxScore = 100) {
    const n = history.length;
    const fallbackVol = 0.08 * maxScore; // Piso de incerteza (8%)
    if (n < 2) return fallbackVol;
    
    // CORREÇÃO MÁXIMA: Sanitizar vírgulas usando getSafeScore e remover provas nulas
    // (NaN) em vez de injetar Zeros absolutos que arruínam a variância empírica.
    const validScores = history
        .map(h => getSafeScore(h, maxScore))
        .filter(s => !Number.isNaN(s));
        
    const validN = validScores.length;
    if (validN < 2) return fallbackVol;

    const mean = validScores.reduce((a, b) => a + b, 0) / validN;
    const variance = validScores.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (validN - 1);
    const nPenalty = Math.max(1, 4 / validN); // Penaliza amostras muito pequenas
    const empiricalVol = Math.sqrt(Math.max(0, variance));
    
    // Combinação Bayesiana simples: 70% empírico, 30% prior (piso) escalado por N
    return (empiricalVol * 0.7) + (fallbackVol * 0.3 * nPenalty);
}

// Substitua a função atual getCoachPriorities:
export const getCoachPriorities = (topicsData) => {
    if (!Array.isArray(topicsData)) return [];
    
    // [CORREÇÃO] Função de sanitização robusta para lidar com strings e separadores vírgula (Bug 4.1 Fix)
    const sanitizeNum = (val) => {
        if (typeof val === 'string') return Number(val.replace(',', '.'));
        return Number(val);
    };
    
    const globalCorrect = topicsData.reduce((acc, t) => {
        const parsedAcertos = sanitizeNum(t.acertos);
        const parsedCorrect = sanitizeNum(t.correct);
        const c = Number.isFinite(parsedAcertos) ? parsedAcertos : (Number.isFinite(parsedCorrect) ? parsedCorrect : 0);
        return acc + c;
    }, 0);
    
    const globalTotal = topicsData.reduce((acc, t) => {
        const parsedTotal = sanitizeNum(t.total);
        const tot = Number.isFinite(parsedTotal) ? parsedTotal : 0;
        return acc + tot;
    }, 0);
    
    const mediaGlobal = globalTotal > 0 ? globalCorrect / globalTotal : 0.5;

    return topicsData.map(topic => {
        const parsedAcertos = sanitizeNum(topic.acertos);
        const parsedCorrect = sanitizeNum(topic.correct);
        const parsedTotal = sanitizeNum(topic.total);
        
        const c = Number.isFinite(parsedAcertos) ? parsedAcertos : (Number.isFinite(parsedCorrect) ? parsedCorrect : 0);
        const tot = Number.isFinite(parsedTotal) ? parsedTotal : 0;
        
        let realProficiency = computeBayesianProficiency(c, tot, mediaGlobal, globalTotal);
        
        // CORREÇÃO: Clamp matemático vital para evitar proficiências negativas ou superiores a 100%
        realProficiency = Math.max(0, Math.min(1, realProficiency));
        
        return {
            ...topic,
            realProficiency
        };
    })
    .sort((a, b) => {
        const valA = Number.isFinite(a.realProficiency) ? a.realProficiency : 1; // NaN vai pro final da fila de prioridade (sabe tudo)
        const valB = Number.isFinite(b.realProficiency) ? b.realProficiency : 1;
        return valA - valB;
    });
};


// ==================== FUNÇÃO PRINCIPAL ====================

export const calculateUrgency = (category, simulados = [], studyLogs = [], options = {}) => {
    const cfg = { ...DEFAULT_CONFIG, ...(options.config || {}) };
    const logger = options.logger;
    const safeCategory = category || {};
    const categoryId = safeCategory.id;
    const calibrationHistory = options.calibrationHistoryByCategory?.[categoryId] || [];
    const rollingCalibration = computeRollingCalibrationParams(calibrationHistory, {
        baseline: cfg.MC_CALIBRATION_BRIER_BASELINE,
        maxPenalty: cfg.MC_CALIBRATION_MAX_PENALTY,
        windowDays: cfg.MC_CALIB_WINDOW_DAYS,
        minSamples: cfg.MC_CALIB_MIN_SAMPLES,
        maxSamples: cfg.MC_CALIB_MAX_SAMPLES
    });


    const rawMaxScore = Number(options.maxScore ?? 100);
    const maxScore = Number.isFinite(rawMaxScore) && rawMaxScore > 0 ? rawMaxScore : 100;
    const rawMinScore = Number(options.minScore ?? 0);
    const minScore = Number.isFinite(rawMinScore) ? Math.min(rawMinScore, maxScore) : 0;
    const rawTargetScore = Number(options.targetScore ?? (maxScore * 0.8));
    const fallbackTarget = maxScore * 0.8;
    const unclampedTarget = Number.isFinite(rawTargetScore) ? rawTargetScore : fallbackTarget;
    const targetScore = Math.min(maxScore, Math.max(minScore, unclampedTarget));
    // CORREÇÃO: Proteger as intenções estratégicas do aluno contra separadores decimais locais
    let rawWeightVal = safeCategory.weight;
    if (typeof rawWeightVal === 'string') rawWeightVal = rawWeightVal.replace(',', '.');
    const parsedWeight = Number(rawWeightVal);
    
    const rawWeight = Number.isFinite(parsedWeight) && parsedWeight > 0 ? parsedWeight : 5;
    const boundedWeight = Math.min(10, Math.max(1, rawWeight));
    // MATH-WEIGHT-ASYMMETRY FIX: era rawWeight * 10, cujo teto (rawWeight=10 → weight=100 → deviation=0)
    // nunca produzia multiplier > 1.0 — nem a matéria mais importante recebia bônus de recência.
    // Com * 20: rawWeight=5 (médio) = ponto neutro (mult=1.0), rawWeight=10 = mult=1.5, rawWeight=1 = mult=0.6.
    const weight = boundedWeight * 20;
    const weightLabel = boundedWeight <= 3 ? '1 — Baixa' : boundedWeight <= 7 ? '2 — Média' : '3 — Alta';

    let daysToExam = null;
    if (options && options.user && options.user.goalDate) {
        try {
            const examDate = normalizeDate(options.user.goalDate);
            // FIX: Proteger contra datas inválidas na string
            if (examDate && !isNaN(examDate.getTime())) {
                const today = normalizeDate(new Date());
                daysToExam = Math.round((examDate.getTime() - today.getTime()) / MS_PER_DAY);
            }
        } catch {
            console.warn("[CoachLogic] Invalid goalDate:", options.user.goalDate);
        }
    }

    try {
        // 1. Weighted Average Score
        const catNormalized = normalize(safeCategory?.name || "Sem Nome");
        const relevantSimulados = (simulados || []).filter(s => s && normalize(s.subject || "") === catNormalized);
        // Preserva os timestamps brutos para garantir a ordem exata ao nível do segundo
        relevantSimulados.sort((a, b) => {
            const timeA = new Date(a.date || a.createdAt || 0).getTime();
            const timeB = new Date(b.date || b.createdAt || 0).getTime();
            return timeB - timeA;
        });

        // [CORREÇÃO] 1. Extrair a data raiz (firstActivityDate) ANTES da poda da matriz (Bug 1.1 Fix)
        const rootActivityDate = relevantSimulados.length > 0 
            ? normalizeDate(relevantSimulados[relevantSimulados.length - 1].date || relevantSimulados[relevantSimulados.length - 1].createdAt) 
            : normalizeDate(new Date());

        // 2. Aplicar Limite de Retenção Ativa (Poda de Avalanche)
        if (relevantSimulados.length > 50) {
            relevantSimulados.length = 50; 
        }

        const simuladosWithMaxScore = relevantSimulados;

        let averageScore = 0;
        if (relevantSimulados.length > 0) {
            const coachAdaptive = deriveCoachAdaptiveParams(simuladosToHistory(relevantSimulados, maxScore), maxScore, cfg);
            const today = normalizeDate(new Date());
            const K = coachAdaptive.decayK;
            const PESO_MIN = coachAdaptive.minWeight;
            const DELTA = coachAdaptive.scoreClampDelta;

            const calculateExponentialScore = (dataset) => {
                let weightedSum = 0;
                let totalWeight = 0;
                dataset.forEach(s => {
                    const sScore = getSafeScore(s, maxScore);
                    const simDate = normalizeDate(s.date || s.createdAt);
                    const days = getDaysDiff(today, simDate);
                    let timeWeight = Math.exp(-K * days);
                    if (timeWeight < PESO_MIN) timeWeight = PESO_MIN;
                    
                    const rawTotal = Math.max(1, Number(s.total) || getSyntheticTotal(maxScore));
                    const volumeWeight = Math.sqrt(Math.min(rawTotal, maxScore * 2));
                    const peso = timeWeight * volumeWeight;
                    
                    weightedSum += sScore * peso;
                    totalWeight += peso;
                });
                return totalWeight > 0 ? weightedSum / totalWeight : (maxScore / 2);
            };

            // CORREÇÃO LÓGICA: Removido 'normalizeDate(new Date())' para prevenir o 
            // "Bug da Meia-Noite" e ignorar lotes importados subitamente.
            // Consideramos "sessão anterior" qualquer nota gerada pelo menos 1 hora antes do teste mais recente.
            // CORREÇÃO LÓGICA: Não utilize normalizeDate aqui, pois zera as horas e quebra a precisão de 1h.
            // Usamos datas brutas (timestamps) para garantir a separação real das sessões.
            const mostRecentSimDate = relevantSimulados.length > 0 
                ? new Date(relevantSimulados[0].date || relevantSimulados[0].createdAt).getTime() 
                : Date.now();
            const SESSION_GAP_MS = 60 * 60 * 1000; // 1 Hora

            let pastSimulados = relevantSimulados.filter(s => {
                const sTime = new Date(s.date || s.createdAt).getTime();
                return sTime < (mostRecentSimDate - SESSION_GAP_MS);
            });
            
            // [FIX 6] Se o gap de 1h isolou tudo (ex: maratona importada),
            // garantimos que há um baseline recuando para o simulado anterior.
            if (pastSimulados.length === 0 && relevantSimulados.length > 1) {
                pastSimulados = relevantSimulados.slice(1);
            }
            
            const notaBruta = calculateExponentialScore(relevantSimulados);

            if (pastSimulados.length > 0) {
                const notaAnterior = calculateExponentialScore(pastSimulados);
                const diff = notaBruta - notaAnterior;
                let clampedDiff = diff;
                if (diff > DELTA) clampedDiff = DELTA;
                else if (diff < -DELTA) clampedDiff = -DELTA;
                
                // CORREÇÃO: Dissipação temporal do choque.
                // Se a última sessão já tem mais de 24 horas, o salto foi consolidado.
                const hoursSinceLastSim = (Date.now() - mostRecentSimDate) / (1000 * 60 * 60);
                if (hoursSinceLastSim < 24) {
                    averageScore = notaAnterior + clampedDiff;
                } else {
                    averageScore = notaBruta; // Assume a realidade matemática
                }
            } else {
                averageScore = notaBruta;
            }
        } else {
            // BUG-19 FIX: Fallback deve respeitar a escala da prova (50% do maxScore)
            averageScore = maxScore / 2;
        }

        // 2. Days Since Last Study
        let daysSinceLastStudy = 0;
        let recencyUnknown = true;
        let lastDate = normalizeDate(new Date(0));

        if (simuladosWithMaxScore.length > 0) {
            const simDate = normalizeDate(simuladosWithMaxScore[0].date || simuladosWithMaxScore[0].createdAt);
            if (simDate > lastDate) lastDate = simDate;
        }

        const categoryStudyLogs = (studyLogs || []).filter(log =>
            log?.categoryId === categoryId &&
            normalizeDate(log.date).getTime() > 0
        );
        // FIX LOGIC-03: Fricção de Carga. Apenas considerar que houve "estudo real" capaz 
        // de reiniciar a curva de recência se o utilizador estudou pelo menos 15 minutos.
        const MIN_MINUTES_VALID_STUDY = 15; 
        const validStudyLogs = categoryStudyLogs.filter(log => (Number(log.minutes) || 0) >= MIN_MINUTES_VALID_STUDY);

        // Usamos os logs válidos para atualizar a lastDate (para o cálculo de urgência)
        if (validStudyLogs.length > 0) {
            const sortedLogs = [...validStudyLogs].sort((a, b) => normalizeDate(b.date).getTime() - normalizeDate(a.date).getTime());
            const logDate = normalizeDate(sortedLogs[0].date);
            if (logDate > lastDate) lastDate = logDate;
        }

        if (lastDate.getTime() > 0) {
            const today = normalizeDate(new Date());
            daysSinceLastStudy = getDaysDiff(today, lastDate);
            recencyUnknown = false;
        }

        // 3. Trend (Garantir 10 mais recentes para cálculo de tendência)
        const trendHistory = [...simuladosWithMaxScore]
            .sort((a, b) => {
                const timeA = new Date(a.date || a.createdAt || 0).getTime();
                const timeB = new Date(b.date || b.createdAt || 0).getTime();
                return timeB - timeA;
            })
            .slice(0, 10)
            .map(s => ({
                score: getSafeScore(s, maxScore),
                date: s.date || s.createdAt
            })).reverse();
        const lastNScores = trendHistory.map(t => t.score);
        const backtestWeights = deriveBacktestWeights(lastNScores, maxScore);
        // CORREÇÃO (Fix Matemático Final - Invariância de Escala):

        // Garantir que a derivada (slope) e a variância (MSSD) operam no mesmo espaço vetorial 
        // absoluto (maxScore) que a média e os percentis.
        const rawTrend = calculateSlope(trendHistory, maxScore) * 30;
        const limiteSuperior = maxScore - averageScore;
        const limiteInferior = -averageScore;
        const trend = Math.max(limiteInferior, Math.min(limiteSuperior, rawTrend));

        // ─────────────────────────────────────────────────────────
        // MC-03: MSSD Volatility — BUG-MATH-01 FIX: usa calculateMSSD real
        // Não castiga crescimento legítimo (50→60→70).
        // ─────────────────────────────────────────────────────────
        const mcHistory = simuladosToHistory(simuladosWithMaxScore.slice(0, 10), maxScore);
        const mssdVolatility = mcHistory.length >= 3
            ? calculateMSSD(mcHistory, maxScore)
            : computeRobustVolatilityForCoach(mcHistory, maxScore);

        // ─────────────────────────────────────────────────────────
        // MC-04: Monte Carlo leve — probabilidade real de bater a meta
        // ─────────────────────────────────────────────────────────
        const mcAdaptive = {
            ...deriveCoachAdaptiveParams(mcHistory, maxScore, cfg),
            calibrationBaseline: rollingCalibration.baseline,
            calibrationMaxPenalty: rollingCalibration.maxPenalty
        };
        const adaptiveSimCount = lastNScores.length <= 5 ? Math.max(cfg.MC_SIMULATIONS, 1200) : cfg.MC_SIMULATIONS;

        // Lógica de Meta Proximal Dinâmica (ZDP)
        const DISTANCE_THRESHOLD = 0.15 * maxScore; // Se a meta está a mais de 15% de distância
        let effectiveMCTarget = targetScore;
        let effectiveMCDays = 90; 

        if (targetScore - averageScore > DISTANCE_THRESHOLD) {
            // O alvo passa a ser a média atual + 1 salto equivalente à volatilidade da pessoa + margem empírica (2%)
            effectiveMCTarget = averageScore + Math.max(mssdVolatility, maxScore * 0.05) + (maxScore * 0.02);
            // Garantia para nunca ultrapassar a meta final
            effectiveMCTarget = Math.min(effectiveMCTarget, targetScore); 
            
            if (daysToExam !== null && daysToExam !== undefined) {
                // Proporção correta: baseada na lacuna de score proximal vs total
                const totalGap = Math.max(1, targetScore - averageScore);
                const proximalGap = effectiveMCTarget - averageScore;
                const gapRatio = Math.min(1, Math.max(0, proximalGap / totalGap));
                effectiveMCDays = daysToExam > 0
                    ? Math.max(14, Math.floor(gapRatio * daysToExam))
                    : 0;  // prazo expirado → 0 dias
            } else {
                effectiveMCDays = 21; // fallback sem data
            }
        }

        // 🎯 ADAPT-NEUTRAL: O "Neutro" do aluno é a média global dele em todas as matérias combinadas.
        let globalBaselinePct = 50;
        const validCatNorms = new Set((options.allCategories || []).map(c => normalize(c.name || "")));
        
        // Filtramos os simulados apenas uma vez numa única passagem!
        const allSimsForBaseline = (simulados || []).filter(s => s && validCatNorms.has(normalize(s.subject || "")));
        if (allSimsForBaseline.length > 0) {
            // CORREÇÃO: Purgar resíduos NaN antes da redução transversal, caso contrário, 
            // 1 único simulado arruinado destrói o piso do Monte Carlo em todas as matérias.
            const validGlobalSims = allSimsForBaseline
                .map(s => getSafeScore(s, maxScore))
                .filter(s => !Number.isNaN(s));
                
            if (validGlobalSims.length > 0) {
                const totalPoints = validGlobalSims.reduce((acc, s) => acc + s, 0);
                globalBaselinePct = (totalPoints / (validGlobalSims.length * maxScore)) * 100;
            }
        }

        const effectiveCfg = { 
            ...cfg, 
            MC_SIMULATIONS: adaptiveSimCount,
            MC_CALIBRATION_NEUTRAL_PCT: globalBaselinePct 
        };

        // Passamos o 'effectiveMCTarget' como alvo do motor estocástico
        const mcResult = runCoachMonteCarlo(
            simuladosWithMaxScore, 
            effectiveMCTarget, // <-- Novo Alvo Dinâmico
            effectiveCfg, 
            categoryId, 
            maxScore, 
            mcAdaptive,
            effectiveMCDays
        );
        const mcProbability = mcResult ? mcResult.probability : null;
        const mcHasData = mcResult !== null;

        if (mcHasData && typeof options.onCalibrationMetric === 'function') {
            options.onCalibrationMetric({
                categoryId,
                categoryName: safeCategory?.name,
                avgBrier: Number((mcResult.avgBrier || 0).toFixed(4)),
                ece: Number((mcResult.ece || 0).toFixed(4)),
                reliability: Array.isArray(mcResult.reliability) ? mcResult.reliability : [],
                calibrationPenalty: Number((mcResult.calibrationPenalty || 0).toFixed(4)),
                probability: Number((mcResult.probability || 0).toFixed(2)),
                timestamp: Date.now()
            });
        }

        // --- COMPONENTS ---
        
        // 🎯 1. Diagnóstico do "Perfil de Dor" (Pain Profile) do aluno
        const forgetting = computeForgettingRisk(simuladosWithMaxScore, maxScore);
        const performanceDeficit = Math.max(0, targetScore - averageScore); // Falta de Conhecimento
        const memoryRisk = forgetting.risk === 'critical' ? 40 : (forgetting.risk === 'high' ? 20 : 5); // Risco de Esquecimento
        const volatilityRisk = mssdVolatility; // Instabilidade Estatística

        const totalPain = performanceDeficit + memoryRisk + volatilityRisk || 1; // Evita div/0

        // 🎯 2. Alocação Dinâmica de Pesos (O Total Base é sempre 110, mas a distribuição muda)
        const dynamicScoreMax = Math.max(20, (performanceDeficit / totalPain) * 110);
        const dynamicRecencyMax = Math.max(15, (memoryRisk / totalPain) * 110);
        const dynamicInstabilityMax = Math.max(10, (volatilityRisk / totalPain) * 110);

        // FIX: Aumentar a amplitude do multiplicador de importância (0.6x a 1.4x)
        const weightMultiplier = 1 + ((boundedWeight - 5) / 5) * 0.40; 
        
        // A. Performance Score (Unweighted raw component)
        const normalizedAvg = (averageScore / maxScore) * 100;
        const scoreComponent = Math.max(0, Math.min(dynamicScoreMax, (100 - normalizedAvg) * (dynamicScoreMax / 100)));

        // B. Recency (Unweighted raw component)
        const effectiveRiskDays = daysSinceLastStudy; 
        
        // Encontre a data do simulado ou estudo mais antigo (a raiz da jornada)
        const _firstActivityDate = (relevantSimulados.length > 0) 
            ? normalizeDate(relevantSimulados[relevantSimulados.length - 1].date || relevantSimulados[relevantSimulados.length - 1].createdAt) 
            : normalizeDate(new Date());

        const crunchMultiplier = getCrunchMultiplier(daysToExam, rootActivityDate);
        let recencyComponent = 0; // Calculado abaixo no bloco Efficiency Bridge

        // ─────────────────────────────────────────────────────────
        let instabilityComponent = mssdVolatility * (dynamicInstabilityMax / cfg.INSTABILITY_MSSD_DIVISOR) * (100 / maxScore);
        const trendThreshold = getDynamicTrendThreshold(averageScore, maxScore);

        if (trend > trendThreshold) {
            instabilityComponent *= 0.5;
        } else if (trend < -trendThreshold) {
            instabilityComponent *= 1.3;
        }
        instabilityComponent = Math.min(dynamicInstabilityMax, instabilityComponent * backtestWeights.instabilityWeight);


        // ─────────────────────────────────────────────────────────
        // MC-05: Probability Urgency Boost
        // ─────────────────────────────────────────────────────────
        let mcUrgencyBoost = 0;
        let mcRiskLabel = null;
        const adaptiveRisk = deriveAdaptiveRiskThresholds(lastNScores, mssdVolatility, cfg, maxScore);

        if (mcHasData && mcProbability !== null) {
            const continuous = computeContinuousMcBoost(
                mcProbability,
                adaptiveRisk.danger,
                adaptiveRisk.safe,
                mssdVolatility,
                maxScore,
                cfg
            );
            mcUrgencyBoost = continuous.boost;
            mcRiskLabel = continuous.riskLabel;
        }


        const hasData = relevantSimulados.length > 0 || categoryStudyLogs.length > 0;

        // D. Priority Boost
        const hasHighPriorityTasks = safeCategory.tasks?.some(t => !t.completed && t.priority === 'high') || false;
        const priorityBoost = hasHighPriorityTasks ? cfg.PRIORITY_BOOST : 0;

        // D2. Execution Efficiency Bridge (Meu Painel -> Coach/Monte Carlo)
        const allTasks = Array.isArray(safeCategory.tasks) ? safeCategory.tasks : [];
        const totalTasks = allTasks.length;
        const completedTasks = allTasks.filter(t => t?.completed).length;
        const completionRate = totalTasks > 0 ? completedTasks / totalTasks : 1.0; // 1.0 = Neutro (sem penalidade)
        const inefficiency = Math.max(0, 1 - completionRate);
        
        let empiricalTrust = 1.0;
        if (!hasData) {
            // Avalia o histórico global de disciplina do utilizador
            const globalSignal = computeAdaptiveCoachWeight(trendHistory); 
            // Garante um piso de 20% e um teto de 100% consoante a estabilidade real do aluno
            empiricalTrust = Math.max(0.2, globalSignal.confidenceWeight);
        }

        // [DEPOIS] Anulamos a ponte aditiva (que maquiava a dor):
        const efficiencyBridgeBoost = 0; 
        
        // Aplicamos a ineficiência como um agravante na "Recência" (quem não faz micro-tarefas esquece mais rápido)
        const inefficiencyPenaltyMultiplier = 1.0 + (inefficiency * 0.3 * empiricalTrust); 
        recencyComponent = (dynamicRecencyMax * 0.8) * (1 - Math.exp(-effectiveRiskDays / 7)) * crunchMultiplier * backtestWeights.recencyWeight * inefficiencyPenaltyMultiplier;

        // E. Burnout detection
        const totalMinutes = categoryStudyLogs.reduce((acc, log) => acc + (Number(log.minutes) || 0), 0);
        const totalHours = totalMinutes / 60;

        // 1. Descobrir a capacidade semanal base do aluno (ignorar semanas fantasma)
        const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
        
        // CORREÇÃO: Ordenar o array para garantir a busca correta pela data raiz
        const sortedLogsForBurnout = [...categoryStudyLogs].sort((a, b) => normalizeDate(a.date).getTime() - normalizeDate(b.date).getTime());
        
        // CORREÇÃO: Janela Rolante de 28 dias para capturar o ritmo real, ignorando fantasmas do passado
        const rollingWindowMs = 28 * MS_PER_DAY;
        const nowMs = Date.now();
        const recentBaselineLogs = sortedLogsForBurnout.filter(log => (nowMs - normalizeDate(log.date).getTime()) <= rollingWindowMs);
        
        const recentBaselineHours = recentBaselineLogs.reduce((acc, log) => acc + (Number(log.minutes) || 0), 0) / 60;
        
        // [CORREÇÃO] Calcular as semanas ativas reais do utilizador (máximo 4) em vez de dividir cegamente por 4 (Bug 1.1 Fix)
        // Evita subestimar o burnout de novos utilizadores que estão cá há apenas poucos dias.
        const firstLogTime = sortedLogsForBurnout.length > 0 
            ? new Date(sortedLogsForBurnout[0].date).getTime() 
            : nowMs;
        const daysSinceFirstLog = Math.max(1, (nowMs - firstLogTime) / MS_PER_DAY);
        const activeWeeks = Math.max(1, Math.min(4, daysSinceFirstLog / 7));
        
        const baselineHoursPerWeek = recentBaselineLogs.length > 0 ? (recentBaselineHours / activeWeeks) : 5.0;

        // 2. Definir o limiar dinâmico: Burnout acontece se ele exceder 1.8x o que está acostumado
        // [FIX 5] Elevar o piso para evitar falsos positivos alarmistas em volumes baixos
        const dynamicBurnoutThreshold = Math.max(15.0, baselineHoursPerWeek * 1.8);

        // E2. Balance Bridge (equilíbrio entre matérias do Meu Painel -> Coach)
        // CORREÇÃO: O peso do edital é soberano e independente de existirem tarefas criadas.
        const allCategoriesSafe = options.allCategories || [];
        const activeCount = allCategoriesSafe.length > 0 ? allCategoriesSafe.length : 1;
        const MS_PER_DAY_CONST = 24 * 60 * 60 * 1000;
        
        const currentLambda = mcAdaptive?.decayK || 0.03; 
        const dynamicWindowDays = Math.max(7, Math.min(90, Math.round((Math.LN2 / currentLambda) * 2)));

        const windowStart = normalizeDate(new Date()).getTime() - (dynamicWindowDays * MS_PER_DAY_CONST);
        const recentAllLogs = (studyLogs || []).filter(log => normalizeDate(log?.date).getTime() >= windowStart);
        const totalRecentMinutesAll = recentAllLogs.reduce((acc, log) => acc + (Number(log.minutes) || 0), 0);
        const totalRecentMinutesCat = recentAllLogs
            .filter(log => log?.categoryId === categoryId)
            .reduce((acc, log) => acc + (Number(log.minutes) || 0), 0);
        const observedShare = totalRecentMinutesAll > 0 ? totalRecentMinutesCat / totalRecentMinutesAll : (1 / activeCount);
        
        const totalSyllabusWeight = allCategoriesSafe.reduce((acc, c) => {
            // CORREÇÃO COMPLEMENTAR: Garantir que o peso total reflete o que o aluno
            // introduziu com precisão decimal em todas as parcelas do Edital
            let rawW = c.weight;
            if (typeof rawW === 'string') rawW = rawW.replace(',', '.');
            const parsedW = Number(rawW);
            const w = (c.weight !== undefined && Number.isFinite(parsedW) && parsedW > 0) ? parsedW : 5;
            return acc + w;
        }, 0);
        
        const idealShare = totalSyllabusWeight > 0 ? rawWeight / totalSyllabusWeight : (1 / activeCount);
        
        // OTIMIZAÇÃO: Tolerância de 5% para evitar micro-correções e multiplicador exponencial 
        // para não punir severamente matérias de peso muito baixo.
        const tolerancia = 0.05; 
        const underAllocation = Math.max(0, idealShare - observedShare - tolerancia);
        const balanceBridgeBoost = Math.min(cfg.EFFICIENCY_MAX, Math.pow(underAllocation * 10, 1.5));

        // F. SRS Boost com Integração de Volatilidade e Confiança Bayesiana
        let srsBoost = 0;
        let srsLabel = null;

        if (hasData && !recencyUnknown) {
            // A urgência de repetição (SRS) DEVE saturar. O aluno não desaprende ao infinito.
            // Em vez de exponencial puro e destrutivo, usamos o Complemento da Retenção.
            const CONSTANTE_ESQUECIMENTO = 0.03; 
            const retencao = Math.exp(-CONSTANTE_ESQUECIMENTO * daysSinceLastStudy);
            
            // O Desespero do Coach (Dor de SRS) é o oposto da Retenção.
            // A dor máxima NUNCA ultrapassará o teto configurado (cfg.SRS_BOOST)
            srsBoost = (1 - retencao) * cfg.SRS_BOOST;
            srsLabel = srsBoost > (cfg.SRS_BOOST * 0.7) ? "⚠️ Memória Crítica" : (srsBoost > (cfg.SRS_BOOST * 0.3) ? "🧠 Revisão Necessária" : "🔄 Revisão de Reforço");
        }

        // [CORREÇÃO] Fuga à Penalidade de Rotação (Bug da Fronteira da Meia-Noite - Bug 2.1 Fix)
        // Calcular as horas exatas desde a última atividade usando o tempo real para evitar resets arbitrários à meia-noite.
        let exactLastTime = 0;
        if (relevantSimulados.length > 0) exactLastTime = new Date(relevantSimulados[0].date || relevantSimulados[0].createdAt).getTime();
        if (validStudyLogs.length > 0) {
            const logTime = new Date(validStudyLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date).getTime();
            if (logTime > exactLastTime) exactLastTime = logTime;
        }

        const exactHoursSinceLast = exactLastTime > 0 ? (Date.now() - exactLastTime) / (1000 * 60 * 60) : 48;

        // G. Rotation Penalty (Dinâmico)
        let rotationPenalty = 0;
        
        // Aplica a penalidade rigorosamente se passaram menos de 24 horas reais
        if (exactHoursSinceLast < 24) {
            const fatigueRatio = Math.max(0, Math.min(1, averageScore / maxScore)); 
            const dynamicPenalty = Math.min(25, 15 * fatigueRatio * (1 + (mssdVolatility / maxScore)));
            
            rotationPenalty = dynamicPenalty;

        } else if (exactHoursSinceLast >= 24 && exactHoursSinceLast < 48 && !srsLabel) {
            rotationPenalty = mssdVolatility > (maxScore * 0.05) ? 8 : 2; 
        }
        if (srsBoost > 0) rotationPenalty *= 0.1;

        // --- RAW MAX ---
        // 1. Teto Fixo de Esforço (Baseado apenas nos riscos reais, sem inflação de peso)
        const RAW_MAX_ACTUAL = dynamicScoreMax
            + dynamicRecencyMax * 0.8 * crunchMultiplier * inefficiencyPenaltyMultiplier
            + dynamicInstabilityMax
            + (cfg.PRIORITY_BOOST + (cfg.SRS_BOOST * 2.0)) * crunchMultiplier
            + (cfg.MC_BOOST_DANGER_BASE + cfg.MC_BOOST_DANGER_RANGE)
            + cfg.EFFICIENCY_MAX;

        // 2. Cálculo do Raw Score
        const currentPriorityBoost = priorityBoost * crunchMultiplier;
        const currentSrsBoost = srsBoost * crunchMultiplier;
        const rawScore = (scoreComponent + recencyComponent + instabilityComponent + currentPriorityBoost + currentSrsBoost + mcUrgencyBoost + efficiencyBridgeBoost + balanceBridgeBoost) - rotationPenalty;

        // 3. APLICAÇÃO REAL DO PESO: O peso é um amplificador de DOR sobre o rawScore,
        // não uma mudança na escala do universo.
        const weightedRaw = rawScore * weightMultiplier; 

        // 4. Normalização
        let normalized;
        const CRITICAL_THRESHOLD = RAW_MAX_ACTUAL * 0.8; 
        
        if (weightedRaw <= 0) {
            normalized = 0;
        } else if (weightedRaw <= CRITICAL_THRESHOLD) {
            // Zona Normal: Escala linear até 80% do dashboard
            normalized = (weightedRaw / CRITICAL_THRESHOLD) * 80;
        } else {
            // Zona Crítica (80-100%): Compressão assintótica suave (evita empate técnico)
            const excess = weightedRaw - CRITICAL_THRESHOLD;
            const safeMaxActual = Math.max(1, RAW_MAX_ACTUAL);
            const excessNormalized = 20 * (1 - Math.exp(-excess / (safeMaxActual * 0.4)));
            normalized = 80 + excessNormalized;
        }



        // Sanitização rigorosa de Not-a-Number (NaN) antes da injeção na UI ou Sort
        normalized = Number.isFinite(normalized) ? Math.max(0, Math.min(100, Math.round(normalized))) : 0;

        // --- RECOMMENDATION ---
        let recommendation = "";
        const oneWeekAgo = normalizeDate(new Date()).getTime() - (7 * 24 * 60 * 60 * 1000);
        const recentLogs = categoryStudyLogs.filter(log => {
            const d = normalizeDate(log.date);
            return d && d.getTime() >= oneWeekAgo;
        });
        const recentHours = recentLogs.reduce((acc, log) => acc + (Number(log.minutes) || 0), 0) / 60;
        const recentStudyDays = new Set(recentLogs.map(log => normalizeDate(log.date).getTime())).size;
        
        const isHighVolume = recentHours > dynamicBurnoutThreshold;
        const isHighFrequency = recentStudyDays >= 5;
        // CORREÇÃO: Alunos acima de 95% do teto não podem ser dados como estagnados por não crescerem mais.
        // A matemática física impede-os de ultrapassar os 100%.
        const isEliteMaintenance = averageScore >= (maxScore * 0.95);
        const isStagnant = !isEliteMaintenance && trend <= trendThreshold;

        const burnoutMsg = isHighVolume && isStagnant 
            ? `Você estudou ${recentHours.toFixed(1)}h esta semana (seu normal é ~${baselineHoursPerWeek.toFixed(1)}h), mas a nota estagnou.` 
            : '';

        const isBurnoutRisk = (isHighVolume || (isHighFrequency && recentHours > 5.0)) && isStagnant && recentStudyDays >= 3;

        if (mcHasData && mcRiskLabel === 'critical') {
            const burnoutNote = isBurnoutRisk ? ` (⚠️ ${burnoutMsg || 'Sinais de estafa — mude o método.'})` : '';
            const targetInfo = effectiveMCTarget < targetScore ? ` (Meta ZDP: ${formatValue(effectiveMCTarget)})` : '';
            recommendation = `🎯 Projeção Crítica: ${Math.round(mcProbability)}% de chance. Risco Crítico.${targetInfo}${burnoutNote}`;
        } else if (isBurnoutRisk) {
            recommendation = `🛑 Risco de Estafa: ${burnoutMsg || 'Você estudou muito mas a nota não reagiu.'} Considere descansar.`;
        } else if (mcHasData && mcRiskLabel === 'safe') {
            recommendation = `🏆 Cruzeiro Seguro (${formatPercent(mcProbability)} nas projeções). Modo de manutenção ativado.`;
        } else if (srsBoost > 0) {
            recommendation = `${srsLabel} - Não pule essa revisão!`;
        } else if (mssdVolatility > cfg.MC_VOLATILITY_HIGH * (maxScore / 100) && trend > 0) {
            recommendation = "Desempenho Oscilante: Foque em preencher lacunas de base";
        } else if (trend < -trendThreshold) {
            recommendation = `Nota caindo (${formatValue(trend)} pts) - Atenção urgente`;
        } else if (averageScore < targetScore - (0.2 * maxScore)) {
            recommendation = `Nota Crítica: ${formatPercent((averageScore / maxScore) * 100)} (Meta ${formatPercent((targetScore / maxScore) * 100)})`;
        } else if (averageScore >= targetScore) {
            recommendation = "No caminho certo! Continue consolidando";
        } else {
            recommendation = "Pratique com regularidade";
        }

        const result = {
            score: weightedRaw,
            normalizedScore: normalized,
            recommendation,
            details: {
                averageScore: Number(averageScore.toFixed(2)),
                daysSinceLastStudy,
                standardDeviation: Number(mssdVolatility.toFixed(2)),
                mssdVolatility: Number(mssdVolatility.toFixed(2)),
                trend: Number(trend.toFixed(2)),
                totalHours: Number(totalHours.toFixed(2)),
                hasData,
                hasSimulados: relevantSimulados.length > 0,
                hasHighPriorityTasks,
                completionRate: Number((completionRate * 100).toFixed(1)),
                efficiencyBridgeBoost: Number(efficiencyBridgeBoost.toFixed(2)),
                balanceBridgeBoost: Number(balanceBridgeBoost.toFixed(2)),
                weight,
                srsLabel,
                isBurnoutRisk,
                crunchMultiplier: Number(crunchMultiplier.toFixed(2)),
                monteCarlo: mcHasData ? {
                    probability: Number(mcProbability.toFixed(2)),
                    probabilityRaw: mcProbability,
                    thresholds: {
                        danger: Number(adaptiveRisk.danger.toFixed(2)),
                        safe: Number(adaptiveRisk.safe.toFixed(2))
                    },
                    riskLabel: mcRiskLabel,
                    volatility: Number(mcResult.volatility.toFixed(2)),
                    meanProjected: Number(mcResult.mean.toFixed(2)),
                    effectiveMCTarget: Number(effectiveMCTarget.toFixed(2)),
                    effectiveMCDays: Number(effectiveMCDays),
                    ci95Low: Number(mcResult.ci95Low.toFixed(2)),
                    ci95High: Number(mcResult.ci95High.toFixed(2)),
                    urgencyBoost: Number(mcUrgencyBoost.toFixed(2)),
                    calibrationPenalty: Number((mcResult.calibrationPenalty || 0).toFixed(4)),
                    avgBrier: Number((mcResult.avgBrier || 0).toFixed(4)),
                    ece: Number((mcResult.ece || 0).toFixed(4)),
                    reliability: Array.isArray(mcResult.reliability) ? mcResult.reliability : [],
                    explainability: {
                        confidenceAdjusted: (mcResult.calibrationPenalty || 0) > 0,
                        confidenceAdjustmentPct: Number(((mcResult.calibrationPenalty || 0) * 100).toFixed(2)),
                        calibrationQuality: (mcResult.avgBrier || 0) <= cfg.MC_CALIBRATION_BRIER_BASELINE
                            ? 'good'
                            : (mcResult.avgBrier || 0) <= (cfg.MC_CALIBRATION_BRIER_BASELINE + 0.07) ? 'moderate' : 'low',
                        note: (mcResult.calibrationPenalty || 0) > 0
                            ? 'Probabilidade ajustada para reduzir overconfidence após backtest interno.'
                            : 'Sem ajuste de calibração significativo.'
                    }
                } : null,
                backtest: {
                    rankQuality: Number(backtestWeights.rankQuality.toFixed(4)),
                    uplift: Number(backtestWeights.uplift.toFixed(4)),
                    scoreWeight: Number(backtestWeights.scoreWeight.toFixed(3)),
                    recencyWeight: Number(backtestWeights.recencyWeight.toFixed(3)),
                    instabilityWeight: Number(backtestWeights.instabilityWeight.toFixed(3))
                },
                humanReadable: {
                    "Média": formatPercent((averageScore / maxScore) * 100),
                    "Recência": daysSinceLastStudy === 0 ? "Hoje" : `${daysSinceLastStudy} dias`,
                    "Tendência": trend > 0.5 ? `↑ +${formatValue(trend)}` : trend < -0.5 ? `↓ ${formatValue(trend)}` : "→ Estável",
                    "Instabilidade": `±${formatValue(mssdVolatility)} pts`,
                    "Probabilidade (MC)": mcHasData ? formatPercent(mcProbability) : "Dados insuf.",
                    "Peso da Matéria": weightLabel,
                    "Status": srsLabel || (normalized > 70 ? "🔥 Urgente" : normalized > 50 ? "⚡ Médio" : "✓ Estável")
                },
                components: {
                    scoreComponent: Number((scoreComponent * weightMultiplier).toFixed(2)),
                    recencyComponent: Number((recencyComponent * weightMultiplier).toFixed(2)),
                    instabilityComponent: Number((instabilityComponent * weightMultiplier).toFixed(2)),
                    priorityBoost: Number((priorityBoost * weightMultiplier).toFixed(2)),
                    srsBoost: Number((srsBoost * weightMultiplier).toFixed(2)),
                    rotationPenalty: Number((rotationPenalty * weightMultiplier).toFixed(2)),
                    mcUrgencyBoost: Number((mcUrgencyBoost * weightMultiplier).toFixed(2)),
                    efficiencyBridgeBoost: Number((efficiencyBridgeBoost * weightMultiplier).toFixed(2)),
                    balanceBridgeBoost: Number((balanceBridgeBoost * weightMultiplier).toFixed(2)),
                }
            }
        };

        if (typeof logger === 'function') {
            try { logger({ categoryId, name: safeCategory?.name, urgency: result }); } catch { /* ignore */ }
        }

        return result;
    } catch (err) {
        console.error("[CoachLogic] Critical error in calculateUrgency:", err);
        return {
            score: 0,
            normalizedScore: 0,
            recommendation: "Erro no cálculo: " + err.message,
            details: { hasData: false, daysSinceLastStudy: 0, error: err.message, stack: err.stack, humanReadable: { "Status": "Erro" } }
        };
    }
};

/**
 * Motor de Regressão Histórica para o Coach AI
 * Valida a consistência entre projeções passadas e resultados reais.
 */
export function analisarDesempenhoHistorico(historico) {
    if (!historico || historico.length === 0) {
        return {
            tendencia: 'neutra',
            confiabilidadeDosDados: 'insuficiente',
            projecaoRetencao: 0
        };
    }
    
    // Converte o formato do teste para o formato esperado pelo computeForgettingRisk
    const formattedHistory = historico.map((h, i) => {
        // CORREÇÃO FATAL: Impedir o RangeError sanitizando a string ou caindo para o índice (i)
        let rawDias = h.diasRevisao;
        if (typeof rawDias === 'string') rawDias = rawDias.replace(',', '.');
        const diasValidos = Number.isFinite(Number(rawDias)) ? Number(rawDias) : i;
        
        const timestamp = Date.now() - (diasValidos * 86400000);
        const safeDate = Number.isFinite(timestamp) ? new Date(timestamp) : new Date();

        return {
            score: h.acertos,
            total: h.total || 100,
            date: safeDate.toISOString()
        };
    });

    const risk = computeForgettingRisk(formattedHistory);
    
    return {
        tendencia: risk.retentionPct > 80 ? 'alta' : (risk.retentionPct > 50 ? 'estável' : 'baixa'),
        confiabilidadeDosDados: historico.length > 5 ? 'alta' : 'média',
        projecaoRetencao: risk.retentionPct
    };
}

export const getSuggestedFocus = (categories, simulados, studyLogs = [], options = {}) => {
    if (!categories || categories.length === 0) return null;

    const ranked = categories.map(cat => ({
        ...cat,
        urgency: calculateUrgency(cat, simulados, studyLogs, { ...options, allCategories: categories })
    })).sort((a, b) => {
        const valA = Number.isFinite(a.urgency.normalizedScore) ? a.urgency.normalizedScore : -Infinity;
        const valB = Number.isFinite(b.urgency.normalizedScore) ? b.urgency.normalizedScore : -Infinity;
        return valB - valA;
    });

    const top = ranked[0];
    if (!top) return null;

    const maxScore = options.maxScore ?? 100;
    return {
        ...top,
        weakestTopic: getWeakestTopic(top, simulados, maxScore)
    };
};

const _topicsCache = new Map();


const MAX_CACHE_SIZE = 50; // Metade do tamanho anterior para manter memória baixa

function _buildSortedTopics(category, simulados = [], maxScore = 100) {
    const catId = category.id || category.name;
    const openTasks = (category.tasks || []).filter(t => !t.completed).length;
    
    // ✅ DEPOIS (Cache Isolado Estatisticamente)
    let lastSimTimestamp = 0;
    let historyVolume = 0; // Novo marcador de entropia
    if (simulados.length > 0) {
        const lastSim = simulados.reduce((latest, current) => {
            const latestTime = new Date(latest.date || latest.createdAt || 0).getTime();
            const currTime = new Date(current.date || current.createdAt || 0).getTime();
            return currTime > latestTime ? current : latest;
        }, simulados[0]);
        lastSimTimestamp = new Date(lastSim.date || lastSim.createdAt || 0).getTime();
        historyVolume = simulados.length;
    }

    // Adicione uma soma de controlo (checksum) das notas reais ao hash para invalidar o cache sempre que uma pontuação for alterada internamente.
    // CORREÇÃO: Utilizar o extrator resiliente (getSafeScore) para o Checksum, 
    // garantindo que a entropia numérica varia corretamente a cada edição do utilizador.
    const scoreChecksum = simulados.reduce((acc, s) => {
        const parsed = getSafeScore(s, maxScore);
        const validVal = Number.isNaN(parsed) ? 0 : parsed;
        return acc + validVal;
    }, 0);

    // Injeção do volume histórico atua como 'salt' criptográfico para o cache, 
    // garantindo que concursos distintos ou novos dados invalidem o estado corretamente.
    const hash = `${lastSimTimestamp}-${openTasks}-${maxScore}-${historyVolume}-${scoreChecksum.toFixed(1)}`; 
    const cacheKey = `isolate_${catId}_${hash}`;

    if (_topicsCache.has(cacheKey)) {
        // Renovar a posição na fila do Map (LRU)
        const result = _topicsCache.get(cacheKey);
        _topicsCache.delete(cacheKey);
        _topicsCache.set(cacheKey, result);
        return result;
    }

    // CORREÇÃO: Em vez de destruir 100 itens (Jank Rendering), remove apenas o mais antigo.
    if (_topicsCache.size >= MAX_CACHE_SIZE) {
        const oldestKey = _topicsCache.keys().next().value;
        _topicsCache.delete(oldestKey);
    }

    const result = _buildSortedTopicsImpl(category, simulados, maxScore);
    _topicsCache.set(cacheKey, result);
    return result;
}

const _buildSortedTopicsImpl = (category, simulados = [], maxScore = 100) => {
    const tasks = category.tasks || [];
    const topicMap = {};

    const catNorm = normalize(category.name);
    const relevantSimulados = simulados.filter(s => normalize(s.subject) === catNorm);
    const categorySimuladoCount = relevantSimulados.length;

    const history = (category.simuladoStats && category.simuladoStats.history) ? category.simuladoStats.history : [];

    const todayForTopics = new Date();

    // CORREÇÃO: Organizar o caos temporal antes de mapear os tópicos
    // CORREÇÃO: Aplicar blindagem temporal ao motor de ordenação (sort).
    // Impede o colapso estrutural da lista se uma data do servidor vier ilegível.
    const sortedTopicsHistory = [...history].sort((a, b) => {
        const timeA = new Date(a.date || a.createdAt || 0).getTime();
        const timeB = new Date(b.date || b.createdAt || 0).getTime();
        return (Number.isFinite(timeA) ? timeA : 0) - (Number.isFinite(timeB) ? timeB : 0);
    });

    sortedTopicsHistory.forEach(entry => {
        if (!entry) return;
        const entryDate = new Date(entry.date || entry.createdAt || 0);
        const entryTime = entryDate.getTime();
        
        // CORREÇÃO: Se a data não fizer sentido estatístico, assume-se tempo presente (0 dias)
        // para que a nota seja contabilizada de forma neutra em vez de ser aniquilada por NaNs.
        const safeEntryTime = Number.isFinite(entryTime) ? entryTime : todayForTopics.getTime();
        
        const daysOld = Math.max(0, (todayForTopics.getTime() - safeEntryTime) / (1000 * 60 * 60 * 24));
        const timeWeight = Math.max(0.01, Math.exp(-0.015 * daysOld));

        const topics = entry.topics || [];
        topics.forEach(t => {
            if (!t) return;
            let rawName = t.name;
            if (typeof rawName !== 'string' || !rawName) rawName = "Tópico Desconhecido";
            const name = rawName.trim();
            if (!topicMap[name]) {
                // CORREÇÃO: Se não há tarefas iniciais, assume-se "neutro", mas sinalizado sem tarefas
                topicMap[name] = { total: 0, correct: 0, lastSeen: new Date(0), completed: true, hasTasks: false, scores: [] };
                topicMap[name].hasUnfinishedTask = false;
            }
            let rawTotal = Number(t.total);
            let topicTotal = Number.isFinite(rawTotal) && rawTotal > 0 ? rawTotal : 0;
            let topicCorrect = 0;

            // 🎯 FIX: Aceitar total === 0 se houver score válido (heurística isTotalMissing expandida)
            const isTotalMissing = t.total === undefined || t.total === null || String(t.total).trim() === "" || Number(t.total) === 0;

            if (t.score != null && isTotalMissing) {
                // Cenário: Foi inserido apenas a percentagem sem volume
                topicTotal = getSyntheticTotal(maxScore);
                topicCorrect = (getSafeScore(t, maxScore) / maxScore) * topicTotal;
            } else if (topicTotal > 0) {
                // Cenário: Tem volume de questões
                if (t.correct !== undefined && t.correct !== null && !t.isPercentage) {
                // CORREÇÃO: Sanitização estrita contra separadores decimais legados
                // que causavam a aniquilação total da nota do subtópico.
                let rawC = t.correct;
                if (typeof rawC === 'string') rawC = rawC.replace(',', '.');
                topicCorrect = Math.min(topicTotal, Number.isFinite(Number(rawC)) ? Number(rawC) : 0);
                } else {
                    // Fallback seguro em caso de notas penalizadas ao nível do subtópico
                    topicCorrect = (getSafeScore(t, maxScore) / maxScore) * topicTotal;
                }
            } else {
                return; // Se o total for zero (e sem score percentual), sai da iteração para evitar Infinity/NaN
            }

            // Limpeza final de limites matemáticos
            topicCorrect = Math.max(0, topicCorrect);

            topicMap[name].total += (topicTotal * timeWeight);
            topicMap[name].correct += (topicCorrect * timeWeight);

            if (topicTotal > 0) {
                topicMap[name].scores.push({
                    score: (topicCorrect / topicTotal) * 100,
                    total: topicTotal,
                    date: entryDate.toISOString()
                });
            }
            if (entryDate > topicMap[name].lastSeen) {
                topicMap[name].lastSeen = entryDate;
            }
        });
    });

    tasks.forEach(task => {
        const name = String(task.text || task.title || "").trim();
        if (!name) return;

        if (!topicMap[name]) {
            topicMap[name] = { total: 0, correct: 0, lastSeen: new Date(0), completed: !!task.completed, hasTasks: true, scores: [] };
            topicMap[name].hasUnfinishedTask = !task.completed;
        } else {
            topicMap[name].hasTasks = true; // Confirma existência
            if (topicMap[name].hasUnfinishedTask === undefined) {
                topicMap[name].hasUnfinishedTask = !task.completed;
            } else if (!task.completed) {
                topicMap[name].hasUnfinishedTask = true;
            }
            topicMap[name].completed = !topicMap[name].hasUnfinishedTask;
        }

        let newTaskPriority = 0;
        if (task.priority === 'high') newTaskPriority = 40;
        else if (task.priority === 'medium') newTaskPriority = 20;

        if (!task.completed) {
            topicMap[name].manualPriority = Math.max(topicMap[name].manualPriority || 0, newTaskPriority);
        }

    });

    const today = new Date();
    const topics = Object.entries(topicMap).map(([name, data]) => {
        const percentage = data.total > 0 ? (data.correct / data.total) * 100 : 0;
        const topicHistory = data.scores.slice(-3);
        const trend = topicHistory.length >= 2 ? calculateSlope(topicHistory, 100) * 30 : 0;
        let daysSince = 0;
        if (data.lastSeen.getTime() === 0) {
            daysSince = 60;
        } else {
            daysSince = getDaysDiff(today, data.lastSeen);
        }
        const priorityBoost = data.manualPriority || 0;
        const perfComponent = Math.max(0, Math.min(1, (100 - percentage) / 100));
        const recencyComponent_topic = Math.max(0, Math.min(1, daysSince / 60));
        const priorityComponent = Math.max(0, Math.min(1, priorityBoost / 40));
        const perfRatio = percentage / 100;

        const TOPIC_W_PERF = 0.70 - (0.40 * perfRatio);
        const TOPIC_W_RECENCY = 0.10 + (0.40 * perfRatio);
        const TOPIC_W_PRIORITY = 0.20;

        let urgencyScore = (perfComponent * TOPIC_W_PERF + recencyComponent_topic * TOPIC_W_RECENCY + priorityComponent * TOPIC_W_PRIORITY) * 200;
        if (percentage === 0 && data.scores.length === 0 && categorySimuladoCount > 3) {
            urgencyScore *= 0.7;
        }
        const topicDropThreshold = -2.0; 
        if (trend < topicDropThreshold) {
            const dropSeverity = Math.min(2.0, 1 + Math.abs(trend / topicDropThreshold) * 0.1);
            urgencyScore *= dropSeverity;
        }
        return {
            name, total: data.total, percentage, daysSince,
            trend: Number(trend.toFixed(2)), priorityBoost, urgencyScore,
            isUntested: data.total === 0,
            manualPriority: data.manualPriority || 0,
            completed: data.completed,
            hasTasks: !!data.hasTasks
        };
    });

    topics.sort((a, b) => {
        // CORREÇÃO: Apenas damos prioridade absoluta (Boost) se houver uma tarefa por fazer
        const aNeedsAction = !a.completed && a.hasTasks;
        const bNeedsAction = !b.completed && b.hasTasks;
        
        if (aNeedsAction && !bNeedsAction) return -1;
        if (!aNeedsAction && bNeedsAction) return 1;
        
        return b.urgencyScore - a.urgencyScore;
    });

    return topics;
};

const getWeakestTopic = (category, simulados = [], maxScore = 100) => {
    return _buildSortedTopics(category, simulados, maxScore)[0] || null;
};

const getWeakestTopicsList = (category, simulados = [], maxScore = 100, limit = 3) => {
    return _buildSortedTopics(category, simulados, maxScore).slice(0, limit);
};


export const generateDailyGoals = (categories, simulados, studyLogs = [], options = {}) => {
    const targetScore = options.targetScore ?? 80;
    const maxScore = options.maxScore ?? 100;
    const cfg = { ...DEFAULT_CONFIG, ...(options.config || {}) };

    const ranked = categories.map(cat => ({
        ...cat,
        urgency: calculateUrgency(cat, simulados, studyLogs, { ...options, allCategories: categories })
    })).sort((a, b) => {
        const valA = Number.isFinite(a.urgency.normalizedScore) ? a.urgency.normalizedScore : -Infinity;
        const valB = Number.isFinite(b.urgency.normalizedScore) ? b.urgency.normalizedScore : -Infinity;
        return valB - valA;
    });

    const topCategories = ranked.slice(0, 10);

    // Adicione a averageScore como argumento na verificação profunda
    const performDeepCheck = (category, averageScore) => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const cutoffTime = thirtyDaysAgo.getTime();

        const recentLogs = studyLogs.filter(l => l.categoryId === category.id && new Date(l.date || 0).getTime() >= cutoffTime);
        const catNormalized = normalize(category.name);
        const recentSims = simulados.filter(s => normalize(s.subject) === catNormalized && new Date(s.date || s.createdAt || 0).getTime() >= cutoffTime);

        const totalHours = recentLogs.reduce((acc, l) => acc + (Number(l.minutes) || 0), 0) / 60;
        const totalQuestions = recentSims.reduce((acc, s) => acc + (Number(s.total) || getSyntheticTotal(maxScore)), 0);

        const questionsPerHour = totalHours >= 0.25 ? totalQuestions / totalHours : 0;
        const dynamicThreshold = totalHours >= 20 ? 30 : totalHours >= 10 ? 20 : 12;

        // CORREÇÃO: "Burn-in period". Ignorar alerta se o aluno está a começar a matéria (< 45%)
        const normalizedScore = averageScore !== undefined ? (averageScore / maxScore) * 100 : 100;
        const isFormingBase = normalizedScore < 45;

        if (totalHours > 5 && questionsPerHour < dynamicThreshold && !isFormingBase) {
            return {
                isTrap: true,
                msg: `⚠️ Alerta de Método: Estudou ${totalHours.toFixed(1)}h de ${category.name} mas resolveu poucas questões (${questionsPerHour.toFixed(1)}/h). O seu nível atual exige prática >${dynamicThreshold}/h.`
            };
        }
        return { isTrap: false };
    };


    let allGeneratedTasks = [];

    const tasksPerCategory = topCategories.length < 5 ? 3 : (topCategories.length < 8 ? 2 : 1);

    const safeUUID = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2, 15) + Date.now().toString(36);

    topCategories.forEach((cat) => {
        const weakTopics = getWeakestTopicsList(cat, simulados, maxScore, tasksPerCategory);
        const mc = cat.urgency?.details?.monteCarlo;

        const iterations = tasksPerCategory;

        // Flag para garantir que o alerta global seja emitido apenas uma vez por categoria
        let alertEmitted = false;
        let topicCursor = 0;

        for (let i = 0; i < iterations; i++) {
            const priorityLabel = allGeneratedTasks.length < 3 ? '[PROTOCOLO PRIORITÁRIO] ' : '';
            const adaptiveDanger = mc?.thresholds?.danger || cfg.MC_PROB_DANGER;
            const adaptiveSafe = mc?.thresholds?.safe || cfg.MC_PROB_SAFE;

            // 1. Alertas Críticos (Prioridade Máxima, não consomem tópicos)
            if (mc && mc.probabilityRaw < adaptiveDanger && !alertEmitted) {
                alertEmitted = true;
                const probPct = Math.round(mc.probabilityRaw);
                allGeneratedTasks.push({
                    id: `${cat.id}-mc-danger-${safeUUID}-${i}`,
                    text: `${cat.name}: ${priorityLabel}[ALERTA MESTRE] 🚨 VETOR CRÍTICO! Projeção matemática indica colapso de performance.`,
                    completed: false,
                    categoryId: cat.id,
                    analysis: {
                        reason: "Monte Carlo — Zona de Perigo",
                        details: `Apenas ${probPct}% de chance de bater a meta de ${targetScore}% em 90 dias.`,
                        metrics: cat.urgency.details.humanReadable,
                        monteCarlo: mc,
                        verdict: "Probabilidade crítica detectada. Mude de método imediatamente."
                    }
                });
                i--; continue; // Alerta emitido, passa para próxima iteração
            }

            if (mc && mc.volatility > cfg.MC_VOLATILITY_HIGH * (maxScore / 100) && mc.probabilityRaw < cfg.MC_PROB_SAFE && !alertEmitted) {
                alertEmitted = true;
                const probPct = Math.round(mc.probabilityRaw);
                allGeneratedTasks.push({
                    id: `${cat.id}-mc-chaos-${safeUUID}-${i}`,
                    text: `${cat.name}: ${priorityLabel}[ALERTA MESTRE] 🌪️ OSCILAÇÃO ESTATÍSTICA: Padrão imprevisível detectado.`,
                    completed: false,
                    categoryId: cat.id,
                    analysis: {
                        reason: "Monte Carlo — Caos Estatístico",
                        details: `Volatilidade MSSD: ${mc.volatility.toFixed(2)}. Probabilidade: ${probPct}%.`,
                        metrics: cat.urgency.details.humanReadable,
                        monteCarlo: mc,
                        verdict: "Seu nível base é promissor, mas a inconsistência torna a aprovação imprevisível."
                    }
                });
                i--; continue;
            }

            if (mc && mc.probabilityRaw >= adaptiveSafe && !alertEmitted) {
                alertEmitted = true;
                const probPct = Math.round(mc.probabilityRaw);
                allGeneratedTasks.push({
                    id: `${cat.id}-mc-safe-${safeUUID}-${i}`,
                    text: `${cat.name}: ${priorityLabel}[STATUS] 🏆 CRUZEIRO SEGURO: Estabilidade operacional em ${probPct}%.`,
                    completed: false,
                    categoryId: cat.id,
                    analysis: {
                        reason: "Monte Carlo — Cruzeiro Seguro",
                        details: `${probPct}% de probabilidade de atingir a meta.`,
                        metrics: cat.urgency.details.humanReadable,
                        monteCarlo: mc,
                        verdict: "Mantenha o ritmo atual para proteger sua posição."
                    }
                });
                i--; continue;
            }

            if (cat.urgency?.details?.srsLabel && !alertEmitted) {
                alertEmitted = true;
                allGeneratedTasks.push({
                    id: `${cat.id}-srs-${safeUUID}-${i}`,
                    text: `${cat.name}: ${priorityLabel}[REVISÃO] 🧠 ${cat.urgency.details.srsLabel}.`,
                    completed: false,
                    categoryId: cat.id,
                    analysis: {
                        reason: "Revisão Espaçada (SRS) Ativada",
                        label: cat.urgency.details.srsLabel,
                        metrics: cat.urgency.details.humanReadable,
                        monteCarlo: mc,
                        verdict: "Intervalo de retenção atingido. Revisão crítica para memória de longo prazo."
                    }
                });
                i--; continue;
            }

            if (performDeepCheck(cat, cat.urgency?.details?.averageScore).isTrap && !alertEmitted) {
                alertEmitted = true;
                allGeneratedTasks.push({
                    id: `${cat.id}-trap-${safeUUID}-${i}`,
                    text: `${cat.name}: ${priorityLabel}[MÉTODO] ⚠️ ANOMALIA: Teoria excedente detectada.`,
                    completed: false,
                    categoryId: cat.id,
                    analysis: {
                        reason: "Detector de Pseudo-Estudo",
                        details: "Alta carga horária com baixíssimo volume de exercícios.",
                        metrics: cat.urgency.details.humanReadable,
                        monteCarlo: mc,
                        verdict: "Volume excessivo de teoria detectado. Troque leitura por questões agora."
                    }
                });
                i--; continue;
            }

            // 2. Consumo de Tópicos (Só acontece se não houver alerta pendente nesta iteração)
            const weakTopic = (topicCursor < weakTopics.length) ? weakTopics[topicCursor++] : null;
            const topicLabel = weakTopic ? `${priorityLabel}[${weakTopic.name}] ` : `${priorityLabel}[OTIMIZAÇÃO DE BASE] `;
            const uniqueIdSuffix = weakTopic ? (weakTopic.name.replace(/\s/g, '').substring(0, 10).replace(/[^a-zA-Z0-9]/g, '') + weakTopic.total) : `geral-${i}`;

            if (weakTopic) {
                let taskTitle = "";
                let reasonStr = "";
                if (weakTopic.isUntested) {
                    taskTitle = `🚨 (Novo). Comece agora!`;
                    reasonStr = "Tópico Novo / Não Testado";
                } else if (weakTopic.manualPriority > 0) {
                    taskTitle = `🚨 (Prioridade). Nota: ${Math.round(weakTopic.percentage)}%`;
                    reasonStr = "Alta Prioridade Manual";
                } else if (weakTopic.percentage < 70) {
                    taskTitle = `🚨 (${Math.round(weakTopic.percentage)}% de acerto). Revise agora!`;
                    reasonStr = "Baixa Performance";
                } else {
                    taskTitle = `⭐ (${Math.round(weakTopic.percentage)}% de acerto). Rumo à excelência!`;
                    reasonStr = "Aperfeiçoamento Contínuo";
                }
                allGeneratedTasks.push({
                    id: `${cat.id}-weaktopic-${uniqueIdSuffix}`,
                    text: `${cat.name}: ${topicLabel}${taskTitle}`,
                    completed: false,
                    categoryId: cat.id,
                    analysis: {
                        reason: `Tópico Selecionado: ${weakTopic.name}`,
                        details: reasonStr,
                        metrics: cat.urgency.details.humanReadable,
                        monteCarlo: mc,
                        categoryDetails: {
                            "Urgência Total": Math.round(cat.urgency.score),
                            ...cat.urgency.details.components
                        },
                        topicDetails: {
                            "Nota do Tópico": Math.round(weakTopic.percentage) + "%",
                            "Dias sem Ver": weakTopic.daysSince,
                            "Tendência": weakTopic.trend > 0 ? `↑ ${weakTopic.trend}` : `↓ ${weakTopic.trend}`,
                            "Bônus de Prioridade": weakTopic.priorityBoost,
                            "Urgência Calculada": Math.round(weakTopic.urgencyScore)
                        }
                    }
                });
            } else {
                // Fallback se não houver tópicos fracos ou se todos estiverem bons
                allGeneratedTasks.push({
                    id: `${cat.id}-general-review-${uniqueIdSuffix}-${safeUUID}-it${i}`,
                    text: `${cat.name}: ${topicLabel}Revisão Geral Complementar (Volume ${i + 1})`,
                    completed: false,
                    categoryId: cat.id,
                    analysis: {
                        reason: "Revisão Geral Complementar",
                        metrics: cat.urgency.details.humanReadable,
                        monteCarlo: mc,
                        categoryDetails: {
                            "Total Urgency": Math.round(cat.urgency.score),
                            ...cat.urgency.details.components
                        }
                    }
                });
            }
        }
    });

    return allGeneratedTasks.slice(0, 12);
};

export function getCognitiveState(stats) {
    if (!stats || typeof stats !== 'object') return 100;

    // FIX: Se não houver minutos na sessão atual, verificar o tempo desde o último estudo
    let focusMinutes = stats.consecutiveMinutes || 0;
    
    if (focusMinutes === 0 && stats.lastActivityTimestamp) {
        const minutesSinceLast = Math.max(0, (Date.now() - stats.lastActivityTimestamp) / 60000);
        // Se passou menos de 30 min, o utilizador ainda está "quente" da sessão anterior
        if (minutesSinceLast < 30) focusMinutes = stats.previousSessionMinutes || 0;
    }
    let hadBreaks = (stats.pomodorosCompleted || 0) > 0;

    if (focusMinutes === 0 && hadBreaks) {
        focusMinutes = stats.pomodorosCompleted * (stats.settings?.pomodoroWork || 25);
    }

    // CORREÇÃO: Forçar a validação matemática do nível do utilizador, assegurando um 
    // multiplicador saudável (fallback para 1) caso a BD entregue uma string ilegível.
    const rawLevel = stats.user?.level;
    const userLevel = Number.isFinite(Number(rawLevel)) ? Number(rawLevel) : 1;
    const levelMultiplier = 1 + (userLevel * 0.05);
    
    const decayModifier = hadBreaks ? 0.6 : 1.0;
    const dynamicDecay = (0.003 / levelMultiplier) * decayModifier;

    const fatigueScore = Math.max(0, Math.min(100, Math.round(100 * Math.exp(-dynamicDecay * focusMinutes))));
    return fatigueScore;
}

export function getBestTask(categories, excludeTaskId = null) {
    let bestTask = null;
    let highestScore = -Infinity;

    (categories || []).filter(Boolean).forEach(cat => {
        (cat.tasks || []).filter(Boolean).forEach(task => {
            if (task.completed || (excludeTaskId && (task.id || task.text) === excludeTaskId)) return;

            let score = 0;

            if (task.priority === 'high') score += 50;
            else if (task.priority === 'medium') score += 20;

            const studiedAt = task.lastStudiedAt || cat.lastStudiedAt;
            const parsedTime = new Date(studiedAt).getTime();
            
            if (studiedAt && !isNaN(parsedTime)) {
                const days = Math.max(0, (Date.now() - parsedTime) / (1000 * 60 * 60 * 24));
                const urgenciaPorEsquecimento = 40 * (1 - Math.exp(-0.05 * days));
                score += urgenciaPorEsquecimento;
            } else {
                // FIX BUG 5: Matéria inédita/não estudada é prioridade estrutural (falta de base).
                // 45 pontos garante que passe na frente de matérias velhas.
                score += 45; 
            }

            // Fator 3: Taxa de Erro (dentro de getBestTask)
            if (task.errorRate !== undefined && task.errorRate !== null) {
                const validErrorRate = Number.isFinite(Number(task.errorRate)) ? Number(task.errorRate) : 0;
                
                let normalizedErrorRate;
                normalizedErrorRate = Math.min(100, Math.max(0, validErrorRate)) / 100;
                
                score += normalizedErrorRate * 40; // 0-40 pts
            }

            if (score > highestScore) {
                highestScore = score;
                bestTask = { 
                    ...task, 
                    id: task.id || task.text, // Normalização de ID
                    catName: cat.name, 
                    catColor: cat.color, 
                    catIcon: cat.icon, 
                    catId: cat.id 
                };
            }
        });
    });

    return bestTask;
}

/**
 * Inteligência do Coach
 * Decide a cor e a mensagem baseada na matemática acima.
 */
export function getCoachInsight(activeSubject, stats) {
    if (!activeSubject) {
        return {
            type: 'info',
            title: 'STATUS: STANDBY',
            text: 'Aguardando inicialização do protocolo de foco. Selecione um vetor de estudo abaixo para ativar o rastreamento neural.',
            color: 'indigo',
            iconType: 'Brain'
        };
    }

    const fatigueScore = getCognitiveState(stats);

    // Ajusta a tolerância à fadiga baseada no fôlego histórico (level)
    const userResilience = stats?.user?.level || 1;
    // Quanto maior o level, mais baixo o score de fadiga precisa cair para acionar o alarme
    const dangerThreshold = Math.max(45, 75 - (userResilience * 2)); 
    const flowThreshold = Math.min(90, 80 + (userResilience * 0.5));

    if (fatigueScore < dangerThreshold) {
        return {
            type: 'danger',
            title: 'ALERTA: ESGOTAMENTO NEURAL',
            text: `Carga cognitiva em nível crítico (**${fatigueScore}%**). Taxa de retenção em declínio acentuado. Protocolo de resfriamento (pausa) recomendado.`,
            color: 'red',
            iconType: 'Alert'
        };
    }

    // LOGIC-FATIGUE-THRESHOLD FIX: antes, pomodorosCompleted >= 3 disparava "SINCRONIA TOTAL"
    // mesmo com fatigueScore=70 (logo acima do limiar de perigo), o que é contraditório.
    // Agora exige fatigueScore >= flowThreshold para indicar estado de alto desempenho.
    if (fatigueScore >= flowThreshold && stats?.pomodorosCompleted >= 3) {
        return {
            type: 'success',
            title: 'ESTADO: SINCRONIA TOTAL',
            text: `Sincronia neural otimizada! Estabilidade cognitiva blindada em **${fatigueScore}%**. Fluxo de dados em alta fidelidade detectado.`,
            color: 'emerald',
            iconType: 'Zap'
        };
    }

    // --- PATCH: Optional Chaining (stats?) para prevenir TypeError no arranque ---
    if (stats?.pomodorosCompleted >= 3) {
        return {
            type: 'info',
            title: 'SESSÃO: PROGRESSO ACUMULADO',
            text: `${stats.pomodorosCompleted} sessões concluídas. Disposição operacional em **${fatigueScore}%**. Considere uma pausa curta para consolidação.`,
            color: 'indigo',
            iconType: 'Brain'
        };
    }

    return {
        type: 'info',
        title: 'SESSÃO: OPERACIONAL',
        text: `Frequência de foco sintonizada. Disposição operacional calculada em **${fatigueScore}%**. Escaneando vetor: **${activeSubject.task || 'ação'}**.`,
        color: 'indigo',
        iconType: 'Brain'
    };
}
