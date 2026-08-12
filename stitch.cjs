const fs = require('fs');
const part1 = fs.readFileSync('d:/Downloads/ultra-patched/src/pages/Coach.jsx', 'utf8');
const part2Raw = fs.readFileSync('d:/Downloads/ultra-patched/second_part.txt', 'utf8');

const splitMarker = '// BUG-12 FIX: Reseta seriesCategory quando a lista de categorias muda';
const part1Trimmed = part1.split(splitMarker)[0];

const part2Lines = part2Raw.split('\n');
const startIndex = part2Lines.findIndex(line => line.includes(splitMarker));
let endIndex = part2Lines.findIndex(line => line.includes('✅ **Check pós-aplicação'));
if(endIndex === -1) endIndex = part2Lines.length;

const part2Clean = part2Lines.slice(startIndex, endIndex).join('\n').replace(/`(javascript|jsx)?\s*/g, '').trim();

fs.writeFileSync('d:/Downloads/ultra-patched/src/pages/Coach.jsx', part1Trimmed + splitMarker + '\n' + part2Clean + '\n');
console.log('Stitched successfully!');
