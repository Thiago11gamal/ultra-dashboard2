const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'src');
const destDir = path.join(rootDir, 'codigo_fonte_sem_testes');
const zipFile = path.join(rootDir, 'codigo_fonte_sem_testes.zip');
const mdOutputFile1 = path.join(rootDir, 'projeto_codigo_completo.md');
const mdOutputFile2 = path.join(rootDir, 'codigo_completo.md');

// Diretórios a ignorar completamente
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

// Arquivos temporários ou de teste na raiz / src a ignorar
const excludedFileNames = new Set([
    'package-lock.json',
    'temp_prompt.md',
    'prompt_patches.md',
    'scratch_components.txt',
    'scratch_utils.txt',
    'extract.txt',
    'all_bugs.txt',
    'test_audit_results.json',
    'playwright.config.js',
    'combine.cjs',
    'apply_fixes.cjs',
    'fix_bugs.cjs',
    'extract.js',
    'generate_md.ps1',
    'codigo_completo.md',
    'projeto_codigo_completo.md',
    'codigo_fonte_sem_testes.zip'
]);

// Padrões de teste a excluir terminantemente
function isTestFile(filename, fullPath) {
    const normalized = fullPath.replace(/\\/g, '/').toLowerCase();
    if (normalized.includes('/__tests__/') || normalized.includes('/tests/') || normalized.includes('/e2e/')) return true;
    if (/\.(test|spec)\.[jt]sx?$/i.test(filename)) return true;
    if (/\.sanity\.test\.[jt]sx?$/i.test(filename)) return true;
    if (/\.regression\.test\.[jt]sx?$/i.test(filename)) return true;
    if (filename.toLowerCase().endsWith('.test.js') || filename.toLowerCase().endsWith('.test.jsx')) return true;
    if (filename.toLowerCase().endsWith('.spec.js') || filename.toLowerCase().endsWith('.spec.jsx')) return true;
    return false;
}

// Extensões de código fonte suportadas para documentação MD
const codeExtensions = new Set(['.js', '.jsx', '.ts', '.tsx', '.css', '.html', '.json', '.svg', '.md']);

// 1. Coleta recursiva de arquivos de código fonte em src
const collectedSrcFiles = [];

function walkSrc(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (!ignoreDirNames.has(entry.name)) {
                walkSrc(fullPath);
            }
        } else if (entry.isFile()) {
            if (isTestFile(entry.name, fullPath)) continue;
            if (excludedFileNames.has(entry.name)) continue;

            const ext = path.extname(entry.name).toLowerCase();
            const relPath = path.relative(rootDir, fullPath).replace(/\\/g, '/');
            collectedSrcFiles.push({
                fullPath,
                relativePath: relPath,
                ext,
                name: entry.name,
                isBinary: ext === '.png' || ext === '.jpg' || ext === '.jpeg' || ext === '.ico' || ext === '.woff' || ext === '.woff2'
            });
        }
    }
}

walkSrc(srcDir);

// 2. Coleta arquivos essenciais da raiz do projeto
const rootConfigFiles = [
    'package.json',
    'index.html',
    'vite.config.js',
    'eslint.config.js',
    'tsconfig.json',
    'tsconfig.node.json',
    'firebase.json',
    'firestore.rules',
    'vercel.json',
    '.env.example',
    'README.md'
];

const collectedRootFiles = [];
for (const file of rootConfigFiles) {
    const fullPath = path.join(rootDir, file);
    if (fs.existsSync(fullPath)) {
        collectedRootFiles.push({
            fullPath,
            relativePath: file,
            ext: path.extname(file).toLowerCase(),
            name: file,
            isBinary: false
        });
    }
}

// Junta todos os arquivos de código fonte
const allCollectedFiles = [...collectedRootFiles, ...collectedSrcFiles];

// Ordenação lógica das seções
function getCategoryPriority(relPath) {
    if (!relPath.startsWith('src/')) return 0; // Configs raiz
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
    if (relPath.startsWith('src/assets/')) return 11;
    return 12;
}

allCollectedFiles.sort((a, b) => {
    const prioA = getCategoryPriority(a.relativePath);
    const prioB = getCategoryPriority(b.relativePath);
    if (prioA !== prioB) return prioA - prioB;
    return a.relativePath.localeCompare(b.relativePath, 'pt-BR');
});

console.log(`[1/4] Coletados ${allCollectedFiles.length} arquivos de código fonte legítimos (0 testes).`);

// 3. Criar a pasta física 'codigo_fonte_sem_testes'
console.log(`[2/4] Copiando arquivos para diretório limpo: ${destDir}...`);
if (fs.existsSync(destDir)) {
    fs.rmSync(destDir, { recursive: true, force: true });
}
fs.mkdirSync(destDir, { recursive: true });

for (const item of allCollectedFiles) {
    const targetPath = path.join(destDir, item.relativePath);
    const targetParent = path.dirname(targetPath);
    if (!fs.existsSync(targetParent)) {
        fs.mkdirSync(targetParent, { recursive: true });
    }
    fs.copyFileSync(item.fullPath, targetPath);
}

// Copiar também assets estáticos de public se existirem para completude
const publicDir = path.join(rootDir, 'public');
if (fs.existsSync(publicDir)) {
    const destPublic = path.join(destDir, 'public');
    fs.mkdirSync(destPublic, { recursive: true });
    function copyDirRecursive(src, dst) {
        for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
            const sp = path.join(src, ent.name);
            const dp = path.join(dst, ent.name);
            if (ent.isDirectory()) {
                fs.mkdirSync(dp, { recursive: true });
                copyDirRecursive(sp, dp);
            } else {
                fs.copyFileSync(sp, dp);
            }
        }
    }
    copyDirRecursive(publicDir, destPublic);
}

console.log(`   -> Copiado com sucesso para ${destDir}`);

// 4. Gerar o arquivo Markdown unificado
console.log(`[3/4] Gerando arquivos Markdown consolidados...`);
let md = `# Código Fonte Completo do Projeto (Sem Testes)\n\n`;
md += `> **Data de geração:** ${new Date().toISOString()}\n`;
md += `> **Total de arquivos:** ${allCollectedFiles.length}\n`;
md += `> **Ambiente:** React 19 + Vite + Tailwind/CSS + Zustand + Firebase\n\n`;

// Resumo por categoria
const categoryCounts = {};
for (const f of allCollectedFiles) {
    let cat = 'Outros';
    if (!f.relativePath.startsWith('src/')) cat = 'Configurações Raiz';
    else if (f.relativePath.startsWith('src/components/')) cat = 'Componentes';
    else if (f.relativePath.startsWith('src/pages/')) cat = 'Páginas';
    else if (f.relativePath.startsWith('src/store/')) cat = 'Gerenciamento de Estado (Zustand)';
    else if (f.relativePath.startsWith('src/hooks/')) cat = 'Hooks Customizados';
    else if (f.relativePath.startsWith('src/engine/')) cat = 'Motores Estatísticos & Matemáticos';
    else if (f.relativePath.startsWith('src/utils/')) cat = 'Utilitários & Helpers';
    else if (f.relativePath.startsWith('src/context/')) cat = 'Contextos React';
    else if (f.relativePath.startsWith('src/services/')) cat = 'Serviços & Integrações';
    else if (f.relativePath.startsWith('src/assets/')) cat = 'Assets & Estilos';
    else if (f.relativePath === 'src/App.jsx' || f.relativePath === 'src/main.jsx' || f.relativePath === 'src/index.css') cat = 'Entrada Principal';
    
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
}

md += `### Resumo da Distribuição do Código Fonte:\n\n`;
md += `| Categoria | Arquivos |\n`;
md += `| :--- | :--- |\n`;
for (const [cat, count] of Object.entries(categoryCounts)) {
    md += `| ${cat} | ${count} |\n`;
}
md += `| **TOTAL** | **${allCollectedFiles.length}** |\n\n`;

md += `## Índice de Arquivos\n\n`;
for (let i = 0; i < allCollectedFiles.length; i++) {
    const f = allCollectedFiles[i];
    const anchor = f.relativePath.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    md += `${i + 1}. [${f.relativePath}](#${anchor})\n`;
}
md += `\n---\n\n`;

let totalLines = 0;

for (const f of allCollectedFiles) {
    const anchor = f.relativePath.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    md += `<a id="${anchor}"></a>\n`;
    md += `## \`${f.relativePath}\`\n\n`;

    if (f.isBinary) {
        md += `*(Arquivo binário de imagem / mídia)*\n\n---\n\n`;
        continue;
    }

    try {
        const content = fs.readFileSync(f.fullPath, 'utf8');
        const lines = content.split('\n').length;
        totalLines += lines;

        let lang = f.ext.replace('.', '');
        if (lang === 'jsx') lang = 'jsx';
        else if (lang === 'tsx') lang = 'tsx';
        else if (lang === 'js') lang = 'javascript';
        else if (lang === 'ts') lang = 'typescript';
        else if (lang === 'json') lang = 'json';
        else if (lang === 'css') lang = 'css';
        else if (lang === 'html') lang = 'html';
        else if (lang === 'svg') lang = 'xml';
        else if (lang === 'md') lang = 'markdown';
        else if (lang === 'rules') lang = 'javascript';

        md += `\`\`\`${lang}\n${content.trimEnd()}\n\`\`\`\n\n---\n\n`;
    } catch (err) {
        md += `// Erro ao ler arquivo: ${err.message}\n\n---\n\n`;
    }
}

fs.writeFileSync(mdOutputFile1, md, 'utf8');
fs.writeFileSync(mdOutputFile2, md, 'utf8');
console.log(`   -> Salvo em: ${mdOutputFile1}`);
console.log(`   -> Salvo em: ${mdOutputFile2}`);
console.log(`   -> Total de linhas de código: ${totalLines}`);

// 5. Criar arquivo ZIP compactado com PowerShell para facilidade de download / envio
console.log(`[4/4] Gerando arquivo ZIP compacto: ${zipFile}...`);
try {
    if (fs.existsSync(zipFile)) {
        fs.unlinkSync(zipFile);
    }
    const psCmd = `powershell -Command "Compress-Archive -Path '${destDir}\\*' -DestinationPath '${zipFile}' -Force"`;
    execSync(psCmd, { stdio: 'inherit' });
    const zipStat = fs.statSync(zipFile);
    console.log(`   -> ZIP criado com sucesso: ${zipFile} (${(zipStat.size / (1024 * 1024)).toFixed(2)} MB)`);
} catch (err) {
    console.error(`   -> Aviso ao criar zip: ${err.message}`);
}

console.log('\n=== SEPARAÇÃO CONCLUÍDA COM SUCESSO ===');
