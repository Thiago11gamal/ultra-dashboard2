const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const EVOLUTION_FILES = [
  // 1. Página e Container Principal
  { group: '1. Página e Container Principal (Pages & Container)', path: 'src/pages/Evolution.jsx', desc: 'Página da rota /evolution: validação de dados, fallback de estado vazio e montagem' },
  { group: '1. Página e Container Principal (Pages & Container)', path: 'src/components/EvolutionChart.jsx', desc: 'Container analítico central do Menu Evolução: orquestrador dos 10 engines e seletor de foco' },

  // 2. Subcomponentes Analíticos e Visões Gráficas
  { group: '2. Subcomponentes Analíticos e Visões Gráficas (Charts & Views)', path: 'src/components/charts/EvolutionChart/CompareChart.jsx', desc: 'Visão Raio-X + Monte Carlo com projeção bayesiana e bandas de incerteza' },
  { group: '2. Subcomponentes Analíticos e Visões Gráficas (Charts & Views)', path: 'src/components/charts/EvolutionChart/CriticalTopicsAnalysis.jsx', desc: 'Painel analítico de tópicos críticos e recomendações de estudo direcionadas' },
  { group: '2. Subcomponentes Analíticos e Visões Gráficas (Charts & Views)', path: 'src/components/charts/EvolutionChart/DisciplinaCard.jsx', desc: 'Card interativo de seleção de disciplina e exibição de métricas individuais' },
  { group: '2. Subcomponentes Analíticos e Visões Gráficas (Charts & Views)', path: 'src/components/charts/EvolutionChart/EvolutionLineChart.jsx', desc: 'Gráfico temporal principal com bandas bayesianas e anti-colisão de labels' },
  { group: '2. Subcomponentes Analíticos e Visões Gráficas (Charts & Views)', path: 'src/components/charts/EvolutionChart/KpiCard.jsx', desc: 'Card de exibição de KPIs estatísticos com gradientes e indicadores de tendência' },
  { group: '2. Subcomponentes Analíticos e Visões Gráficas (Charts & Views)', path: 'src/components/charts/EvolutionChart/MonteCarloEvolutionChart.jsx', desc: 'Rastreador de probabilidade de aprovação Monte Carlo e projeções por simulado' },
  { group: '2. Subcomponentes Analíticos e Visões Gráficas (Charts & Views)', path: 'src/components/charts/EvolutionChart/PerformanceBarChart.jsx', desc: 'Gráfico de barras de desempenho comparativo entre disciplinas' },
  { group: '2. Subcomponentes Analíticos e Visões Gráficas (Charts & Views)', path: 'src/components/charts/EvolutionChart/RadarAnalysis.jsx', desc: 'Gráfico de radar multidimensional de equilíbrio entre competências e matérias' },
  { group: '2. Subcomponentes Analíticos e Visões Gráficas (Charts & Views)', path: 'src/components/charts/EvolutionChart/SubtopicsPerformanceChart.jsx', desc: 'Raio-X cirúrgico de subtópicos e assuntos específicos' },
  { group: '2. Subcomponentes Analíticos e Visões Gráficas (Charts & Views)', path: 'src/components/charts/EvolutionChart/TimeSpentChart.jsx', desc: 'Rastreador de agilidade e tempo médio por questão em simulados IA' },
  { group: '2. Subcomponentes Analíticos e Visões Gráficas (Charts & Views)', path: 'src/components/charts/EvolutionChart/TodayVsGeneralChart.jsx', desc: 'Comparativo de desempenho do dia/sessão atual contra a média geral histórica' },
  { group: '2. Subcomponentes Analíticos e Visões Gráficas (Charts & Views)', path: 'src/components/charts/EvolutionChart/WeeklyEvolutionView.jsx', desc: 'Acelerômetro semanal de desempenho com cálculo de deltas e top regressões' },
  { group: '2. Subcomponentes Analíticos e Visões Gráficas (Charts & Views)', path: 'src/components/charts/EvolutionChart/WeeklyPerformanceChart.jsx', desc: 'Gráfico de desempenho semanal agregado por período' },

  // 3. Componentes Compartilhados de Apoio Visual
  { group: '3. Componentes de Apoio Visual e UI (Visual Support & UI)', path: 'src/components/charts/EvolutionHeatmap.jsx', desc: 'Mapa de calor de frequência e consistência de simulados com granularidade diária/semanal/mensal' },
  { group: '3. Componentes de Apoio Visual e UI (Visual Support & UI)', path: 'src/components/charts/ChartFrame.jsx', desc: 'Frame container responsivo com suporte a loading skeleton e tratamento de erros' },
  { group: '3. Componentes de Apoio Visual e UI (Visual Support & UI)', path: 'src/components/charts/ChartTooltip.jsx', desc: 'Tooltip customizado de alta precisão com tema escuro e contraste acessível' },
  { group: '3. Componentes de Apoio Visual e UI (Visual Support & UI)', path: 'src/components/charts/GaussianPlot.jsx', desc: 'Plot de densidade de probabilidade da distribuição gaussiana/normal' },
  { group: '3. Componentes de Apoio Visual e UI (Visual Support & UI)', path: 'src/components/ui/StatusPill.jsx', desc: 'Pílula visual de status para classificar consistência e evolução' },
  { group: '3. Componentes de Apoio Visual e UI (Visual Support & UI)', path: 'src/components/ui/ChartGuide.jsx', desc: 'Painel interativo com explicações detalhadas de como interpretar cada gráfico' },

  // 4. Hooks Reativos
  { group: '4. Hooks Reativos do React (Hooks)', path: 'src/hooks/useEvolutionMC.js', desc: 'Hook orquestrador do motor Monte Carlo específico para os gráficos do Menu Evolução' },
  { group: '4. Hooks Reativos do React (Hooks)', path: 'src/hooks/useChartData.js', desc: 'Hook de preparação e transformação de séries temporais de dados para os gráficos' },
  { group: '4. Hooks Reativos do React (Hooks)', path: 'src/hooks/useSubjectAggData.js', desc: 'Hook agregador de métricas e filtros por janela temporal (7, 30, 90 dias ou geral)' },
  { group: '4. Hooks Reativos do React (Hooks)', path: 'src/hooks/useCategoryLevels.js', desc: 'Hook de computação dos níveis de proficiência e domínio bayesiano das categorias' },

  // 5. Utilitários e Helpers Matemáticos / Analíticos
  { group: '5. Utilitários, Mapeadores e Algoritmos (Utils & Helpers)', path: 'src/utils/evolutionGuards.js', desc: 'Guards e normalizadores para probabilidades e estados numéricos seguros' },
  { group: '5. Utilitários, Mapeadores e Algoritmos (Utils & Helpers)', path: 'src/utils/evolutionStatus.js', desc: 'Motor de cálculo de estados e tendências evolutivas disciplinares' },
  { group: '5. Utilitários, Mapeadores e Algoritmos (Utils & Helpers)', path: 'src/utils/scoreDomain.js', desc: 'Normalização unificada de escalas, limites mínimos/máximos e conversões de pontuação' },
  { group: '5. Utilitários, Mapeadores e Algoritmos (Utils & Helpers)', path: 'src/utils/heatmapAggregation.js', desc: 'Agregação e agrupamento de células para o mapa de calor de simulados' },
  { group: '5. Utilitários, Mapeadores e Algoritmos (Utils & Helpers)', path: 'src/utils/weeklyEvolutionInsights.js', desc: 'Algoritmo de identificação de top regressões e índice de tração semanal' },
  { group: '5. Utilitários, Mapeadores e Algoritmos (Utils & Helpers)', path: 'src/utils/monteCarloScenario.js', desc: 'Ajustes paramétricos de cenários hipotéticos (conservador, realista, otimista)' },
  { group: '5. Utilitários, Mapeadores e Algoritmos (Utils & Helpers)', path: 'src/utils/downsample.js', desc: 'Algoritmo LTTB (Largest Triangle Three Buckets) para otimização de alta densidade gráfica' },
  { group: '5. Utilitários, Mapeadores e Algoritmos (Utils & Helpers)', path: 'src/engine/insightGenerator.js', desc: 'Motor de geração de recomendações e insights textuais acionáveis' },

  // 6. Motores Estatísticos e Probabilísticos de Monte Carlo
  { group: '6. Motores Estatísticos e Probabilísticos (Engine)', path: 'src/engine/monteCarlo.js', desc: 'Motor clássico de simulação estocástica Monte Carlo com calibração e bootstrap' },
  { group: '6. Motores Estatísticos e Probabilísticos (Engine)', path: 'src/engine/projection.js', desc: 'Motor de projeção temporal bayesiana, GARCH de volatilidade e convergência' },
  { group: '6. Motores Estatísticos e Probabilísticos (Engine)', path: 'src/engine/stats.js', desc: 'Funções estatísticas centrais: médias móveis, variância, covariância e regressão linear' },
  { group: '6. Motores Estatísticos e Probabilísticos (Engine)', path: 'src/engine/variance.js', desc: 'Decomposição de variância total e cálculo de desvio padrão amostral' },

  // 7. Gerenciamento de Estado Global (Zustand Slice)
  { group: '7. Gerenciamento de Estado (Zustand Store)', path: 'src/store/slices/createMonteCarloSlice.js', desc: 'Slice Zustand responsável pelo histórico e persistência de dados de Monte Carlo' },

  // 8. Suíte Completa de Testes Unitários e de Regressão
  { group: '8. Suíte de Testes Automatizados (Tests)', path: 'src/components/charts/EvolutionChart/__tests__/evolutionComponents.test.jsx', desc: 'Testes de renderização estática dos componentes visuais do Menu Evolução' },
  { group: '8. Suíte de Testes Automatizados (Tests)', path: 'src/components/charts/EvolutionChart/__tests__/evolution-fixes-verification.test.jsx', desc: 'Verificação regressiva de correções de bugs do Menu Evolução' },
  { group: '8. Suíte de Testes Automatizados (Tests)', path: 'src/components/charts/EvolutionChart/__tests__/evolution-menu-bugs-audit.test.jsx', desc: 'Suíte completa de auditoria de bugs e integridade de domínio de notas' },
  { group: '8. Suíte de Testes Automatizados (Tests)', path: 'src/components/charts/EvolutionChart/__tests__/evolution-menu-comprehensive-fixes.test.jsx', desc: 'Testes de integração e acessibilidade para tooltips e visões do Menu' },
  { group: '8. Suíte de Testes Automatizados (Tests)', path: 'src/components/charts/EvolutionChart/__tests__/evolution-menu-final-fixes.test.jsx', desc: 'Validação final de status evolutivos e subtópicos' },
  { group: '8. Suíte de Testes Automatizados (Tests)', path: 'src/components/charts/EvolutionChart/__tests__/evolution-stats-bugs.test.jsx', desc: 'Testes de renderização de cards e retenção' },
  { group: '8. Suíte de Testes Automatizados (Tests)', path: 'src/components/charts/EvolutionChart/__tests__/TimeSpentChart.test.jsx', desc: 'Testes de renderização e cálculo do gráfico de tempo por questão' },
  { group: '8. Suíte de Testes Automatizados (Tests)', path: 'tests/evolutionE2E.test.js', desc: 'Testes unitários dos auxiliares de execução E2E do Menu Evolução' },
  { group: '8. Suíte de Testes Automatizados (Tests)', path: 'e2e/evolution-smoke.spec.js', desc: 'Smoke test Playwright de inicialização e montagem do container' },

  // 9. Scripts de Automação e CI
  { group: '9. Scripts de Automação e Verificação (Scripts)', path: 'scripts/export-evolution-menu.mjs', desc: 'Script de exportação do código do menu evolução para markdown' },
  { group: '9. Scripts de Automação e Verificação (Scripts)', path: 'scripts/verify-evolution-stack.mjs', desc: 'Pipeline de validação estrita (testes, lint, build e e2e) da stack de evolução' },
  { group: '9. Scripts de Automação e Verificação (Scripts)', path: 'scripts/test-evolution-suite.mjs', desc: 'Runner da suíte combinada de cenários, mapa de calor e contratos de UI' },
  { group: '9. Scripts de Automação e Verificação (Scripts)', path: 'scripts/test-evolution-ui-contracts.mjs', desc: 'Validador de conformidade e contratos de acessibilidade da UI' },
  { group: '9. Scripts de Automação e Verificação (Scripts)', path: 'scripts/test-evolution-e2e.mjs', desc: 'Runner do teste end-to-end do Menu Evolução' }
];

function generate() {
  const rootDir = path.resolve(__dirname, '..');
  const mdOutputPath = path.join(rootDir, 'CODIGO_MENU_EVOLUCAO.md');
  const txtOutputPath = path.join(rootDir, 'CODIGO_MENU_EVOLUCAO.txt');
  const targetDir = path.join(rootDir, 'codigo_menu_evolucao');

  if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true });
  }
  fs.mkdirSync(targetDir, { recursive: true });

  let totalFiles = 0;
  let totalLines = 0;
  let totalBytes = 0;
  const validFiles = [];

  for (const item of EVOLUTION_FILES) {
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
        bytes
      });

      // Copia para a pasta isolada codigo_menu_evolucao/
      const destPath = path.join(targetDir, item.path);
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.writeFileSync(destPath, content, 'utf8');
    } else {
      console.warn(`[AVISO] Arquivo não encontrado: ${item.path}`);
    }
  }

  let md = `# CÓDIGO UNIFICADO — MENU EVOLUÇÃO (ULTRA DASHBOARD)\n\n`;
  md += `> **Data de Geração:** ${new Date().toISOString()}\n`;
  md += `> **Total de Arquivos:** ${totalFiles}\n`;
  md += `> **Total de Linhas:** ${totalLines.toLocaleString('pt-BR')}\n`;
  md += `> **Tamanho Total:** ${(totalBytes / 1024).toFixed(2)} KB\n\n`;

  md += `Este documento contém o **código-fonte completo e exclusivo do Menu Evolução** do Ultra Dashboard.\n`;
  md += `Ele inclui a página de entrada, componentes visuais, gráficos de alta precisão (Recharts), hooks reativos de orquestração, utilitários matemáticos e de domínio de notas, motores de projeção bayesiana e Monte Carlo, suíte completa de testes automatizados e scripts de validação de pipeline.\n\n`;

  md += `---\n\n`;
  md += `## 📑 ÍNDICE GERAL DE ARQUIVOS\n\n`;

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
      let lang = ext;
      if (ext === 'jsx' || ext === 'js' || ext === 'mjs' || ext === 'cjs') lang = 'javascript';
      if (ext === 'ts' || ext === 'tsx') lang = 'typescript';

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

  fs.writeFileSync(mdOutputPath, md, 'utf8');
  fs.writeFileSync(txtOutputPath, md, 'utf8');

  // Cria arquivo ZIP com a pasta separada
  try {
    const zipPath = path.join(rootDir, 'codigo_menu_evolucao.zip');
    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
    execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${targetDir}' -DestinationPath '${zipPath}' -Force"`);
    console.log(`[ZIP] Arquivo zip gerado: ${zipPath}`);
  } catch (zipErr) {
    console.warn(`[AVISO] Falha ao criar zip: ${zipErr.message}`);
  }

  console.log(`[SUCESSO] Código do Menu Evolução separado com sucesso:`);
  console.log(`- Markdown: ${mdOutputPath}`);
  console.log(`- Texto: ${txtOutputPath}`);
  console.log(`- Diretório isolado: ${targetDir}`);
  console.log(`- Arquivos processados: ${totalFiles}`);
  console.log(`- Total de linhas: ${totalLines.toLocaleString('pt-BR')}`);
  console.log(`- Tamanho: ${(totalBytes / 1024).toFixed(2)} KB`);
}

generate();
