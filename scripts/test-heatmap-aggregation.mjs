import { aggregateHeatmap, getMondayKey } from '../src/utils/heatmapAggregation.js';

if (getMondayKey('2026-05-10') !== '2026-05-04') throw new Error('Monday key failed for Sunday');

const filtered = {
  dates: [
    { key: '2026-05-04', label: '04/05' },
    { key: '2026-05-05', label: '05/05' },
    { key: '2026-05-12', label: '12/05' },
  ],
  rows: [{ cat: { id: 'a' }, cells: [
    { total: 10, correct: 7, pct: 70 },
    { total: 10, correct: 9, pct: 90 },
    { total: 20, correct: 10, pct: 50 },
  ] }]
};

const weekly = aggregateHeatmap(filtered, 'weekly');
if (weekly.dates.length !== 2) throw new Error('Weekly bucket count failed');
if (Math.round(weekly.rows[0].cells[0].pct) !== 80) throw new Error('Weekly pct aggregation failed');

const monthly = aggregateHeatmap(filtered, 'monthly');
if (monthly.dates.length !== 1) throw new Error('Monthly bucket count failed');
if (monthly.rows[0].cells[0].total !== 40) throw new Error('Monthly total aggregation failed');

console.log('Heatmap aggregation checks passed');
