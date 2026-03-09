import { mulberry32, randomNormal } from './src/engine/random.js';
for (let latentMean = 0; latentMean <= 20; latentMean += 2) {
    const safeSD = 20.5;
    const rng = mulberry32(12345);
    const allScores = [];
    for (let i = 0; i < 2000; i++) {
        allScores.push(Math.max(0, Math.min(100, latentMean + randomNormal(rng) * safeSD)));
    }
    allScores.sort((a, b) => a - b);
    const m = allScores.reduce((a, b) => a + b, 0) / 2000;
    const p975 = allScores[Math.floor(2000 * 0.975)];
    console.log(`Latent: ${latentMean} -> EmpMean: ${m.toFixed(1)} P97.5: ${p975.toFixed(1)}`);
}
