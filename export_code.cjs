const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const outputFile = path.join(__dirname, 'codigo_completo.md');

let markdownContent = '# Código Fonte\n\n';

function walkDir(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            if (['node_modules', '.git', 'build', 'dist', '__tests__', 'assets', 'public'].includes(file)) continue;
            walkDir(fullPath);
        } else {
            const ext = path.extname(file);
            if (!['.js', '.jsx', '.ts', '.tsx', '.css', '.html', '.json'].includes(ext)) continue;
            if (file.includes('.test.') || file.includes('.spec.') || file.includes('.mock.')) continue;
            
            const content = fs.readFileSync(fullPath, 'utf8');
            const relativePath = path.relative(__dirname, fullPath).replace(/\\/g, '/');
            markdownContent += `## ${relativePath}\n\n`;
            markdownContent += '```' + (ext === '.js' || ext === '.jsx' ? 'javascript' : ext === '.ts' || ext === '.tsx' ? 'typescript' : ext.replace('.', '')) + '\n';
            markdownContent += content;
            markdownContent += '\n```\n\n';
        }
    }
}

walkDir(srcDir);
// Also include root level config files if needed, but let's stick to src and maybe important root files.
const rootFiles = ['package.json', 'vite.config.js', 'jsconfig.json', 'tailwind.config.js', 'postcss.config.js', 'eslint.config.js'];
for (const file of rootFiles) {
    const fullPath = path.join(__dirname, file);
    if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const ext = path.extname(file);
        markdownContent += `## ${file}\n\n`;
        markdownContent += '```' + (ext === '.js' ? 'javascript' : ext === '.json' ? 'json' : ext.replace('.', '')) + '\n';
        markdownContent += content;
        markdownContent += '\n```\n\n';
    }
}

fs.writeFileSync(outputFile, markdownContent);
console.log(`Exported code to ${outputFile}`);
