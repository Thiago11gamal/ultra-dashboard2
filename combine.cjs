const fs = require('fs');
const path = require('path');

const exts = ['.js', '.jsx', '.ts', '.tsx', '.css'];
const excludeDirs = ['node_modules', 'dist', 'build', '.git', '.github', '__tests__', 'ultra-patched'];
const excludeFiles = [
  'combine.js',
  'package-lock.json',
  'eslint_evolution.json',
  'lint-results.json',
];

let out = '';
let fileCount = 0;

function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const f of files) {
        if (excludeDirs.includes(f)) continue;
        const p = path.join(dir, f);
        if (fs.statSync(p).isDirectory()) {
            walk(p);
        } else if (exts.includes(path.extname(f)) && !excludeFiles.includes(f)) {
            const relativePath = path.relative('.', p).replace(/\\/g, '/');
            out += `${'='.repeat(80)}\n`;
            out += `FILE: ${relativePath}\n`;
            out += `${'='.repeat(80)}\n\n`;
            out += fs.readFileSync(p, 'utf8') + '\n\n';
            fileCount++;
        }
    }
}

walk('.');
fs.writeFileSync('codigo_completo.txt', out);
console.log(`Pronto! ${fileCount} arquivos combinados em codigo_completo.txt`);
