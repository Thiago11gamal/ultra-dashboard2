import { analyzeProgressState } from './src/utils/ProgressStateEngine.js';

console.log('🔍 Executing ProgressStateEngine Fairness Checks...');

let errors = 0;

// Test 1: High Performer Mastery (stagnated but at the top)
const mast_score_series = [88, 87, 89, 88, 88, 87, 88, 89, 89, 88];
const mast_result = analyzeProgressState(mast_score_series);
if (mast_result.state !== 'mastery') {
    console.error('❌ [FAIL] High Performer Mastery Test Failed. Got state: ' + mast_result.state);
    errors++;
} else {
    console.log('✅ [PASS] High Performer (Low variance, Mean > 85) correctly identified as Mastery');
}

// Test 2: Beginner Stagnant Negative
const low_score_series = [45, 46, 44, 45, 45, 46, 44, 45, 45, 46];
const low_result = analyzeProgressState(low_score_series);
if (low_result.state !== 'stagnation_negative') {
    console.error('❌ [FAIL] Beginner Stagnant Test Failed. Got state: ' + low_result.state);
    errors++;
} else {
    console.log('✅ [PASS] Beginner Stagnant (Low variance, Mean < 60) correctly identified as stagnation_negative');
}

// Test 3: Gentle Fluctuation (Deadzone Stability)
// A tiny drop that used to be marked as "regression"
const fluc_series = [75, 76, 75, 74, 75, 74, 75, 74, 74, 73]; // Dropping slightly but slope will be > -0.5
const fluc_result = analyzeProgressState(fluc_series);
if (fluc_result.state === 'regression' || fluc_result.state === 'progression') {
    console.error('❌ [FAIL] Fluctuation Tolerance Failed. Got state: ' + fluc_result.state);
    errors++;
} else {
    console.log('✅ [PASS] Gentle Fluctuation correctly classified as ' + fluc_result.state + ' (instead of harsh regression)');
}

// Test 4: True Regression (Steep drop)
const reg_series = [80, 80, 78, 75, 72, 70, 68, 65, 62, 60];
const reg_result = analyzeProgressState(reg_series);
if (reg_result.state !== 'regression') {
    console.error('❌ [FAIL] True Regression Failed. Got state: ' + reg_result.state);
    errors++;
} else {
    console.log('✅ [PASS] True Regression correctly identified');
}

if (errors === 0) {
    console.log('\\n✨ ALL FAIRNESS CHECKS PASSED.');
} else {
    console.log(`\\n⚠️ FOUND ${errors} ISSUES.`);
}
