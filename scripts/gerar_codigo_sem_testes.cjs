const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const outputFile = path.join(rootDir, 'projeto_codigo_completo.md');
const srcDir = path.join(rootDir, 'src');

const ignoreDirNames = new Set([
    'node_modules',
    '.git',
    '.github',
    'dist',
    'build',
    'public',
    '.vscode',
    '.gemini',
    'coverage',
    'playwright-report',
    'test-results',
    'tests',
    'e2e',
    '__tests__'
]);

const allowedExtensions = new Set(['.js', '.jsx', '.ts', '.tsx', '.css', '.html', '.json']);
const excludedFiles = new Set([
    'package-lock.json',
    'temp_prompt.md',
    'prompt_patches.md',
    'scratch_components.txt',
    'scratch_utils.txt',
    'extract.txt',
    'all_bugs.txt'
]);

function isTestFile(filename, fullPath) {
    if (fullPath.includes('__tests__') || fullPath.includes('/tests/') || fullPath.includes('\\tests\\')) return true;
    if (/\.(test|spec)\.[jt]sx?$/i.test(filename)) return true;
    if (/\.sanity\.test\.[jt]sx?$/i.test(filename)) return true;
    if (/\.regression\.test\.[jt]sx?$/i.test(filename)) return true;
    return false;
}

const collectedFiles = [];

function walkDir(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (!ignoreDirNames.has(entry.name)) {
                walkDir(fullPath);
            }
        } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (allowedExtensions.has(ext)) {
                if (isTestFile(entry.name, fullPath)) continue;
                if (excludedFiles.has(entry.name)) continue;

                const relativePath = path.relative(rootDir, fullPath).replace(/\\/g, '/');
                collectedFiles.push({
                    fullPath,
                    relativePath,
                    ext,
                    name: entry.name
                });
            }
        }
    }
}

// 1. Coleta pasta src
walkDir(srcDir);

// 2. Coleta arquivos essenciais da raiz (sem arquivos de teste/relatórios temporários)
const rootConfigFiles = [
    'package.json',
    'index.html',
    'vite.config.js',
    'eslint.config.js',
    'tsconfig.json',
    'firebase.json',
    'firestore.rules'
];

for (const file of rootConfigFiles) {
    const fullPath = path.join(rootDir, file);
    if (fs.existsSync(fullPath)) {
        collectedFiles.push({
            fullPath,
            relativePath: file,
            ext: path.extname(file).toLowerCase(),
            name: file
        });
    }
}

// 3. Ordenação inteligente
function getCategoryPriority(relPath) {
    if (!relPath.startsWith('src/')) return 0; // Configs raiz primeiro
    if (relPath === 'src/main.jsx' || relPath === 'src/App.jsx' || relPath === 'src/index.css') return 1;
    if (relPath.startsWith('src/store/')) return 2;
    if (relPath.startsWith('src/context/')) return 3;
    if (relPath.startsWith('src/pages/')) return 4;
    if (relPath.startsWith('src/components/')) return 5;
    if (relPath.startsWith('src/hooks/')) return 6;
    if (relPath.startsWith('src/engine/')) return 7;
    if (relPath.startsWith('src/utils/')) return 8;
    if (relPath.startsWith('src/services/')) return 9;
    if (relPath.startsWith('src/llm/')) return 10;
    return 11;
}

collectedFiles.sort((a, b) => {
    const prioA = getCategoryPriority(a.relativePath);
    const prioB = getCategoryPriority(b.relativePath);
    if (prioA !== prioB) return prioA - prioB;
    return a.relativePath.localeCompare(b.relativePath, 'pt-BR');
});

// 4. Montagem do Markdown
let md = `# Código Fonte Completo do Projeto (Sem Testes)\n\n`;
md += `> **Data de geração:** ${new Date().toISOString()}\n`;
md += `> **Total de arquivos:** ${collectedFiles.length}\n\n`;

md += `## Índice de Arquivos\n\n`;
for (let i = 0; i < collectedFiles.length; i++) {
    const f = collectedFiles[i];
    const anchor = f.relativePath.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    md += `${i + 1}. [${f.relativePath}](#${anchor})\n`;
}
md += `\n---\n\n`;

let totalLines = 0;

for (const f of collectedFiles) {
    const content = fs.readFileSync(f.fullPath, 'utf8');
    const lines = content.split('\n').length;
    totalLines += lines;

    let lang = f.ext.replace('.', '');
    if (lang === 'jsx') lang = 'jsx';
    if (lang === 'tsx') lang = 'tsx';
    if (lang === 'js') lang = 'javascript';
    if (lang === 'ts') lang = 'typescript';
    if (lang === 'json') lang = 'json';
    if (lang === 'css') lang = 'css';
    if (lang === 'html') lang = 'html';

    const anchor = f.relativePath.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    md += `<a id="${anchor}"></a>\n`;
    md += `## \`${f.relativePath}\`\n\n`;
    md += `\`\`\`${lang}\n${content.trimEnd()}\n\`\`\`\n\n---\n\n`;
}

fs.writeFileSync(outputFile, md, 'utf8');

// Também atualiza o codigo_completo.md se o usuário esperar esse nome
const secondaryOutput = path.join(rootDir, 'codigo_completo.md');
fs.writeFileSync(secondaryOutput, md, 'utf8');

console.log(`Sucesso: ${collectedFiles.length} arquivos exportados.`);
console.log(`Total de linhas: ${totalLines}`);
console.log(`Salvo em: ${outputFile} e ${secondaryOutput}`);
