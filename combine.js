const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();
const outputFile = path.join(rootDir, 'codigo_completo.md');

// Ignorar arquivos/diretórios que não são código do projeto ou são testes
const ignoreDirs = ['node_modules', '.git', '.github', 'dist', 'public', 'tests', '__tests__', 'e2e'];
const ignoreFiles = ['package-lock.json', 'codigo_completo.md', 'extract.js', 'extract.txt', 'combine.js'];
const testFilePatterns = [/\.test\./, /\.spec\./, /_test\./, /_spec\./];

function isTestFile(filename) {
  return testFilePatterns.some(pattern => pattern.test(filename));
}

function traverseDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!ignoreDirs.includes(file)) {
        traverseDir(filePath, fileList);
      }
    } else {
      if (!ignoreFiles.includes(file) && !isTestFile(file) && !file.endsWith('.log')) {
        fileList.push(filePath);
      }
    }
  }

  return fileList;
}

const allFiles = traverseDir(rootDir);

let markdownContent = '# Código Completo do Projeto\n\n';

for (const filePath of allFiles) {
  const relativePath = path.relative(rootDir, filePath);
  
  // Try to determine language for markdown code block
  const ext = path.extname(filePath).slice(1);
  let lang = ext;
  if (ext === 'js' || ext === 'jsx') lang = 'javascript';
  if (ext === 'ts' || ext === 'tsx') lang = 'typescript';
  if (ext === 'vue') lang = 'vue';
  if (ext === 'md') lang = 'markdown';
  if (ext === 'json') lang = 'json';

  markdownContent += `## ${relativePath.replace(/\\/g, '/')}\n\n`;
  markdownContent += `\`\`\`${lang}\n`;
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    markdownContent += content;
  } catch (err) {
    markdownContent += `// Erro ao ler o arquivo: ${err.message}\n`;
  }
  
  markdownContent += `\n\`\`\`\n\n`;
}

fs.writeFileSync(outputFile, markdownContent, 'utf8');
console.log('Código combinado com sucesso em codigo_completo.md!');
