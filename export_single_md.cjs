const fs = require('fs');
const path = require('path');

const projectDir = 'd:/Downloads/ultra-patched';
const outputFile = path.join(projectDir, 'codigo_completo.md');

const targetExtensions = ['.js', '.jsx', '.css', '.html', '.json'];
const excludeDirs = ['node_modules', 'dist', '.git', 'codigo_projeto_separado_md', 'public', 'assets', '.gemini'];
const excludeFiles = ['package-lock.json', 'export_single_md.js'];

let markdownContent = '# Código Completo do Projeto\n\n';

function walk(dir) {
    const list = fs.readdirSync(dir);
    for (const file of list) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat && stat.isDirectory()) {
            if (!excludeDirs.includes(file)) {
                walk(filePath);
            }
        } else {
            const ext = path.extname(file);
            if (targetExtensions.includes(ext) && !excludeFiles.includes(file)) {
                if (file.endsWith('.png') || file.endsWith('.svg') || file.endsWith('.ico')) continue;
                
                const relativePath = path.relative(projectDir, filePath).replace(/\\/g, '/');
                
                let lang = ext.replace('.', '');
                if (lang === 'jsx') lang = 'jsx';
                if (lang === 'js') lang = 'javascript';
                
                const content = fs.readFileSync(filePath, 'utf8');
                
                markdownContent += '## ' + relativePath + '\n\n';
                markdownContent += '```' + lang + '\n';
                markdownContent += content + '\n';
                markdownContent += '```\n\n';
            }
        }
    }
}

walk(projectDir);

fs.writeFileSync(outputFile, markdownContent, 'utf8');
console.log('Exportado para: ' + outputFile);
