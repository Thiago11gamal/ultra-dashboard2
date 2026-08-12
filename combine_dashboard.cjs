const fs = require('fs');
const path = require('path');

const filesToCombine = [
    'src/pages/Dashboard.jsx',
    'src/components/StatsCards.jsx',
    'src/components/NextGoalCard.jsx',
    'src/components/PriorityProgress.jsx',
    'src/components/Checklist.jsx',
    'src/components/PromptModal.jsx',
    'src/components/CategoryEditor.jsx'
];

const outputFile = 'dashboard_completo.md';
let markdownContent = '# Arquivos do Painel (Dashboard)\n\n';

for (const file of filesToCombine) {
    const fullPath = path.join(__dirname, file);
    if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        markdownContent += `## ${file}\n\n\`\`\`jsx\n${content}\n\`\`\`\n\n`;
    } else {
        markdownContent += `## ${file}\n\n(Arquivo não encontrado)\n\n`;
    }
}

fs.writeFileSync(path.join(__dirname, outputFile), markdownContent, 'utf8');
console.log('Arquivo criado com sucesso: ' + outputFile);
