
import { calculateSlope, projectScore } from './src/engine/projection.js';
import { computePooledSD } from './src/engine/variance.js';

// Test 1: Single data point (Slope should be 0)
const history1 = [{ date: '2023-01-01', score: 70 }];
const slope1 = calculateSlope(history1);
console.log('Test 1 (1 point): Slope =', slope1);

// Test 2: Two points, same day (Slope should be 0 due to denom=0)
const history2 = [{ date: '2023-01-01', score: 70 }, { date: '2023-01-01', score: 80 }];
const slope2 = calculateSlope(history2);
console.log('Test 2 (Same day): Slope =', slope2);

// Test 3: Two points, different days (Slope should be valid)
const history3 = [{ date: '2023-01-01', score: 70 }, { date: '2023-01-02', score: 72 }];
const slope3 = calculateSlope(history3);
console.log('Test 3 (Diff days): Slope =', slope3);

// Test 4: Projection with Slope 0 (Future == Today)
const currentMean = 75;
const projected = projectScore(currentMean, 0, 30);
console.log('Test 4 (Slope 0): Current =', currentMean, 'Projected (30d) =', projected);

// Test 5: SD Change with Time
const baseSD = 5;
const sdToday = computePooledSD([{ sd: baseSD, weight: 100 }], 100, 0);
const sdFuture = computePooledSD([{ sd: baseSD, weight: 100 }], 100, 30);
console.log('Test 5 (SD): Today (0d) =', sdToday.toFixed(3), 'Future (30d) =', sdFuture.toFixed(3));

// Test 6: String Handling in History
const historyString = [{ date: '2023-01-01', score: "70" }, { date: '2023-01-02', score: "80" }];
const slopeString = calculateSlope(historyString);
console.log('Test 6 (Strings): Slope =', slopeString); // Should be numeric 10 * confidence

// Test 7: Empty History (Should not crash)
const slopeEmpty = calculateSlope([]);
console.log('Test 7 (Empty): Slope =', slopeEmpty);
