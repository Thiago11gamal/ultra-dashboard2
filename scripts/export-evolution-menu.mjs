import fs from 'fs';
import path from 'path';

const rootDir = 'd:/Downloads/ultra-patched';
const outputFile = path.join(rootDir, 'menu-evolucao.md');

const filesToInclude = [
    // 1. Pages & Main Container
    'src/pages/Evolution.jsx',
    'src/components/EvolutionChart.jsx',
    'src/components/ActivityHeatmap.jsx',

    // 2. EvolutionChart Sub-components
    'src/components/charts/EvolutionChart/CompareChart.jsx',
    'src/components/charts/EvolutionChart/CriticalTopicsAnalysis.jsx',
    'src/components/charts/EvolutionChart/DisciplinaCard.jsx',
    'src/components/charts/EvolutionChart/EvolutionLineChart.jsx',
    'src/components/charts/EvolutionChart/KpiCard.jsx',
    'src/components/charts/EvolutionChart/MonteCarloEvolutionChart.jsx',
    'src/components/charts/EvolutionChart/PerformanceBarChart.jsx',
    'src/components/charts/EvolutionChart/RadarAnalysis.jsx',
    'src/components/charts/EvolutionChart/SubtopicsPerformanceChart.jsx',
    'src/components/charts/EvolutionChart/TimeSpentChart.jsx',
    'src/components/charts/EvolutionChart/TodayVsGeneralChart.jsx',
    'src/components/charts/EvolutionChart/WeeklyEvolutionView.jsx',
    'src/components/charts/EvolutionChart/WeeklyPerformanceChart.jsx',

    // 3. Hooks & Utils do Menu Evolução
    'src/hooks/useChartData.js',
    'src/hooks/useMonteCarloStats.js',
    'src/utils/weeklyEvolutionInsights.js',
    'src/utils/monteCarloScenario.js',
    'src/utils/heatmapAggregation.js',

    // 4. Engines Estatísticas e Analíticas
    'src/engine/insightGenerator.js',
    'src/engine/stats.js',
    'src/engine/projection.js',
    'src/engine/variance.js',
    'src/engine/monteCarlo.js'
];

let mdContent = `# Código Completo - Menu Evolução (Ultra Dashboard)\n\n`;
mdContent += `Este arquivo reúne todo o código-fonte (página, componentes UI, subcomponentes de gráficos, hooks, utilitários e motores estatísticos) relacionado ao **Menu Evolução** do Ultra Dashboard para auditoria externa.\n`;
mdContent += `**Data de Geração**: ${new Date().toISOString()}\n`;
mdContent += `**Total de Arquivos**: ${filesToInclude.length}\n\n`;

mdContent += `## Índice de Arquivos\n\n`;
filesToInclude.forEach((relPath, idx) => {
    mdContent += `${idx + 1}. \`${relPath}\`\n`;
});
mdContent += `\n---\n\n`;

let totalLines = 0;
let totalBytes = 0;

for (const relPath of filesToInclude) {
    const absPath = path.join(rootDir, relPath);
    if (!fs.existsSync(absPath)) {
        console.warn(`[AVISO] Arquivo não encontrado: ${relPath}`);
        continue;
    }
    const content = fs.readFileSync(absPath, 'utf8');
    const lines = content.split('\n').length;
    const bytes = Buffer.byteLength(content, 'utf8');
    totalLines += lines;
    totalBytes += bytes;

    const ext = path.extname(relPath);
    const lang = (ext === '.jsx' || ext === '.js') ? 'javascript' : ext.replace('.', '');

    mdContent += `## File: \`${relPath}\`\n`;
    mdContent += `*Linhas: ${lines} | Tamanho: ${(bytes / 1024).toFixed(2)} KB*\n\n`;
    mdContent += `\`\`\`${lang}\n`;
    mdContent += content;
    if (!content.endsWith('\n')) mdContent += '\n';
    mdContent += `\`\`\`\n\n---\n\n`;
}

fs.writeFileSync(outputFile, mdContent, 'utf8');
console.log(`✅ Arquivo gerado com sucesso: ${outputFile}`);
console.log(`📊 Estatísticas Gerais: ${filesToInclude.length} arquivos | ${totalLines} linhas | ${(totalBytes / 1024).toFixed(2)} KB`);
