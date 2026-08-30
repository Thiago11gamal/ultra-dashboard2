const fs = require('fs');
const path = require('path');
const inputPath = process.argv[2];
if (!inputPath) {
  console.error('Uso: node extract.js <caminho-do-arquivo>');
  process.exit(1);
}
const resolvedPath = path.resolve(inputPath);
if (!fs.existsSync(resolvedPath)) {
  console.error(`Arquivo não encontrado: ${resolvedPath}`);
  process.exit(1);
}
const lines = fs.readFileSync(resolvedPath, 'utf8').split('\n');

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
