import { simulateNormalDistribution } from '../src/engine/monteCarlo.js';
import { shrinkProbabilityToNeutral } from '../src/utils/calibration.js';

function computeCalibrationPenalty(mcHistory, globalHistory, maxScore) {
    if (!Array.isArray(mcHistory) || mcHistory.length === 0 || !Array.isArray(globalHistory) || globalHistory.length === 0) {
        return 0;
    }

    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const LAMBDA = Math.log(2) / (30 * MS_PER_DAY);
    const now = globalHistory[globalHistory.length - 1].dateMs;
    
    let brierWeightSum = 0;
    let brierSum = 0;
    let residualWeightSum = 0;
    let residualSum = 0;

    mcHistory.forEach(snapshot => {
        const snapTime = snapshot.dateMs;
        const actual = globalHistory.find(h => h.dateMs >= snapTime);
        if (!actual) return;
        
        const age = Math.max(0, now - snapTime);
        const weight = Math.exp(-LAMBDA * age);
        
        const meanPrediction = snapshot.mean || 0;
        const err = Math.abs(meanPrediction - actual.score) / maxScore;
        residualSum += err * weight;
        residualWeightSum += weight;

        const p = Math.max(0, Math.min(1, (snapshot.probability || 0) / 100));
        const observed = actual.score >= snapshot.target ? 1 : 0;
        brierSum += ((p - observed) ** 2) * weight;
        brierWeightSum += weight;
    });

    let calibrationPenalty = 0;
    if (brierWeightSum > 0 || residualWeightSum > 0) {
        const avgBrier = brierWeightSum > 0 ? brierSum / brierWeightSum : 0.18;
        const avgResidual = residualWeightSum > 0 ? residualSum / residualWeightSum : 0;
        
        const rawBrierPenalty = Math.max(0, avgBrier - 0.18);
        const combinedPenalty = (rawBrierPenalty * 0.7) + (avgResidual * 0.3);
        calibrationPenalty = Math.min(0.15, combinedPenalty);
    }
    
    return calibrationPenalty;
}

console.log("Iniciando Laboratório de Backtest Histórico...");
console.log("Simulando 180 dias de estudos para um aluno com alta volatilidade...\n");

// Generate data
const DAYS = 180;
const MAX_SCORE = 100;
const globalHistory = [];
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const START_DATE = Date.now() - DAYS * MS_PER_DAY;

for (let i = 0; i < DAYS; i++) {
    // Aluno ilusório: a capacidade real sobe devagar (50 -> 80), 
    // mas os simulados oscilam muito (SD = 10)
    const trueMean = 50 + (30 * (i / DAYS));
    
    // Box-Muller para ruído gaussiano
    let u = 0, v = 0;
    while(u === 0) u = Math.random();
    while(v === 0) v = Math.random();
    let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    
    const noise = num * 10;
    const actualScore = Math.max(0, Math.min(MAX_SCORE, trueMean + noise));
    
    globalHistory.push({
        day: i,
        dateMs: START_DATE + i * MS_PER_DAY,
        score: actualScore
    });
}

const mcHistoryA = []; 
const predictionsA = [];
const predictionsB = [];

// Começa a prever a partir do dia 30 (n=30 amostras)
for (let i = 30; i < DAYS - 7; i++) {
    const currentHistory = globalHistory.slice(0, i + 1);
    const scores = currentHistory.map(h => h.score);
    const mean = scores.reduce((a,b)=>a+b)/scores.length;
    const variance = scores.reduce((acc, val) => acc + (val - mean)**2, 0) / scores.length;
    const sd = Math.sqrt(variance);

    const target = 75;

    // Motor A: Puro
    const resultA = simulateNormalDistribution({
        mean: mean,
        sd: sd,
        targetScore: target,
        simulations: 2000,
        minScore: 0,
        maxScore: 100
    });
    
    const rawProb = resultA.probability;
    const rawMean = resultA.mean;

    mcHistoryA.push({
        dateMs: globalHistory[i].dateMs,
        probability: rawProb,
        mean: rawMean,
        target: target
    });

    // Motor B: Calibração em tempo real
    // Usa o histórico passado para calcular o viés
    const penalty = computeCalibrationPenalty(mcHistoryA.slice(0, -1), currentHistory, 100);
    const calibratedProb = shrinkProbabilityToNeutral(rawProb, penalty, 50, 0.5);

    // Verdade observada no futuro (7 dias depois)
    const futureScore = globalHistory[i + 7].score;
    const observed = futureScore >= target ? 1 : 0;

    predictionsA.push({ prob: rawProb / 100, observed, mean: rawMean, actual: futureScore });
    predictionsB.push({ prob: calibratedProb / 100, observed, mean: rawMean, actual: futureScore });
}

function computeECE(predictions, bins = 10) {
    const bucketSize = 1.0 / bins;
    const buckets = Array.from({length: bins}, () => ({ probSum: 0, obsSum: 0, count: 0 }));
    
    predictions.forEach(p => {
        let b = Math.floor(p.prob / bucketSize);
        if (b === bins) b = bins - 1;
        buckets[b].probSum += p.prob;
        buckets[b].obsSum += p.observed;
        buckets[b].count += 1;
    });

    let ece = 0;
    const n = predictions.length;
    buckets.forEach(b => {
        if (b.count > 0) {
            const meanProb = b.probSum / b.count;
            const meanObs = b.obsSum / b.count;
            ece += (b.count / n) * Math.abs(meanProb - meanObs);
        }
    });
    return ece;
}

function computeBrier(predictions) {
    return predictions.reduce((acc, p) => acc + (p.prob - p.observed)**2, 0) / predictions.length;
}

function computeOverconfidence(predictions) {
    let oc = 0;
    predictions.forEach(p => {
        if (p.prob > 0.5 && p.observed === 0) oc++;
    });
    return oc / predictions.length;
}

const eceA = computeECE(predictionsA);
const eceB = computeECE(predictionsB);
const brierA = computeBrier(predictionsA);
const brierB = computeBrier(predictionsB);
const ocA = computeOverconfidence(predictionsA);
const ocB = computeOverconfidence(predictionsB);

const table = {
    "Motor A (Raw)": {
        "ECE (Calibration Error)": eceA.toFixed(4),
        "Brier Score": brierA.toFixed(4),
        "Falsos Positivos (Overconfidence)": (ocA * 100).toFixed(1) + "%"
    },
    "Motor B (Calibrado)": {
        "ECE (Calibration Error)": eceB.toFixed(4),
        "Brier Score": brierB.toFixed(4),
        "Falsos Positivos (Overconfidence)": (ocB * 100).toFixed(1) + "%"
    }
};

console.table(table);

console.log("\n[VEREDICTO]");
if (eceB < eceA) {
    console.log("✅ HIPÓTESE CONFIRMADA! O Motor B tem ECE menor. Ele é mais 'honesto'.");
    const improve = ((eceA - eceB) / eceA * 100).toFixed(1);
    console.log(`Melhoria de confiabilidade estatística: ${improve}%`);
} else {
    console.log("❌ O Motor A foi melhor. É necessário ajustar os pesos de calibração.");
}
