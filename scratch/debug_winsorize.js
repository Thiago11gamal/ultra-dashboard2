import { winsorizeSeries } from './src/utils/adaptiveMath.js';

const trash = [NaN, NaN, NaN, 10];
const result = winsorizeSeries(trash);
console.log('Result:', result);
console.log('Same reference?', result === trash);
console.log('Null count:', trash.filter(v => !Number.isFinite(v)).length);
console.log('Length:', trash.length);
