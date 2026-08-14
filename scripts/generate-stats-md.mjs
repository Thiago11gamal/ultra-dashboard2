import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const files = [
  { path: 'src/pages/Stats.jsx', title: 'src/pages/Stats.jsx', lang: 'jsx' },
  { path: 'src/components/VerifiedStats.jsx', title: 'src/components/VerifiedStats.jsx', lang: 'jsx' },
  { path: 'src/components/WeeklyAnalysis.jsx', title: 'src/components/WeeklyAnalysis.jsx', lang: 'jsx' },
  { path: 'src/components/MonteCarloGauge.jsx', title: 'src/components/MonteCarloGauge.jsx', lang: 'jsx' },
  { path: 'src/components/charts/MonteCarloConfig.jsx', title: 'src/components/charts/MonteCarloConfig.jsx', lang: 'jsx' },
  { path: 'src/components/DueForecast.jsx', title: 'src/components/DueForecast.jsx', lang: 'jsx' },
  { path: 'src/components/charts/DueForecastChart.jsx', title: 'src/components/charts/DueForecastChart.jsx', lang: 'jsx' },
  { path: 'src/components/charts/Analytics/EvolucaoFocoChart.jsx', title: 'src/components/charts/Analytics/EvolucaoFocoChart.jsx', lang: 'jsx' },
  { path: 'src/components/charts/Analytics/HorasDisciplinaChart.jsx', title: 'src/components/charts/Analytics/HorasDisciplinaChart.jsx', lang: 'jsx' },
  { path: 'src/components/charts/Analytics/AnaliseRetencaoChart.jsx', title: 'src/components/charts/Analytics/AnaliseRetencaoChart.jsx', lang: 'jsx' },
  { path: 'src/components/charts/GaussianPlot.jsx', title: 'src/components/charts/GaussianPlot.jsx', lang: 'jsx' },
  { path: 'src/hooks/useMonteCarloStats.js', title: 'src/hooks/useMonteCarloStats.js', lang: 'javascript' },
  { path: 'src/utils/chartDataMappers.js', title: 'src/utils/chartDataMappers.js', lang: 'javascript' },
  { path: 'src/utils/ProgressStateEngine.js', title: 'src/utils/ProgressStateEngine.js', lang: 'javascript' },
  { path: 'src/utils/analytics.js', title: 'src/utils/analytics.js', lang: 'javascript' },
  { path: 'src/engine/analyticsStats.js', title: 'src/engine/analyticsStats.js', lang: 'javascript' },
];

let md = `# Código Completo do Menu Estatística\n\n`;
md += `Este documento consolida todos os arquivos-fonte que compõem o ecossistema do **Menu Estatística** (página principal, painel de estatísticas verificadas, velocímetro de Monte Carlo, previsão de flashcards, gráficos analíticos de foco, horas e retenção, hooks de cálculo e motores estatísticos).\n\n`;
md += `---\n\n## 📑 Índice de Arquivos\n\n`;

files.forEach((f, idx) => {
  const anchor = f.path.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  md += `${idx + 1}. [\`${f.path}\`](#${anchor})\n`;
});

md += `\n---\n\n`;

files.forEach((f) => {
  const anchor = f.path.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const fullPath = resolve(process.cwd(), f.path);
  const content = readFileSync(fullPath, 'utf8');

  md += `## \`${f.path}\`\n\n<a id="${anchor}"></a>\n\n\`\`\`${f.lang}\n${content.trimEnd()}\n\`\`\`\n\n---\n\n`;
});

writeFileSync(resolve(process.cwd(), 'CODIGO_MENU_ESTATISTICA.md'), md, 'utf8');
console.log('CODIGO_MENU_ESTATISTICA.md gerado com sucesso com ' + files.length + ' arquivos.');
