import { getPercentile } from './src/engine/math/percentile.js';
import { sampleTruncatedNormal, truncatedNormalMean, normalCDF_complement, inverseNormalCDF, generateGaussian } from './src/engine/math/gaussian.js';
import { bootstrapCI } from './src/engine/math/bootstrap.js';
import { kahanSum, kahanMean } from './src/engine/math/kahan.js';
import { mulberry32 } from './src/engine/random.js';

console.log('=== Targeted Math Checks ===');

// 1. Percentile boundaries
const arr = new Float64Array([10,20,30,40,50]);
console.log('p<=0:', getPercentile(arr, 0, true)); // expect 10
console.log('p>=1:', getPercentile(arr, 1, true)); // expect 50
console.log('p=0.5:', getPercentile(arr, 0.5, true));

// 2. Truncated normal mean (analytic)
console.log('truncMean(50,10,0,100):', truncatedNormalMean(50,10,0,100).toFixed(4));
console.log('truncMean(2,0.1,0,100):', truncatedNormalMean(2,0.1,0,100).toFixed(4)); // near low bound

// 3. inverseNormalCDF accuracy
console.log('invCDF(0.5):', inverseNormalCDF(0.5));
console.log('invCDF(0.975) ~1.96:', inverseNormalCDF(0.975).toFixed(3));

// 4. Kahan precision
console.log('kahanSum large cancel:', kahanSum([1e9, 1, -1e9]).toFixed(10)); // should ~1

// 5. Bootstrap small n
const smallData = [48, 50, 52];
const b = bootstrapCI(smallData, xs => xs.reduce((s,v)=>s+v,0)/xs.length , {iterations: 500, seed: 123});
console.log('bootstrap n=3 estimate/low/high:', b.estimate.toFixed(2), b.low.toFixed(2), b.high.toFixed(2));

// 6. RNG determinism
const rng1 = mulberry32(42);
const r1 = rng1();
const rng2 = mulberry32(42);
const r2 = rng2();
console.log('mulberry32 same seed equal?', r1 === r2);

// 7. Normal CDF complement approx
console.log('normalCDF_comp(0) ~0.5:', (1 - normalCDF_complement(0)).toFixed(6));
console.log('normalCDF_comp(3) ~0.99865:', (1 - normalCDF_complement(3)).toFixed(5));

console.log('=== Checks complete ===');
