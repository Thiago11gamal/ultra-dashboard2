import { computeTopRegressions, computeTrendKpi } from '../src/utils/weeklyEvolutionInsights.js';

const chartData = [
  { displayDate: '01/01', a: 60, b: 55, delta_a: null, delta_b: null },
  { displayDate: '08/01', a: 62, b: 54, delta_a: 2, delta_b: -1 },
  { displayDate: '15/01', a: 59, b: 50, delta_a: -3, delta_b: -4 },
  { displayDate: '22/01', a: 58, b: 52, delta_a: -1, delta_b: 2 },
  { displayDate: '29/01', a: 57, b: 48, delta_a: -1, delta_b: -4 },
];
const keys = ['a', 'b'];
const activeKeys = { a: { name: 'A', color: '#fff' }, b: { name: 'B', color: '#fff' } };
const hiddenKeys = { a: false, b: false };

const regs = computeTopRegressions({ viewMode: 'variation', chartData, keys, activeKeys, hiddenKeys });
if (!regs.length || regs[0].key !== 'b') throw new Error('Top regressions ranking failed');

const trend = computeTrendKpi({ chartData, keys, hiddenKeys });
if (!trend || !Number.isFinite(trend.delta)) throw new Error('Trend KPI failed');

console.log('Weekly insights checks passed');
