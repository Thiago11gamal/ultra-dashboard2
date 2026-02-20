import { analyzeProgressState } from './src/utils/ProgressStateEngine.js';
const low_score_series = [45, 46, 44, 45, 45, 46, 44, 45, 45, 46];
const low_result = analyzeProgressState(low_score_series);
console.log(low_result);
