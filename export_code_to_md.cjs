const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const srcDir = path.join(rootDir, 'src');
const modularDir = path.join(rootDir, 'codigo_md');
const masterFile = path.join(rootDir, 'projeto_codigo_sem_testes.md');

// Extensões de código válidas
const validExtensions = new Set(['.js', '.jsx', '.ts', '.tsx', '.css', '.html', '.json', '.rules']);

// Pastas ignoradas
const ignoreDirs = new Set(['node_modules', '.git', 'dist', 'build', 'public', '.vscode', '.gemini', 'coverage', '__tests__']);

// Arquivos de raiz permitidos
const allowedRootFiles = [
    'package.json',
    'vite.config.js',
    'eslint.config.js',
    'index.html',
    'firestore.rules',
    'vercel.json',
    'tsconfig.json',
    'tsconfig.node.json'
];

function isTestFile(filePath) {
    const norm = filePath.replace(/\\/g, '/').toLowerCase();
    if (norm.includes('/__tests__/')) return true;
    if (/\.(test|spec)\.(js|jsx|ts|tsx)$/i.test(filePath)) return true;
    return false;
}

function getLanguage(ext) {
    switch (ext) {
        case '.js':
        case '.jsx':
            return 'javascript';
        case '.ts':
        case '.tsx':
            return 'typescript';
        case '.css':
            return 'css';
        case '.html':
            return 'html';
        case '.json':
            return 'json';
        case '.rules':
            return 'javascript';
        default:
            return '';
    }
}

function collectFiles(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;

    const list = fs.readdirSync(dir);
    for (const item of list) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            if (!ignoreDirs.has(item) && !item.startsWith('.')) {
                results = results.concat(collectFiles(fullPath));
            }
        } else {
            const ext = path.extname(item).toLowerCase();
            if (validExtensions.has(ext) && !isTestFile(fullPath)) {
                results.push(fullPath);
            }
        }
    }
    return results;
}

// 1. Coletar arquivos do src
const allSrcFiles = collectFiles(srcDir);

// 2. Coletar arquivos de configuração da raiz
const rootFiles = allowedRootFiles
    .map(f => path.join(rootDir, f))
    .filter(f => fs.existsSync(f));

const allFiles = [...allSrcFiles, ...rootFiles];

// Mapeamento e estatísticas
let totalLines = 0;
let totalBytes = 0;

const processedFiles = allFiles.map(filePath => {
    const relPath = path.relative(rootDir, filePath).replace(/\\/g, '/');
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').length;
    const ext = path.extname(filePath).toLowerCase();
    const lang = getLanguage(ext);
    const bytes = Buffer.byteLength(content, 'utf8');

    totalLines += lines;
    totalBytes += bytes;

    return {
        fullPath: filePath,
        relPath,
        content,
        lines,
        bytes,
        lang
    };
});

// Ordenar por caminho relativo
processedFiles.sort((a, b) => a.relPath.localeCompare(b.relPath));

function formatCodeBlock(file) {
    // Escapar backticks caso o código contenha blocos triplos
    const maxBackticks = (file.content.match(/`+/g) || []).reduce((max, cur) => Math.max(max, cur.length), 0);
    const fence = '`'.repeat(Math.max(3, maxBackticks + 1));
    return `### Arquivo: \`${file.relPath}\`\n*Linhas: ${file.lines.toLocaleString('pt-BR')} | Tamanho: ${(file.bytes / 1024).toFixed(1)} KB*\n\n${fence}${file.lang}\n${file.content}\n${fence}\n\n---\n\n`;
}

// ==========================================
// 1. GERAR ARQUIVO UNIFICADO
// ==========================================
let masterContent = `# Código Completo do Projeto (Sem Testes)\n\n`;
masterContent += `> Gerado em: ${new Date().toLocaleString('pt-BR')}\n`;
masterContent += `> Total de Arquivos: **${processedFiles.length}**\n`;
masterContent += `> Total de Linhas de Código: **${totalLines.toLocaleString('pt-BR')}**\n`;
masterContent += `> Tamanho Total: **${(totalBytes / (1024 * 1024)).toFixed(2)} MB**\n\n`;

masterContent += `## Índice dos Arquivos\n\n`;
processedFiles.forEach((file, idx) => {
    masterContent += `${idx + 1}. [\`${file.relPath}\`](#arquivo-${file.relPath.toLowerCase().replace(/[^a-z0-9]/g, '-')}) (${file.lines} linhas)\n`;
});
masterContent += `\n---\n\n`;

processedFiles.forEach(file => {
    masterContent += formatCodeBlock(file);
});

fs.writeFileSync(masterFile, masterContent, 'utf8');
console.log(`[OK] Arquivo unificado gerado: ${masterFile} (${(fs.statSync(masterFile).size / (1024 * 1024)).toFixed(2)} MB)`);

// Também atualizar 'projeto_codigo_completo.md' para compatibilidade
const aliasFile = path.join(rootDir, 'projeto_codigo_completo.md');
fs.copyFileSync(masterFile, aliasFile);
console.log(`[OK] Cópia de compatibilidade criada: ${aliasFile}`);

// ==========================================
// 2. GERAR ARQUIVOS MODULARES EM /codigo_md/
// ==========================================
if (!fs.existsSync(modularDir)) {
    fs.mkdirSync(modularDir, { recursive: true });
}

// Categorizar por módulo
const modules = {
    '01_paginas.md': {
        title: 'Páginas da Aplicação (src/pages)',
        filter: f => f.relPath.startsWith('src/pages/')
    },
    '02_componentes.md': {
        title: 'Componentes Visuais (src/components)',
        filter: f => f.relPath.startsWith('src/components/')
    },
    '03_store_e_context.md': {
        title: 'Estado Global e Contextos (src/store & src/context)',
        filter: f => f.relPath.startsWith('src/store/') || f.relPath.startsWith('src/context/')
    },
    '04_engine_e_probabilistico.md': {
        title: 'Motor Matemático, Estatístico e Probabilístico (src/engine)',
        filter: f => f.relPath.startsWith('src/engine/')
    },
    '05_hooks_e_services.md': {
        title: 'Hooks e Serviços (src/hooks & src/services)',
        filter: f => f.relPath.startsWith('src/hooks/') || f.relPath.startsWith('src/services/')
    },
    '06_utils_config_llm.md': {
        title: 'Utilitários, Configurações e LLM (src/utils, src/config, src/llm, src/data)',
        filter: f => f.relPath.startsWith('src/utils/') || f.relPath.startsWith('src/config/') || f.relPath.startsWith('src/llm/') || f.relPath.startsWith('src/data/') || f.relPath.startsWith('src/assets/') || f.relPath === 'src/App.jsx' || f.relPath === 'src/main.jsx' || f.relPath === 'src/index.css'
    },
    '07_raiz_e_configuracoes.md': {
        title: 'Configurações de Build e Raiz do Projeto',
        filter: f => !f.relPath.startsWith('src/')
    }
};

let indexModular = `# Índice Modular do Código do Projeto (Sem Testes)\n\n`;
indexModular += `Este diretório contém o código-fonte dividido por módulos funcionais para facilitar a leitura e o envio para plataformas com limites por arquivo.\n\n`;

for (const [filename, modInfo] of Object.entries(modules)) {
    const modFiles = processedFiles.filter(modInfo.filter);
    const modLines = modFiles.reduce((acc, f) => acc + f.lines, 0);
    const modBytes = modFiles.reduce((acc, f) => acc + f.bytes, 0);

    let modContent = `# ${modInfo.title}\n\n`;
    modContent += `> Arquivos neste módulo: **${modFiles.length}** | Linhas: **${modLines.toLocaleString('pt-BR')}** | Tamanho: **${(modBytes / 1024).toFixed(1)} KB**\n\n`;

    modContent += `## Arquivos:\n`;
    modFiles.forEach((f, idx) => {
        modContent += `${idx + 1}. \`${f.relPath}\` (${f.lines} linhas)\n`;
    });
    modContent += `\n---\n\n`;

    modFiles.forEach(f => {
        modContent += formatCodeBlock(f);
    });

    const targetPath = path.join(modularDir, filename);
    fs.writeFileSync(targetPath, modContent, 'utf8');
    console.log(`[OK] Módulo gerado: ${filename} (${modFiles.length} arquivos, ${modLines} linhas)`);

    indexModular += `- [**${modInfo.title}**](./${filename}) (${modFiles.length} arquivos, ${modLines.toLocaleString('pt-BR')} linhas, ${(modBytes / 1024).toFixed(1)} KB)\n`;
}

fs.writeFileSync(path.join(modularDir, '00_INDICE.md'), indexModular, 'utf8');

console.log('\n=============================================');
console.log(`TOTAL PROCESSADO: ${processedFiles.length} arquivos | ${totalLines.toLocaleString('pt-BR')} linhas | ${(totalBytes / (1024 * 1024)).toFixed(2)} MB`);
console.log('TODOS OS ARQUIVOS FORAM SEPARADOS E GERADOS EM MD COM SUCESSO!');
console.log('=============================================\n');
