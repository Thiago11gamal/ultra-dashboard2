import { runMonteCarloAnalysis } from '../src/engine/monteCarlo.js';

console.log("==========================================");
console.log("🧪 LABORATÓRIO DE REPRODUTIBILIDADE CIENTÍFICA");
console.log("==========================================\n");

const history = [
    { score: 50, date: '2023-01-01' },
    { score: 60, date: '2023-01-15' },
    { score: 65, date: '2023-02-01' },
    { score: 70, date: '2023-02-15' }
];

const TARGET_SCORE = 85;
const SIMULATIONS = 5000;
const REFERENCE_DATE = new Date('2023-02-28T12:00:00Z').getTime();
const CATEGORY = "Direito Constitucional";

console.log("Cenário de Teste:");
console.log("- Histórico de 4 provas");
console.log("- Alvo: " + TARGET_SCORE);
console.log("- Data Congelada (Reference Date): 2023-02-28");
console.log("- Matéria: " + CATEGORY);
console.log("- Simulações por rodada: " + SIMULATIONS);

console.log("\nExecutando 1000 rodadas estressantes para verificar paridade absoluta...");

let firstResultHash = null;
let violations = 0;

for (let i = 0; i < 1000; i++) {
    // Simulando chamadas de Worker/Main diferentes ao clonar o payload
    const payload = JSON.parse(JSON.stringify(history));
    
    const result = runMonteCarloAnalysis({
        values: payload.map(h => h.score),
        dates: payload.map(h => h.date),
        targetScore: TARGET_SCORE,
        simulations: SIMULATIONS,
        categoryName: CATEGORY
    }, 10, TARGET_SCORE, {
        referenceDate: REFERENCE_DATE, // Garante decaimentos consistentes
        seed: 42 // Congela a sequência de números pseudoaleatórios
    });

    const hash = JSON.stringify({
        prob: result.probability,
        mean: result.mean,
        sd: result.sd,
        ciLow: result.ci95Low,
        ciHigh: result.ci95High
    });

    if (i === 0) {
        firstResultHash = hash;
    } else {
        if (hash !== firstResultHash) {
            violations++;
            console.error(`❌ VIOLAÇÃO DE PARIDADE na iteração ${i}!`);
            console.error(`Esperado: ${firstResultHash}`);
            console.error(`Recebido: ${hash}`);
            break;
        }
    }
}

if (violations === 0) {
    console.log(`\n✅ SUCESSO! 1000 simulações reproduziram EXATAMENTE a mesma assinatura atômica.`);
    console.log("Assinatura do Replay:", firstResultHash);
    console.log("O motor atingiu o grau 'STRICT DETERMINISM'.");
} else {
    console.log(`\n❌ FALHA! Vazamento de entropia detectado.`);
    process.exit(1);
}
