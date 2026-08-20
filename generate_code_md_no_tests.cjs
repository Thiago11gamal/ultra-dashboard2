const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();
const outputFile = path.join(rootDir, 'codigo_projeto_sem_testes_final.md');

const ignoreDirs = ['node_modules', '.git', 'dist', 'public', 'tests', '__tests__', '.github', 'e2e', 'docs', 'auditoria'];
const ignoreExtensions = ['.md', '.txt', '.log', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.json', '.xml', '.py', '.bat', '.ps1', '.cjs', '.mjs'];
const testPatterns = ['.test.', '.spec.'];

let markdownContent = '# Código do Projeto (Sem Testes)\n\n';

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            if (!ignoreDirs.includes(file) && !file.includes('__tests__')) {
                walkDir(fullPath);
            }
        } else {
            const ext = path.extname(file).toLowerCase();
            
            // Limit to relevant source code extensions if we want to be safe, or just exclude ignoreExtensions
            const validExts = ['.js', '.jsx', '.ts', '.tsx', '.css', '.html', '.env', '.env.example'];
            if (!validExts.includes(ext) && file !== '.env' && file !== '.env.example') continue;
            
            // Skip config files we don't care about as much if they clutter, but let's just keep vite/eslint/etc.
            if (file.includes('eslint.config') || file.includes('vite.config') || file.includes('playwright.config')) {
                // Keep these
            }

            let isTest = false;
            for (const pattern of testPatterns) {
                if (file.includes(pattern)) {
                    isTest = true;
                    break;
                }
            }
            if (isTest) continue;

            try {
                const content = fs.readFileSync(fullPath, 'utf8');
                const relativePath = path.relative(rootDir, fullPath);
                
                let lang = ext.replace('.', '');
                if (lang === 'js' || lang === 'jsx') lang = 'javascript';
                if (lang === 'ts' || lang === 'tsx') lang = 'typescript';
                if (file.startsWith('.env')) lang = 'bash';
                
                markdownContent += `## ${relativePath.replace(/\\/g, '/')}\n\n`;
                markdownContent += `\`\`\`${lang}\n${content}\n\`\`\`\n\n`;
            } catch (err) {
                console.error(`Could not read ${fullPath}:`, err);
            }
        }
    }
}

walkDir(rootDir);

fs.writeFileSync(outputFile, markdownContent, 'utf8');
console.log('Successfully generated ' + outputFile);
