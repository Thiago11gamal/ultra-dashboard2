import { computeBayesianLevel } from '../src/engine/stats.js';
import { monteCarloSimulation } from '../src/engine/projection.js';
import { getSuggestedFocus, calculateUrgency } from '../src/utils/coachLogic.js';

const checks = [];
const add = (name, pass, details='') => checks.push({ name, pass, details });

const categories = [
  { id: 'c1', name: 'Direito Constitucional', weight: 8, tasks: [{ id: 't1', completed: false, priority: 'high' }, { id: 't2', completed: true, priority: 'medium' }] },
  { id: 'c2', name: 'Direito Administrativo', weight: 5, tasks: [{ id: 't3', completed: false, priority: 'medium' }] }
];

const simulados = [
  { subject: 'Direito Constitucional', score: 62, total: 100, correct: 62, date: '2026-04-01' },
  { subject: 'Direito Constitucional', score: 68, total: 100, correct: 68, date: '2026-04-11' },
  { subject: 'Direito Constitucional', score: 71, total: 100, correct: 71, date: '2026-04-21' },
  { subject: 'Direito Administrativo', score: 75, total: 100, correct: 75, date: '2026-04-22' }
];

const studyLogs = [
  { categoryId: 'c1', minutes: 120, date: '2026-05-01' },
  { categoryId: 'c1', minutes: 60, date: '2026-05-02' },
  { categoryId: 'c2', minutes: 30, date: '2026-05-02' }
];

// 1) Bayesian + MC output bounds
const bayes = computeBayesianLevel(simulados, 1, 1, 100);
add('bayes output finite/ordered', Number.isFinite(bayes.mean) && bayes.ciLow <= bayes.ciHigh, `${bayes.ciLow}..${bayes.mean}..${bayes.ciHigh}`);

const mc = monteCarloSimulation(simulados.map(s => ({ score: s.score, date: s.date })), 60, { targetScore: 75, simulations: 300, maxScore: 100 });
add('mc output bounded', Number.isFinite(mc.probability) && mc.probability >= 0 && mc.probability <= 100, mc.probability);

// 2) Coach urgency integration uses bridge signals + explainability
const urgency = calculateUrgency(categories[0], simulados, studyLogs, { maxScore: 100, allCategories: categories });
add('urgency normalized in [0,100]', Number.isFinite(urgency.normalizedScore) && urgency.normalizedScore >= 0 && urgency.normalizedScore <= 100, urgency.normalizedScore);
add('urgency exposes bridge fields', typeof urgency?.details?.completionRate === 'number' && typeof urgency?.details?.efficiencyBridgeBoost === 'number' && typeof urgency?.details?.balanceBridgeBoost === 'number', JSON.stringify({completionRate: urgency?.details?.completionRate, e: urgency?.details?.efficiencyBridgeBoost, b: urgency?.details?.balanceBridgeBoost}));

// 3) Suggested focus end-to-end
const suggested = getSuggestedFocus(categories, simulados, studyLogs, { maxScore: 100, user: { goalDate: '2026-08-01' } });
add('suggested focus returns category', !!suggested?.id && !!suggested?.urgency, suggested?.name || 'none');

console.table(checks);
if (checks.some(c => !c.pass)) process.exit(1);
console.log('\nMath integration checks passed.');
