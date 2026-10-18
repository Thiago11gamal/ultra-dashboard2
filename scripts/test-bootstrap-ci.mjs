import { bootstrapCI } from '../src/engine/math/bootstrap.js';

const x = [52, 55, 57, 58, 60, 61, 64, 66, 68, 70];
const mean = arr => arr.reduce((a,b)=>a+b,0)/arr.length;
const r = bootstrapCI(x, mean, { iterations: 1200, alpha: 0.05, seed: 7 });

const pass = Number.isFinite(r.estimate) && Number.isFinite(r.low) && Number.isFinite(r.high) && r.low <= r.estimate && r.estimate <= r.high;
console.table([{ name: 'bootstrap ci finite+ordered', pass, details: `${r.low.toFixed(2)}..${r.estimate.toFixed(2)}..${r.high.toFixed(2)}` }]);
if (!pass) process.exit(1);
console.log('Bootstrap CI checks passed.');
