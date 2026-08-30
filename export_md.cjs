const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, 'src');
const outputPath = path.join(__dirname, 'codigo_completo.md');
const extensions = ['.js', '.jsx', '.css', '.html', '.json', '.md'];

let markdownContent = `# Código-Fonte do Projeto Ultra\nGerado em: ${new Date().toISOString()}\nEste arquivo contém todo o código fonte da pasta src.\n\n`;

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            if (extensions.includes(path.extname(file))) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk(srcPath);

for (const file of files) {
    const ext = path.extname(file);
    let lang = 'javascript';
    if (ext === '.css') lang = 'css';
    if (ext === '.html') lang = 'html';
    if (ext === '.json') lang = 'json';
    if (ext === '.jsx') lang = 'jsx';

    const relativePath = path.relative(__dirname, file).replace(/\\/g, '/');
    markdownContent += `## Arquivo: \`${relativePath}\`\n\`\`\`${lang}\n`;
    try {
        const content = fs.readFileSync(file, 'utf8');
        markdownContent += content;
    } catch (e) {
        markdownContent += `// Error reading file\n`;
    }
    markdownContent += `\n\`\`\`\n\n---\n\n`;
}

fs.writeFileSync(outputPath, markdownContent, 'utf8');
console.log('File exported successfully to ' + outputPath);
