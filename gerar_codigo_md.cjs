const fs = require('fs');
const path = require('path');

const outputFile = path.join(__dirname, 'projeto_codigo_completo.md');
const srcDir = path.join(__dirname, 'src');

const ignoreDirs = ['node_modules', '.git', 'dist', 'build', 'public', '.vscode'];
const extensions = ['.js', '.jsx', '.ts', '.tsx', '.css', '.html', '.json'];

let mdContent = '# Código Completo do Projeto\n\n';

function walkDir(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            if (!ignoreDirs.includes(file)) {
                walkDir(filePath);
            }
        } else {
            const ext = path.extname(file);
            if (extensions.includes(ext)) {
                const relativePath = path.relative(__dirname, filePath).replace(/\\/g, '/');
                const content = fs.readFileSync(filePath, 'utf8');
                let lang = ext.slice(1);
                if (lang === 'jsx') lang = 'javascript';
                if (lang === 'tsx') lang = 'typescript';
                
                mdContent += `## ${relativePath}\n\n`;
                mdContent += `\`\`\`${lang}\n${content}\n\`\`\`\n\n`;
            }
        }
    }
}

// Ler a pasta src
walkDir(srcDir);

// Ler arquivos de configuração na raiz
const rootFiles = [
    'package.json', 
    'vite.config.js', 
    'eslint.config.js', 
    'index.html', 
    'playwright.config.js',
    'tsconfig.json',
    'firebase.json'
];

for (const file of rootFiles) {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const ext = path.extname(file);
        let lang = ext ? ext.slice(1) : 'json';
        if (lang === 'js') lang = 'javascript';
        if (lang === 'ts') lang = 'typescript';
        
        mdContent += `## ${file}\n\n`;
        mdContent += `\`\`\`${lang}\n${content}\n\`\`\`\n\n`;
    }
}

fs.writeFileSync(outputFile, mdContent);
console.log('Arquivo MD gerado com sucesso: ' + outputFile);
