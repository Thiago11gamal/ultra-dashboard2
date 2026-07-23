const fs = require('fs');
const path = require('path');

const rootDir = 'd:/Downloads/ultra-patched';
const srcDir = 'd:/Downloads/ultra-patched/src';
const outPath = 'd:/Downloads/ultra-patched/codigo_completo.txt';

function walk(currentDir) {
    let results = [];
    if (!fs.existsSync(currentDir)) return results;
    
    const list = fs.readdirSync(currentDir);
    list.forEach(file => {
        if (file === 'node_modules' || file === 'dist' || file === 'build') return;
        const filePath = path.join(currentDir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(filePath));
        } else {
            if (/\.(js|jsx|css|html|json)$/.test(filePath) && !filePath.includes('package-lock.json')) {
                results.push(filePath);
            }
        }
    });
    return results;
}

// Get files from src directory
let files = walk(srcDir);

// Add some important files from root
const rootFiles = ['package.json', 'index.html', 'vite.config.js', 'tailwind.config.js', 'postcss.config.js', 'eslint.config.js'];
for (const file of rootFiles) {
    const filePath = path.join(rootDir, file);
    if (fs.existsSync(filePath)) {
        files.push(filePath);
    }
}

const outStream = fs.createWriteStream(outPath);

for (const file of files) {
    const rel = path.relative(rootDir, file);
    outStream.write(`\n\n// =================================================================\n// File: ${rel}\n// =================================================================\n\n`);
    try {
        const content = fs.readFileSync(file, 'utf8');
        outStream.write(content);
    } catch (e) {}
}

outStream.end(() => {
    const stat = fs.statSync(outPath);
    console.log((stat.size / (1024 * 1024)).toFixed(2) + " MB");
});
