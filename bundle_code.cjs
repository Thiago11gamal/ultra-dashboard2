const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const outputFile = path.join(rootDir, 'codigo_projeto_sem_testes.md');

// Directories to ignore completely
const ignoreDirs = new Set([
  'node_modules',
  '.git',
  'dist',
  'public',
  'tests',
  '__tests__',
  '.github',
  'e2e',
  'docs',
  'auditoria',
  '.gemini',
  '.agents'
]);

// Test file patterns to ignore
const isTestFile = (filename) => {
  const lower = filename.toLowerCase();
  return (
    lower.includes('.test.') ||
    lower.includes('.spec.') ||
    lower.includes('__tests__') ||
    lower.endsWith('.test.js') ||
    lower.endsWith('.spec.js') ||
    lower.endsWith('.test.jsx') ||
    lower.endsWith('.spec.jsx') ||
    lower.endsWith('.test.ts') ||
    lower.endsWith('.spec.ts') ||
    lower.endsWith('.test.mjs') ||
    lower.endsWith('.spec.mjs')
  );
};

// Root-level configuration files to include
const rootConfigFiles = [
  'package.json',
  'vite.config.js',
  'index.html',
  'firestore.rules',
  'eslint.config.js',
  'tsconfig.json',
  '.env.example'
];

function getLanguage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const base = path.basename(filePath).toLowerCase();
  
  if (base.startsWith('.env')) return 'bash';
  if (ext === '.js' || ext === '.jsx' || ext === '.cjs' || ext === '.mjs') return 'javascript';
  if (ext === '.ts' || ext === '.tsx') return 'typescript';
  if (ext === '.css') return 'css';
  if (ext === '.html') return 'html';
  if (ext === '.json') return 'json';
  if (ext === '.rules') return 'javascript';
  return 'text';
}

function collectSrcFiles(dir, fileList = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  // Sort alphabetically for consistent ordering
  entries.sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      if (!ignoreDirs.has(entry.name) && entry.name !== '__tests__') {
        collectSrcFiles(fullPath, fileList);
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      const validExts = new Set(['.js', '.jsx', '.ts', '.tsx', '.css', '.html', '.json']);
      
      if (validExts.has(ext) && !isTestFile(entry.name)) {
        fileList.push(fullPath);
      }
    }
  }
  return fileList;
}

function run() {
  console.log('Collecting project source code (excluding tests)...');
  
  let filesToInclude = [];

  // 1. Root configuration files
  for (const configFile of rootConfigFiles) {
    const fullPath = path.join(rootDir, configFile);
    if (fs.existsSync(fullPath)) {
      filesToInclude.push(fullPath);
    }
  }

  // 2. All files in src/
  const srcDir = path.join(rootDir, 'src');
  if (fs.existsSync(srcDir)) {
    const srcFiles = collectSrcFiles(srcDir);
    filesToInclude = filesToInclude.concat(srcFiles);
  }

  console.log(`Total files to bundle: ${filesToInclude.length}`);

  let md = `# CÓDIGO DO PROJETO (SEM TESTES)\n\n`;
  md += `> Gerado em: ${new Date().toISOString()}\n`;
  md += `> Total de arquivos: ${filesToInclude.length}\n\n`;
  md += `## Índice de Arquivos\n\n`;

  for (const filePath of filesToInclude) {
    const relPath = path.relative(rootDir, filePath).replace(/\\/g, '/');
    md += `- [${relPath}](#${relPath.toLowerCase().replace(/[^a-z0-9]+/g, '-')})\n`;
  }

  md += `\n---\n\n`;

  for (const filePath of filesToInclude) {
    const relPath = path.relative(rootDir, filePath).replace(/\\/g, '/');
    const lang = getLanguage(filePath);
    const content = fs.readFileSync(filePath, 'utf8');

    md += `## ${relPath}\n\n`;
    md += `\`\`\`${lang}\n`;
    md += content;
    if (!content.endsWith('\n')) {
      md += '\n';
    }
    md += `\`\`\`\n\n---\n\n`;
  }

  fs.writeFileSync(outputFile, md, 'utf8');
  console.log(`Arquivo gerado com sucesso: ${outputFile} (${(Buffer.byteLength(md, 'utf8') / (1024 * 1024)).toFixed(2)} MB)`);
}

run();
