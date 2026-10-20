const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const STATS_FILES = [
  // 1. Página e Visão Principal
  { 
    group: '1. Página e Visão Principal (Pages & Main Views)', 
    path: 'src/pages/Stats.jsx', 
    desc: 'Página mestre da rota /stats: orquestração de logs de estudo, simulados validados, flashcards, tick de virada de dia e montagem de componentes' 
  },

  // 2. Componentes de UI e Painéis
  { 
    group: '2. Componentes de UI e Painéis (Components)', 
    path: 'src/components/VerifiedStats.jsx', 
    desc: 'Painel executivo de estatísticas verificadas: KPIs, previsão bayesiana, índice de consistência, cards de retenção e acurácia' 
  },
  { 
    group: '2. Componentes de UI e Painéis (Components)', 
    path: 'src/components/MonteCarloGauge.jsx', 
    desc: 'Velocímetro e visualização do motor probabilístico de Monte Carlo: probabilidade de aprovação, notas P10/P50/P90 e slider de horizonte temporal' 
  },
  { 
    group: '2. Componentes de UI e Painéis (Components)', 
    path: 'src/components/WeeklyAnalysis.jsx', 
    desc: 'Painel analítico semanal: horas dedicadas por dia, matérias estudadas, taxa de consistência e detalhamento de sessões' 
  },
  { 
    group: '2. Componentes de UI e Painéis (Components)', 
    path: 'src/components/DueForecast.jsx', 
    desc: 'Previsão preditiva de flashcards a vencer por dia com horizonte configurável (7 a 30 dias)' 
  },
  { 
    group: '2. Componentes de UI e Painéis (Components)', 
    path: 'src/components/MonteCarloDebugger.jsx', 
    desc: 'Widget popover de auditoria e inspeção estocástica das variáveis e convergência do Monte Carlo' 
  },
  { 
    group: '2. Componentes de UI e Painéis (Components)', 
    path: 'src/components/StatsCards.jsx', 
    desc: 'Cards modulares e métricas rápidas de estatísticas para dashboards' 
  },

  // 3. Gráficos e Visualizações Analíticas
  { 
    group: '3. Gráficos e Visualizações Analíticas (Charts)', 
    path: 'src/components/charts/GaussianPlot.jsx', 
    desc: 'Gráfico interativo de curva de densidade normal/gaussiana com nota alvo, média e intervalo de confiança' 
  },
  { 
    group: '3. Gráficos e Visualizações Analíticas (Charts)', 
    path: 'src/components/charts/MonteCarloConfig.jsx', 
    desc: 'Modal de parâmetros avançados do Monte Carlo: iterações, volatilidade, horizonte e calibração' 
  },
  { 
    group: '3. Gráficos e Visualizações Analíticas (Charts)', 
    path: 'src/components/charts/ReliabilityCurveChart.jsx', 
    desc: 'Curva empírica de confiabilidade e calibração probabilística com bandas de erro' 
  },
  { 
    group: '3. Gráficos e Visualizações Analíticas (Charts)', 
    path: 'src/components/charts/Analytics/EvolucaoFocoChart.jsx', 
    desc: 'Gráfico de área de evolução do foco diário e volume de horas líquidas de estudo' 
  },
  { 
    group: '3. Gráficos e Visualizações Analíticas (Charts)', 
    path: 'src/components/charts/Analytics/HorasDisciplinaChart.jsx', 
    desc: 'Gráfico de barras horizontais com concentração e ranking de tempo investido por matéria' 
  },
  { 
    group: '3. Gráficos e Visualizações Analíticas (Charts)', 
    path: 'src/components/charts/Analytics/AnaliseRetencaoChart.jsx', 
    desc: 'Gráfico de dispersão e correlação entre tempo de estudo e taxa de retenção' 
  },
  { 
    group: '3. Gráficos e Visualizações Analíticas (Charts)', 
    path: 'src/components/charts/DueForecastChart.jsx', 
    desc: 'Gráfico de barras de previsão de demanda de revisões de flashcards para os próximos dias' 
  },
  { 
    group: '3. Gráficos e Visualizações Analíticas (Charts)', 
    path: 'src/components/charts/ChartFrame.jsx', 
    desc: 'Container estrutural responsivo com skeleton loader, dark theme e isolamento de erros' 
  },
  { 
    group: '3. Gráficos e Visualizações Analíticas (Charts)', 
    path: 'src/components/charts/ChartTooltip.jsx', 
    desc: 'Tooltip acessível e customizado para gráficos Recharts com dados probabilísticos' 
  },

  // 4. Hooks Reativos
  { 
    group: '4. Hooks Reativos do React (Hooks)', 
    path: 'src/hooks/useMonteCarloStats.js', 
    desc: 'Hook mestre de orquestração estatística: desacopla cálculos analíticos, convergência e projeção temporal' 
  },
  { 
    group: '4. Hooks Reativos do React (Hooks)', 
    path: 'src/hooks/useMonteCarloWorker.js', 
    desc: 'Hook de execução paralela assíncrona com Web Worker para evitar bloqueio da thread principal' 
  },

  // 5. Motores Estatísticos, Simulação e Matemática
  { 
    group: '5. Motores Estatísticos e Probabilísticos (Engine)', 
    path: 'src/engine/index.js', 
    desc: 'Ponto central de reexportação de todas as funções do motor matemático e estatístico' 
  },
  { 
    group: '5. Motores Estatísticos e Probabilísticos (Engine)', 
    path: 'src/engine/monteCarlo.js', 
    desc: 'Simulador clássico de Monte Carlo com suporte a calibração bayesiana, bootstrap e convergência' 
  },
  { 
    group: '5. Motores Estatísticos e Probabilísticos (Engine)', 
    path: 'src/engine/projection.js', 
    desc: 'Motor de projeção temporal bayesiana e convergência de notas rumo à prova' 
  },
  { 
    group: '5. Motores Estatísticos e Probabilísticos (Engine)', 
    path: 'src/engine/analyticsStats.js', 
    desc: 'Processador analítico para agregação de estatísticas de estudo, simulados e flashcards' 
  },
  { 
    group: '5. Motores Estatísticos e Probabilísticos (Engine)', 
    path: 'src/engine/stats.js', 
    desc: 'Operações estatísticas fundamentais: média ponderada, variância amostral, desvio padrão e slope' 
  },
  { 
    group: '5. Motores Estatísticos e Probabilísticos (Engine)', 
    path: 'src/engine/variance.js', 
    desc: 'Decomposição de variância intra-materia e desvio padrão combinado' 
  },
  { 
    group: '5. Motores Estatísticos e Probabilísticos (Engine)', 
    path: 'src/engine/diagnostics.js', 
    desc: 'Diagnósticos estatísticos avançados: consistência, assimetria, curtose e detecção de anomalias' 
  },
  { 
    group: '5. Motores Estatísticos e Probabilísticos (Engine)', 
    path: 'src/engine/insightGenerator.js', 
    desc: 'Gerador determinístico de insights estatísticos e recomendações probabilísticas' 
  },
  { 
    group: '5. Motores Estatísticos e Probabilísticos (Engine)', 
    path: 'src/engine/mc.worker.js', 
    desc: 'Web Worker dedicado para simulações pesadas de Monte Carlo em segundo plano' 
  },
  { 
    group: '5. Motores Estatísticos e Probabilísticos (Engine)', 
    path: 'src/engine/random.js', 
    desc: 'Gerador pseudo-aleatório com sementes reprodutíveis (PRNG)' 
  },
  { 
    group: '5. Motores Estatísticos e Probabilísticos (Engine)', 
    path: 'src/engine/simulationCache.js', 
    desc: 'Cache LRU de alta performance para evitar recomputações desnecessárias de simulações' 
  },
  { 
    group: '5. Motores Estatísticos e Probabilísticos (Engine)', 
    path: 'src/engine/math/gaussian.js', 
    desc: 'Funções de probabilidade normal (PDF, CDF e inverso aproximado de erro erf)' 
  },
  { 
    group: '5. Motores Estatísticos e Probabilísticos (Engine)', 
    path: 'src/engine/math/bootstrap.js', 
    desc: 'Reamostragem não paramétrica com intervalos de confiança BCa' 
  },
  { 
    group: '5. Motores Estatísticos e Probabilísticos (Engine)', 
    path: 'src/engine/math/percentile.js', 
    desc: 'Interpolação linear de percentis empíricos com validação de limites' 
  },
  { 
    group: '5. Motores Estatísticos e Probabilísticos (Engine)', 
    path: 'src/engine/math/kahan.js', 
    desc: 'Soma compensada de Kahan e Neumaier para máxima precisão de ponto flutuante' 
  },
  { 
    group: '5. Motores Estatísticos e Probabilísticos (Engine)', 
    path: 'src/engine/math/safe.js', 
    desc: 'Guardiões matemáticos contra NaN, divisões por zero, infinity e overflow' 
  },
  { 
    group: '5. Motores Estatísticos e Probabilísticos (Engine)', 
    path: 'src/engine/math/date.js', 
    desc: 'Utilitários de séries temporais para projeções cronológicas' 
  },
  { 
    group: '5. Motores Estatísticos e Probabilísticos (Engine)', 
    path: 'src/engine/math/constants.js', 
    desc: 'Constantes e hiperparâmetros matemáticos da simulação estatística' 
  },

  // 6. Utilitários, Calibração e Mapeadores
  { 
    group: '6. Utilitários, Calibração e Mapeadores (Utils)', 
    path: 'src/utils/chartDataMappers.js', 
    desc: 'Mapeamento e agregação de dados brutos para os gráficos de foco e matérias' 
  },
  { 
    group: '6. Utilitários, Calibração e Mapeadores (Utils)', 
    path: 'src/utils/explanationEngine.js', 
    desc: 'Motor gerador de explicações textuais detalhadas em linguagem natural' 
  },
  { 
    group: '6. Utilitários, Calibração e Mapeadores (Utils)', 
    path: 'src/utils/calibration.js', 
    desc: 'Cálculo de Brier Score, penalidade de calibração e calibração de probabilidades' 
  },
  { 
    group: '6. Utilitários, Calibração e Mapeadores (Utils)', 
    path: 'src/utils/calibrationTelemetry.js', 
    desc: 'Telemetria e registro de métricas de assertividade preditiva' 
  },
  { 
    group: '6. Utilitários, Calibração e Mapeadores (Utils)', 
    path: 'src/utils/ProgressStateEngine.js', 
    desc: 'Motor de inferência de estados: progressão, regressão, domínio, estagnação e instabilidade' 
  },
  { 
    group: '6. Utilitários, Calibração e Mapeadores (Utils)', 
    path: 'src/utils/analytics.js', 
    desc: 'Cálculo agregado de flashcards devidos hoje, retenção média e contagem de itens' 
  },
  { 
    group: '6. Utilitários, Calibração e Mapeadores (Utils)', 
    path: 'src/utils/scoreHelper.js', 
    desc: 'Funções de sanitização, formatação e verificação de notas seguras' 
  },
  { 
    group: '6. Utilitários, Calibração e Mapeadores (Utils)', 
    path: 'src/utils/scoreHelper.conversions.js', 
    desc: 'Conversões universais de escalas de notas (0-10, 0-100, porcentagem)' 
  },
  { 
    group: '6. Utilitários, Calibração e Mapeadores (Utils)', 
    path: 'src/utils/scoreDomain.js', 
    desc: 'Validações de intervalo e domínio de notas por banca' 
  },
  { 
    group: '6. Utilitários, Calibração e Mapeadores (Utils)', 
    path: 'src/utils/monteCarloScenario.js', 
    desc: 'Gerador e manipulador de cenários hipotéticos e sensibilidade de Monte Carlo' 
  },
  { 
    group: '6. Utilitários, Calibração e Mapeadores (Utils)', 
    path: 'src/utils/weeklyEvolutionInsights.js', 
    desc: 'Insights comparativos de evolução semana a semana' 
  },
  { 
    group: '6. Utilitários, Calibração e Mapeadores (Utils)', 
    path: 'src/utils/dateHelper.js', 
    desc: 'Tratamento de fuso horário brasileiro, chaves diárias e formatação de datas' 
  },

  // 7. Gerenciamento de Estado Global
  { 
    group: '7. Gerenciamento de Estado Global (Zustand Store)', 
    path: 'src/store/slices/createMonteCarloSlice.js', 
    desc: 'Slice do Zustand para configurações, parâmetros e cache de simulações de Monte Carlo' 
  },

  // 8. Suíte de Testes Automatizados e Auditorias
  { 
    group: '8. Suíte de Testes Automatizados e Auditorias (Tests & Audits)', 
    path: 'src/components/__tests__/stats-menu-bugs.test.jsx', 
    desc: 'Testes de integração e regressão para bugs conhecidos do menu estatísticas' 
  },
  { 
    group: '8. Suíte de Testes Automatizados e Auditorias (Tests & Audits)', 
    path: 'src/engine/__tests__/monteCarlo.test.js', 
    desc: 'Testes unitários e matemáticos do motor de simulação de Monte Carlo' 
  },
  { 
    group: '8. Suíte de Testes Automatizados e Auditorias (Tests & Audits)', 
    path: 'src/engine/__tests__/stats.test.js', 
    desc: 'Testes unitários de cálculos estatísticos, médias ponderadas e variância' 
  },
  { 
    group: '8. Suíte de Testes Automatizados e Auditorias (Tests & Audits)', 
    path: 'src/hooks/__tests__/useMonteCarloStats.test.js', 
    desc: 'Testes unitários do hook orquestrador useMonteCarloStats' 
  },
  { 
    group: '8. Suíte de Testes Automatizados e Auditorias (Tests & Audits)', 
    path: 'src/utils/__tests__/dueForecast.test.js', 
    desc: 'Testes unitários do cálculo de previsão de vencimento de flashcards' 
  },
  { 
    group: '8. Suíte de Testes Automatizados e Auditorias (Tests & Audits)', 
    path: 'src/utils/__tests__/statsTimelineHumanTitles.test.jsx', 
    desc: 'Testes de títulos humanizados e acessibilidade na linha do tempo' 
  },
  { 
    group: '8. Suíte de Testes Automatizados e Auditorias (Tests & Audits)', 
    path: 'src/utils/__tests__/statsMenuFixes.test.js', 
    desc: 'Testes de verificação e estabilidade de correções do painel' 
  },
  { 
    group: '8. Suíte de Testes Automatizados e Auditorias (Tests & Audits)', 
    path: 'src/utils/__tests__/statsMenuMathAudit.test.js', 
    desc: 'Auditoria matemática e checagem de integridade numérica das fórmulas estatísticas' 
  },
  { 
    group: '8. Suíte de Testes Automatizados e Auditorias (Tests & Audits)', 
    path: 'src/utils/__tests__/statsMenuAudit.test.js', 
    desc: 'Auditoria geral de consistência dos dados do menu estatísticas' 
  },
  { 
    group: '8. Suíte de Testes Automatizados e Auditorias (Tests & Audits)', 
    path: 'src/utils/__tests__/statsAuditVerification.test.js', 
    desc: 'Verificação analítica do pipeline de telemetria e validação de KPIs' 
  }
];

function generate() {
  const rootDir = path.resolve(__dirname, '..');
  const mdOutputPath = path.join(rootDir, 'CODIGO_MENU_ESTATISTICA.md');
  const mdAliasPath = path.join(rootDir, 'CODIGO_MENU_ESTATISTICAS.md');
  const txtOutputPath = path.join(rootDir, 'CODIGO_MENU_ESTATISTICA.txt');
  const txtAliasPath = path.join(rootDir, 'CODIGO_MENU_ESTATISTICAS.txt');
  const targetDir = path.join(rootDir, 'codigo_menu_estatistica');

  if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true });
  }
  fs.mkdirSync(targetDir, { recursive: true });

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
        bytes
      });

      // Copia para a pasta isolada codigo_menu_estatistica/
      const destPath = path.join(targetDir, item.path);
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.writeFileSync(destPath, content, 'utf8');
    } else {
      console.warn(`[AVISO] Arquivo não encontrado: ${item.path}`);
    }
  }

  let md = `# CÓDIGO UNIFICADO — MENU ESTATÍSTICAS (ULTRA DASHBOARD)\n\n`;
  md += `> **Data de Geração:** ${new Date().toISOString()}\n`;
  md += `> **Total de Arquivos:** ${totalFiles}\n`;
  md += `> **Total de Linhas:** ${totalLines.toLocaleString('pt-BR')}\n`;
  md += `> **Tamanho Total:** ${(totalBytes / 1024).toFixed(2)} KB\n\n`;

  md += `Este documento consolida integralmente todo o ecossistema de código-fonte do **Menu Estatísticas** (\`/stats\`) do Ultra Dashboard.\n\n`;
  md += `Ele contempla:\n`;
  md += `1. **Página Principal e Visualizações Centrais:** Rota \`/stats\` com ticks cronológicos, painel de estatísticas verificadas (\`VerifiedStats\`), velocímetro estocástico (\`MonteCarloGauge\`), previsão de revisões de flashcards (\`DueForecast\`) e análise semanal (\`WeeklyAnalysis\`).\n`;
  md += `2. **Componentes Gráficos e Visualizações:** Curva de distribuição Gaussiana (\`GaussianPlot\`), configuração de simulação (\`MonteCarloConfig\`), curva de confiabilidade (\`ReliabilityCurveChart\`), evolução de foco (\`EvolucaoFocoChart\`), horas por disciplina (\`HorasDisciplinaChart\`), retenção de conhecimento (\`AnaliseRetencaoChart\`) e histograma de previsões (\`DueForecastChart\`).\n`;
  md += `3. **Hooks Reativos:** Orquestração estatística (\`useMonteCarloStats\`) e comunicação multithread não bloqueante via Web Worker (\`useMonteCarloWorker\`).\n`;
  md += `4. **Motores de Cálculo e Simulação (Engine):** Simulador de Monte Carlo, projeção temporal bayesiana, soma compensada de Kahan, reamostragem bootstrap, interpolação de percentis, cálculo de variância e diagnósticos de consistência.\n`;
  md += `5. **Utilitários, Calibração e Mapeadores:** Normalização de notas, cálculo de Brier Score, mapeadores de séries temporais para Recharts e inferência de estados de aprendizagem (\`ProgressStateEngine\`).\n`;
  md += `6. **Gerenciamento de Estado Global:** Slice do Zustand para configurações e cache de Monte Carlo.\n`;
  md += `7. **Suíte Completa de Testes e Auditorias:** Testes unitários, matemáticos, de estresse e regressão cobrindo toda a base analítica.\n\n`;

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
  fs.writeFileSync(mdAliasPath, md, 'utf8');
  fs.writeFileSync(txtOutputPath, md, 'utf8');
  fs.writeFileSync(txtAliasPath, md, 'utf8');

  // Cria arquivo ZIP com a pasta separada
  try {
    const zipPath = path.join(rootDir, 'codigo_menu_estatistica.zip');
    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
    execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${targetDir}' -DestinationPath '${zipPath}' -Force"`);
    console.log(`[ZIP] Arquivo zip gerado: ${zipPath}`);
  } catch (zipErr) {
    console.warn(`[AVISO] Falha ao criar zip: ${zipErr.message}`);
  }

  console.log(`\n======================================================`);
  console.log(`[SUCESSO] Código do Menu Estatística separado com sucesso:`);
  console.log(`- Markdown Principal: ${mdOutputPath}`);
  console.log(`- Markdown Alias:     ${mdAliasPath}`);
  console.log(`- Arquivo Texto:      ${txtOutputPath}`);
  console.log(`- Diretório isolado:  ${targetDir}`);
  console.log(`- Arquivos inclusos:  ${totalFiles}`);
  console.log(`- Total de linhas:    ${totalLines.toLocaleString('pt-BR')}`);
  console.log(`- Tamanho total:      ${(totalBytes / 1024).toFixed(2)} KB`);
  console.log(`======================================================\n`);
}

generate();
