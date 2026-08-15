const fs = require('fs');
const path = require('path');

const STATS_FILES = [
  // 1. Pages & Main Views
  { group: '1. Páginas e Visão Principal (Pages)', path: 'src/pages/Stats.jsx' },

  // 2. Componentes de UI do Menu Estatísticas
  { group: '2. Componentes de UI (Components)', path: 'src/components/VerifiedStats.jsx' },
  { group: '2. Componentes de UI (Components)', path: 'src/components/MonteCarloGauge.jsx' },
  { group: '2. Componentes de UI (Components)', path: 'src/components/WeeklyAnalysis.jsx' },
  { group: '2. Componentes de UI (Components)', path: 'src/components/DueForecast.jsx' },

  // 3. Gráficos e Visualizações Analíticas
  { group: '3. Gráficos e Visualizações (Charts)', path: 'src/components/charts/GaussianPlot.jsx' },
  { group: '3. Gráficos e Visualizações (Charts)', path: 'src/components/charts/MonteCarloConfig.jsx' },
  { group: '3. Gráficos e Visualizações (Charts)', path: 'src/components/charts/Analytics/EvolucaoFocoChart.jsx' },
  { group: '3. Gráficos e Visualizações (Charts)', path: 'src/components/charts/Analytics/HorasDisciplinaChart.jsx' },
  { group: '3. Gráficos e Visualizações (Charts)', path: 'src/components/charts/DueForecastChart.jsx' },
  { group: '3. Gráficos e Visualizações (Charts)', path: 'src/components/charts/ChartFrame.jsx' },
  { group: '3. Gráficos e Visualizações (Charts)', path: 'src/components/charts/ChartTooltip.jsx' },

  // 4. Hooks Reativos
  { group: '4. Hooks Reativos do React (Hooks)', path: 'src/hooks/useMonteCarloStats.js' },
  { group: '4. Hooks Reativos do React (Hooks)', path: 'src/hooks/useMonteCarloWorker.js' },

  // 5. Motores de Cálculo, Simulação e Matemática (Engine)
  { group: '5. Motores Estatísticos e Probabilísticos (Engine)', path: 'src/engine/monteCarlo.js' },
  { group: '5. Motores Estatísticos e Probabilísticos (Engine)', path: 'src/engine/projection.js' },
  { group: '5. Motores Estatísticos e Probabilísticos (Engine)', path: 'src/engine/analyticsStats.js' },
  { group: '5. Motores Estatísticos e Probabilísticos (Engine)', path: 'src/engine/stats.js' },
  { group: '5. Motores Estatísticos e Probabilísticos (Engine)', path: 'src/engine/variance.js' },
  { group: '5. Motores Estatísticos e Probabilísticos (Engine)', path: 'src/engine/diagnostics.js' },
  { group: '5. Motores Estatísticos e Probabilísticos (Engine)', path: 'src/engine/insightGenerator.js' },
  { group: '5. Motores Estatísticos e Probabilísticos (Engine)', path: 'src/engine/mc.worker.js' },
  { group: '5. Motores Estatísticos e Probabilísticos (Engine)', path: 'src/engine/math/gaussian.js' },
  { group: '5. Motores Estatísticos e Probabilísticos (Engine)', path: 'src/engine/math/bootstrap.js' },
  { group: '5. Motores Estatísticos e Probabilísticos (Engine)', path: 'src/engine/math/percentile.js' },
  { group: '5. Motores Estatísticos e Probabilísticos (Engine)', path: 'src/engine/math/kahan.js' },
  { group: '5. Motores Estatísticos e Probabilísticos (Engine)', path: 'src/engine/math/safe.js' },

  // 6. Utilitários, Mapeadores e Telemetria (Utils)
  { group: '6. Utilitários, Calibração e Mapeadores (Utils)', path: 'src/utils/chartDataMappers.js' },
  { group: '6. Utilitários, Calibração e Mapeadores (Utils)', path: 'src/utils/explanationEngine.js' },
  { group: '6. Utilitários, Calibração e Mapeadores (Utils)', path: 'src/utils/calibration.js' },
  { group: '6. Utilitários, Calibração e Mapeadores (Utils)', path: 'src/utils/calibrationTelemetry.js' },
  { group: '6. Utilitários, Calibração e Mapeadores (Utils)', path: 'src/utils/ProgressStateEngine.js' },
  { group: '6. Utilitários, Calibração e Mapeadores (Utils)', path: 'src/utils/analytics.js' },
  { group: '6. Utilitários, Calibração e Mapeadores (Utils)', path: 'src/utils/scoreHelper.js' },
  { group: '6. Utilitários, Calibração e Mapeadores (Utils)', path: 'src/utils/scoreHelper.conversions.js' },
  { group: '6. Utilitários, Calibração e Mapeadores (Utils)', path: 'src/utils/scoreDomain.js' },
  { group: '6. Utilitários, Calibração e Mapeadores (Utils)', path: 'src/utils/monteCarloScenario.js' },
  { group: '6. Utilitários, Calibração e Mapeadores (Utils)', path: 'src/utils/weeklyEvolutionInsights.js' },
  { group: '6. Utilitários, Calibração e Mapeadores (Utils)', path: 'src/utils/dateHelper.js' },

  // 7. Store Zustand (Monte Carlo Slice)
  { group: '7. Gerenciamento de Estado (Zustand Store)', path: 'src/store/slices/createMonteCarloSlice.js' },
];

function generateUnifiedStatsMarkdown() {
  const rootDir = path.resolve(__dirname, '..');
  const outputPath = path.join(rootDir, 'ESTATISTICAS_UNIFICADO.md');

  let totalFiles = 0;
  let totalLines = 0;
  let totalBytes = 0;

  const validFiles = [];

  for (const item of STATS_FILES) {
    const fullPath = path.join(rootDir, item.path);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n').length;
      const bytes = Buffer.byteLength(content, 'utf8');

      totalFiles++;
      totalLines += lines;
      totalBytes += bytes;

      validFiles.push({
        ...item,
        fullPath,
        content,
        lines,
        bytes,
      });
    } else {
      console.warn(`[WARN] Arquivo não encontrado: ${item.path}`);
    }
  }

  let md = `# CÓDIGO UNIFICADO — MÓDULO DE ESTATÍSTICAS & SIMULAÇÃO DE MONTE CARLO\n\n`;
  md += `> **Data de Geração:** ${new Date().toISOString()}\n`;
  md += `> **Total de Arquivos:** ${totalFiles}\n`;
  md += `> **Total de Linhas de Código:** ${totalLines.toLocaleString('pt-BR')}\n`;
  md += `> **Tamanho Total:** ${(totalBytes / 1024).toFixed(2)} KB\n\n`;

  md += `Este documento consolida integralmente todos os arquivos de código-fonte que compõem o **Menu Estatísticas** da aplicação, incluindo páginas, componentes visuais, gráficos interativos, hooks reativos, motores matemáticos/estatísticos, inferência de calibração, algoritmos Monte Carlo e gerenciamento de estado Zustand.\n\n`;

  md += `---\n\n`;
  md += `## 📑 ÍNDICE GERAL DE ARQUIVOS\n\n`;

  // Group by section
  const groupsMap = {};
  for (const file of validFiles) {
    if (!groupsMap[file.group]) {
      groupsMap[file.group] = [];
    }
    groupsMap[file.group].push(file);
  }

  for (const [groupName, files] of Object.entries(groupsMap)) {
    md += `### ${groupName}\n\n`;
    md += `| Arquivo | Linhas | Tamanho | Âncora |\n`;
    md += `| :--- | :---: | :---: | :--- |\n`;
    for (const f of files) {
      const anchor = f.path.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
      md += `| \`${f.path}\` | ${f.lines.toLocaleString('pt-BR')} | ${(f.bytes / 1024).toFixed(1)} KB | [Acessar Código](#${anchor}) |\n`;
    }
    md += `\n`;
  }

  md += `---\n\n`;
  md += `## 💻 CÓDIGO-FONTE INTEGRAL\n\n`;

  for (const [groupName, files] of Object.entries(groupsMap)) {
    md += `# ${groupName.toUpperCase()}\n\n`;

    for (const f of files) {
      const anchor = f.path.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
      const ext = path.extname(f.path).replace('.', '');
      const lang = (ext === 'jsx' || ext === 'js') ? 'javascript' : ext;

      md += `## \`${f.path}\` <a id="${anchor}"></a>\n\n`;
      md += `- **Localização:** \`${f.path}\`\n`;
      md += `- **Linhas:** ${f.lines}\n`;
      md += `- **Tamanho:** ${(f.bytes / 1024).toFixed(2)} KB\n\n`;
      md += `\`\`\`${lang}\n`;
      md += f.content;
      if (!f.content.endsWith('\n')) md += '\n';
      md += `\`\`\`\n\n`;
      md += `---\n\n`;
    }
  }

  fs.writeFileSync(outputPath, md, 'utf8');
  console.log(`[SUCESSO] Arquivo unificado gerado com sucesso: ${outputPath}`);
  console.log(`- Arquivos processados: ${totalFiles}`);
  console.log(`- Total de linhas: ${totalLines}`);
  console.log(`- Tamanho do arquivo: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`);
}

generateUnifiedStatsMarkdown();
