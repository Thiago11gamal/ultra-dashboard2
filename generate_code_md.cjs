const fs = require('fs');
const path = require('path');

const outputFile = path.join(__dirname, 'codigo_projeto_sem_testes.md');
const ignoreDirs = ['node_modules', '.git', 'dist', 'tests', 'e2e', '__tests__', '.github', 'docs', 'auditoria'];
const ignoreFiles = ['package-lock.json', 'lint-results.json'];
const includeExts = ['.js', '.jsx', '.ts', '.tsx', '.json', '.html', '.css', '.rules', '.md', '.mjs', '.cjs'];

let output = '# Todo o Código do Projeto (Sem Testes)\n\n';

function shouldIgnore(fileOrDir) {
  return ignoreDirs.includes(fileOrDir) || fileOrDir.startsWith('.');
}

function processDirectory(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    if (shouldIgnore(entry.name)) continue;

    const fullPath = path.join(dirPath, entry.name);
    
    if (entry.isDirectory()) {
      processDirectory(fullPath);
    } else {
      if (entry.name.includes('.test.') || entry.name.includes('.spec.')) continue;
      if (ignoreFiles.includes(entry.name)) continue;
      
      const ext = path.extname(entry.name);
      if (!includeExts.includes(ext) && entry.name !== 'firestore.rules') continue;
      
      // Skip large generated markdown files in root
      if (dirPath === __dirname && entry.name.endsWith('.md')) continue;

      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        const relativePath = path.relative(__dirname, fullPath);
        
        output += `## ${relativePath}\n\n`;
        output += '```' + (ext === '.js' || ext === '.jsx' ? 'javascript' : ext === '.html' ? 'html' : ext.replace('.', '')) + '\n';
        output += content + '\n';
        output += '```\n\n';
      } catch (err) {
        console.error(`Error reading ${fullPath}: ${err.message}`);
      }
    }
  }
}

// Manually include important root files if they exist
const rootFiles = ['package.json', 'vite.config.js', 'eslint.config.js', 'index.html', 'firestore.rules', '.env.example'];
for (const file of rootFiles) {
    const fullPath = path.join(__dirname, file);
    if (fs.existsSync(fullPath)) {
        try {
            const content = fs.readFileSync(fullPath, 'utf8');
            output += `## ${file}\n\n`;
            let lang = 'javascript';
            if (file.endsWith('.json')) lang = 'json';
            if (file.endsWith('.html')) lang = 'html';
            if (file.endsWith('.rules')) lang = 'typescript';
            if (file.startsWith('.env')) lang = 'env';
            
            output += '```' + lang + '\n';
            output += content + '\n';
            output += '```\n\n';
        } catch(e) {}
    }
}

// Process src folder
const srcPath = path.join(__dirname, 'src');
if (fs.existsSync(srcPath)) {
    processDirectory(srcPath);
}

// Process public folder
const publicPath = path.join(__dirname, 'public');
if (fs.existsSync(publicPath)) {
    processDirectory(publicPath);
}

fs.writeFileSync(outputFile, output, 'utf8');
console.log(`Successfully generated ${outputFile}`);
