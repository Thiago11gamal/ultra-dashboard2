const fs = require('fs');
const path = require('path');

const STATS_FILES = [
  // 1. Pages & Main Views
  { group: '1. Páginas e Visão Principal (Pages)', path: 'src/pages/Stats.jsx', desc: 'Página principal do menu Estatísticas' },

  // 2. Componentes de UI do Menu Estatísticas
  { group: '2. Componentes de UI (Components)', path: 'src/components/VerifiedStats.jsx', desc: 'Painel principal de estatísticas verificadas e KPIs' },
  { group: '2. Componentes de UI (Components)', path: 'src/components/MonteCarloGauge.jsx', desc: 'Velocímetro e visualização do motor de Monte Carlo' },
  { group: '2. Componentes de UI (Components)', path: 'src/components/WeeklyAnalysis.jsx', desc: 'Card e detalhamento de análise semanal de estudos' },
  { group: '2. Componentes de UI (Components)', path: 'src/components/DueForecast.jsx', desc: 'Previsão e status de flashcards a vencer' },
  { group: '2. Componentes de UI (Components)', path: 'src/components/MonteCarloDebugger.jsx', desc: 'Widget popover de auditoria e depuração de Monte Carlo' },

  // 3. Gráficos e Visualizações Analíticas
  { group: '3. Gráficos e Visualizações (Charts)', path: 'src/components/charts/GaussianPlot.jsx', desc: 'Gráfico de curva de distribuição gaussiana/normal' },
  { group: '3. Gráficos e Visualizações (Charts)', path: 'src/components/charts/MonteCarloConfig.jsx', desc: 'Modal/painel de parâmetros e configurações da simulação' },
  { group: '3. Gráficos e Visualizações (Charts)', path: 'src/components/charts/ReliabilityCurveChart.jsx', desc: 'Gráfico de calibração e curva de confiabilidade' },
  { group: '3. Gráficos e Visualizações (Charts)', path: 'src/components/charts/Analytics/EvolucaoFocoChart.jsx', desc: 'Gráfico de área de evolução do foco diário' },
  { group: '3. Gráficos e Visualizações (Charts)', path: 'src/components/charts/Analytics/HorasDisciplinaChart.jsx', desc: 'Gráfico de barras horizontais de horas por matéria' },
  { group: '3. Gráficos e Visualizações (Charts)', path: 'src/components/charts/Analytics/AnaliseRetencaoChart.jsx', desc: 'Gráfico de dispersão e retenção de flashcards' },
  { group: '3. Gráficos e Visualizações (Charts)', path: 'src/components/charts/DueForecastChart.jsx', desc: 'Gráfico de previsão de demanda de revisões' },
  { group: '3. Gráficos e Visualizações (Charts)', path: 'src/components/charts/ChartFrame.jsx', desc: 'Container responsivo com skeleton loader e tratamento de erro para gráficos' },
  { group: '3. Gráficos e Visualizações (Charts)', path: 'src/components/charts/ChartTooltip.jsx', desc: 'Tooltip unificado e acessível com tema escuro' },

  // 4. Hooks Reativos
  { group: '4. Hooks Reativos do React (Hooks)', path: 'src/hooks/useMonteCarloStats.js', desc: 'Hook central de orquestração de estatísticas e simulação Monte Carlo' },
  { group: '4. Hooks Reativos do React (Hooks)', path: 'src/hooks/useMonteCarloWorker.js', desc: 'Hook de comunicação assíncrona com Web Worker Monte Carlo' },

  // 5. Motores de Cálculo, Simulação e Matemática (Engine)
  { group: '5. Motores Estatísticos e Probabilísticos (Engine)', path: 'src/engine/index.js', desc: 'Ponto de entrada e reexportação centralizada do motor Monte Carlo' },
  { group: '5. Motores Estatísticos e Probabilísticos (Engine)', path: 'src/engine/monteCarlo.js', desc: 'Simulador Monte Carlo clássico com calibração e bootstrap' },
  { group: '5. Motores Estatísticos e Probabilísticos (Engine)', path: 'src/engine/projection.js', desc: 'Motor de projeção bayesiana e convergência temporal' },
  { group: '5. Motores Estatísticos e Probabilísticos (Engine)', path: 'src/engine/analyticsStats.js', desc: 'Processador analítico para métricas do painel estatístico' },
  { group: '5. Motores Estatísticos e Probabilísticos (Engine)', path: 'src/engine/stats.js', desc: 'Cálculos estatísticos fundamentais (média ponderada, slope, variância, etc.)' },
  { group: '5. Motores Estatísticos e Probabilísticos (Engine)', path: 'src/engine/variance.js', desc: 'Decomposição de variância e desvio padrão agrupado' },
  { group: '5. Motores Estatísticos e Probabilísticos (Engine)', path: 'src/engine/diagnostics.js', desc: 'Diagnóstico de consistência, assimetria e detecção de anomalias' },
  { group: '5. Motores Estatísticos e Probabilísticos (Engine)', path: 'src/engine/insightGenerator.js', desc: 'Gerador de insights e recomendações probabilísticas' },
  { group: '5. Motores Estatísticos e Probabilísticos (Engine)', path: 'src/engine/mc.worker.js', desc: 'Web Worker para execução não bloqueante da simulação Monte Carlo' },
  { group: '5. Motores Estatísticos e Probabilísticos (Engine)', path: 'src/engine/random.js', desc: 'Gerador determinístico e de ruído para simulações' },
  { group: '5. Motores Estatísticos e Probabilísticos (Engine)', path: 'src/engine/simulationCache.js', desc: 'Cache LRU de resultados da simulação para evitar recalcular' },
  { group: '5. Motores Estatísticos e Probabilísticos (Engine)', path: 'src/engine/math/gaussian.js', desc: 'Funções de densidade e distribuição cumulativa normal / gaussiana' },
  { group: '5. Motores Estatísticos e Probabilísticos (Engine)', path: 'src/engine/math/bootstrap.js', desc: 'Reamostragem não-paramétrica com intervalos de confiança' },
  { group: '5. Motores Estatísticos e Probabilísticos (Engine)', path: 'src/engine/math/percentile.js', desc: 'Cálculo linearmente interpolado de percentis (P10, P50, P90)' },
  { group: '5. Motores Estatísticos e Probabilísticos (Engine)', path: 'src/engine/math/kahan.js', desc: 'Algoritmo de Kahan para soma e variância com precisão compensada' },
  { group: '5. Motores Estatísticos e Probabilísticos (Engine)', path: 'src/engine/math/safe.js', desc: 'Operações numéricas à prova de NaN, divisão por zero e overflow' },
  { group: '5. Motores Estatísticos e Probabilísticos (Engine)', path: 'src/engine/math/date.js', desc: 'Utilitários matemáticos para tratamento de datas em séries temporais' },
  { group: '5. Motores Estatísticos e Probabilísticos (Engine)', path: 'src/engine/math/constants.js', desc: 'Constantes matemáticas e hiperparâmetros estatísticos' },

  // 6. Utilitários, Mapeadores e Telemetria (Utils)
  { group: '6. Utilitários, Calibração e Mapeadores (Utils)', path: 'src/utils/chartDataMappers.js', desc: 'Transformadores de dados para Recharts e gráficos de foco/horas' },
  { group: '6. Utilitários, Calibração e Mapeadores (Utils)', path: 'src/utils/explanationEngine.js', desc: 'Motor de geração de explicações textuais em linguagem natural' },
  { group: '6. Utilitários, Calibração e Mapeadores (Utils)', path: 'src/utils/calibration.js', desc: 'Cálculo de Brier Score e penalidades de calibração probabilística' },
  { group: '6. Utilitários, Calibração e Mapeadores (Utils)', path: 'src/utils/calibrationTelemetry.js', desc: 'Telemetria de assertividade e viés de calibração' },
  { group: '6. Utilitários, Calibração e Mapeadores (Utils)', path: 'src/utils/ProgressStateEngine.js', desc: 'Motor de inferência de estado do usuário (progressão, regressão, domínio, etc.)' },
  { group: '6. Utilitários, Calibração e Mapeadores (Utils)', path: 'src/utils/analytics.js', desc: 'Utilitários analíticos para flashcards, sessões e contagem de itens' },
  { group: '6. Utilitários, Calibração e Mapeadores (Utils)', path: 'src/utils/scoreHelper.js', desc: 'Normalizador e protetor de notas e valores percentuais' },
  { group: '6. Utilitários, Calibração e Mapeadores (Utils)', path: 'src/utils/scoreHelper.conversions.js', desc: 'Conversões e normalização de escalas de pontuação' },
  { group: '6. Utilitários, Calibração e Mapeadores (Utils)', path: 'src/utils/scoreDomain.js', desc: 'Regras de validação de domínio de notas e limites' },
  { group: '6. Utilitários, Calibração e Mapeadores (Utils)', path: 'src/utils/monteCarloScenario.js', desc: 'Gerenciador de cenários hipotéticos de Monte Carlo' },
  { group: '6. Utilitários, Calibração e Mapeadores (Utils)', path: 'src/utils/weeklyEvolutionInsights.js', desc: 'Calculador de tendências e comparativos semanais' },
  { group: '6. Utilitários, Calibração e Mapeadores (Utils)', path: 'src/utils/dateHelper.js', desc: 'Formatadores e normalizadores de fuso horário e datas' },

  // 7. Store Zustand (Monte Carlo Slice)
  { group: '7. Gerenciamento de Estado (Zustand Store)', path: 'src/store/slices/createMonteCarloSlice.js', desc: 'Slice do Zustand para configurações e parâmetros de Monte Carlo' },
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
  md += `> **Data de Atualização:** ${new Date().toISOString()}\n`;
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
    md += `| Arquivo | Descrição | Linhas | Tamanho | Âncora |\n`;
    md += `| :--- | :--- | :---: | :---: | :--- |\n`;
    for (const f of files) {
      const anchor = f.path.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
      md += `| \`${f.path}\` | ${f.desc || '-'} | ${f.lines.toLocaleString('pt-BR')} | ${(f.bytes / 1024).toFixed(1)} KB | [Acessar Código](#${anchor}) |\n`;
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
      md += `- **Descrição:** ${f.desc || '-'}\n`;
      md += `- **Linhas:** ${f.lines.toLocaleString('pt-BR')}\n`;
      md += `- **Tamanho:** ${(f.bytes / 1024).toFixed(2)} KB\n\n`;
      md += `\`\`\`${lang}\n`;
      md += f.content;
      if (!f.content.endsWith('\n')) md += '\n';
      md += `\`\`\`\n\n`;
      md += `---\n\n`;
    }
  }

  fs.writeFileSync(outputPath, md, 'utf8');
  
  // Also write to CODIGO_MENU_ESTATISTICA.md for compatibility
  const compatPath = path.join(rootDir, 'CODIGO_MENU_ESTATISTICA.md');
  fs.writeFileSync(compatPath, md, 'utf8');

  console.log(`[SUCESSO] Arquivos gerados com sucesso:`);
  console.log(`- ${outputPath}`);
  console.log(`- ${compatPath}`);
  console.log(`- Arquivos processados: ${totalFiles}`);
  console.log(`- Total de linhas: ${totalLines}`);
  console.log(`- Tamanho do arquivo: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`);
}

generateUnifiedStatsMarkdown();
