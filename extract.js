const fs = require('fs');
const lines = fs.readFileSync('C:\\Users\\antun.BOOK-201QO8FPFE\\.gemini\\antigravity-ide\\brain\\19255546-a74b-47f2-bed3-f36e522c3d84\\.system_generated\\logs\\transcript.jsonl', 'utf8').split('\n');
let extracted = '';
for (const line of lines) {
    if (line.includes('Abaixo estão os códigos de correção completos')) {
        const obj = JSON.parse(line);
        if (obj.content) {
            extracted = obj.content;
            break;
        }
    }
}
fs.writeFileSync('extract.txt', extracted);
console.log('done');
