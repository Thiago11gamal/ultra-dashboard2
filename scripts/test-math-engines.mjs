import { simulateNormalDistribution } from '../src/engine/monteCarlo.js';
import { monteCarloSimulation, calculateVolatility, projectScore, calculateSlope } from '../src/engine/projection.js';
import { normalCDF_complement } from '../src/engine/math/gaussian.js';

const checks = [];

function addCheck(name, pass, details) {
  checks.push({ name, pass, details });
}

const cdf0 = normalCDF_complement(0);
addCheck('gaussian.normalCDF_complement(0) ~= 0.5', Math.abs(cdf0 - 0.5) < 5e-4, cdf0);

const deterministic = simulateNormalDistribution({
  mean: 70,
  sd: 0,
  targetScore: 150,
  minScore: 0,
  maxScore: 100,
  simulations: 300
});
addCheck('monteCarlo deterministic clamp target', deterministic.probability === 0, deterministic.probability);

const history = [
  { score: 50, date: '2026-01-01' },
  { score: 55, date: '2026-01-15' },
  { score: 58, date: '2026-02-01' },
  { score: 62, date: '2026-02-20' },
  { score: 64, date: '2026-03-15' },
  { score: 66, date: '2026-04-01' }
];

const slope = calculateSlope(history, 100);
addCheck('projection.calculateSlope finite', Number.isFinite(slope), slope);

const volatility = calculateVolatility(history, 100, 0);
addCheck('projection.calculateVolatility finite+positive', Number.isFinite(volatility) && volatility > 0, volatility);

const projection = projectScore(history, 60, 0, 100);
addCheck('projection.projectScore bounded [0,100]', projection.projected >= 0 && projection.projected <= 100, projection.projected);

const mc = monteCarloSimulation(history, 70, 60, 800, { maxScore: 100, minScore: 0, seed: 42 });
addCheck('projection.monteCarloSimulation probability [0,100]', mc.probability >= 0 && mc.probability <= 100, mc.probability);
addCheck('projection.monteCarloSimulation ci ordered', mc.ci95Low <= mc.ci95High, `${mc.ci95Low}..${mc.ci95High}`);

const failures = checks.filter(c => !c.pass);
console.table(checks);

if (failures.length > 0) {
  console.error('\nMath engine checks failed:');
  for (const f of failures) {
    console.error(`- ${f.name}: ${f.details}`);
  }
  process.exit(1);
}

console.log('\nAll math engine checks passed.');
