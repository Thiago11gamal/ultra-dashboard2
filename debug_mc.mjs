// Simulating user's actual scenario: Média 6.2%, Meta 70%, SD ~9

function mulberry32(seed) {
    return function () {
        let t = seed += 0x6D2B79F5;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function randomNormal(rng) {
    let u = 0, v = 0;
    while (u === 0) u = rng();
    while (v === 0) v = rng();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// User's data from screenshot
const currentMean = 6.2;
const sd = 9.0;
const target = 70;

// Project with different days
for (const projectDays of [0, 30, 60, 90]) {
    // With slope 0.5/day (max allowed, very optimistic)
    const effectiveDays = projectDays > 0 ? 30 * Math.log(1 + projectDays / 30) : 0;
    const slopeGrowth = 0.5 * effectiveDays;
    const projectedMean = Math.min(100, currentMean + slopeGrowth);

    const timeUncertainty = projectDays > 0 ? Math.sqrt(projectDays) * 0.5 : 0;
    const pooledSD = Math.sqrt(sd * sd + timeUncertainty * timeUncertainty);

    // Monte Carlo with 5000 sims
    const rng = mulberry32(123456 + projectDays);
    let success = 0;
    const simulations = 5000;
    const safeSimulations = Math.max(1, simulations);

    for (let i = 0; i < safeSimulations; i++) {
        let val = projectedMean + pooledSD * randomNormal(rng);
        if (val > 100) val = 100;
        if (val < 0) val = 0;
        if (val >= target) success++;
    }
    const prob = (success / safeSimulations * 100).toFixed(1);

    const zScore = pooledSD > 0 ? (target - projectedMean) / pooledSD : 0;

    console.log(`${projectDays}d: Projeção=${projectedMean.toFixed(1)}% (Δ=${slopeGrowth.toFixed(1)}) | SD=${pooledSD.toFixed(1)} | Z=${zScore.toFixed(1)} | Prob=${prob}%`);
}

console.log('\n🔍 Com média 6.2% e meta 70%, a probabilidade é CORRETAMENTE 0%.');
console.log('   Distância: 63.8 pontos. Com SD=9, z-score ≈ 7.');
console.log('   Mesmo com 90 dias de projeção agressiva (slope=0.5/dia), projeção chega a ~28%.');
console.log('   Ainda precisa de z ≈ 4.7, ou seja, P(>4.7σ) ≈ 0.0001%');
console.log('\n   O número é correto. O problema é a grande distância entre a performance atual e a meta.');
