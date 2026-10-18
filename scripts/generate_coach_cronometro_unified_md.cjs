const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const FILES = [
  // =========================================================================
  // PARTE 1: MENU COACH IA (Estratégia, IA Preditiva, Causalidade & Calibração)
  // =========================================================================

  // 1.1 Páginas, Telas e Componentes de Interface
  {
    part: 'PARTE 1: MENU COACH IA',
    group: '1. Páginas, Telas e Componentes de Interface (Pages & UI)',
    menu: 'Coach IA',
    path: 'src/pages/Coach.jsx',
    desc: 'Container mestre da rota /coach: navegação tática, controle de cache, detecção de descalibração e montagem de abas'
  },
  {
    part: 'PARTE 1: MENU COACH IA',
    group: '1. Páginas, Telas e Componentes de Interface (Pages & UI)',
    menu: 'Coach IA',
    path: 'src/components/AICoachView.jsx',
    desc: 'Painel executivo do Coach IA: diagnósticos de matéria, ações recomendadas, confiabilidade e auditoria analítica'
  },
  {
    part: 'PARTE 1: MENU COACH IA',
    group: '1. Páginas, Telas e Componentes de Interface (Pages & UI)',
    menu: 'Coach IA',
    path: 'src/components/AICoachPlanner.jsx',
    desc: 'Planejador de estudos com alocação dinâmica de horas e balanceamento de metas por peso de urgência'
  },
  {
    part: 'PARTE 1: MENU COACH IA',
    group: '1. Páginas, Telas e Componentes de Interface (Pages & UI)',
    menu: 'Coach IA',
    path: 'src/components/AICoachWidget.jsx',
    desc: 'Widget compacto do Coach IA para visão rápida no Dashboard com metas e alertas táticos'
  },
  {
    part: 'PARTE 1: MENU COACH IA',
    group: '1. Páginas, Telas e Componentes de Interface (Pages & UI)',
    menu: 'Coach IA',
    path: 'src/components/coach/CoachControlCenter.jsx',
    desc: 'Centro de controle e laboratório de calibração do Coach: flags, simulações, saúde de modelos e backtesting'
  },
  {
    part: 'PARTE 1: MENU COACH IA',
    group: '1. Páginas, Telas e Componentes de Interface (Pages & UI)',
    menu: 'Coach IA',
    path: 'src/components/coach/CoachMenuNav.jsx',
    desc: 'Menu superior de navegação com alternância de abas táticas e suporte integral à acessibilidade ARIA'
  },
  {
    part: 'PARTE 1: MENU COACH IA',
    group: '1. Páginas, Telas e Componentes de Interface (Pages & UI)',
    menu: 'Coach IA',
    path: 'src/components/MonteCarloDebugger.jsx',
    desc: 'Painel de diagnóstico e inspeção de variáveis estocásticas e simulações de Monte Carlo acopladas ao Coach'
  },
  {
    part: 'PARTE 1: MENU COACH IA',
    group: '1. Páginas, Telas e Componentes de Interface (Pages & UI)',
    menu: 'Coach IA',
    path: 'src/components/charts/ReliabilityCurveChart.jsx',
    desc: 'Gráfico da curva de calibração empírica e cálculo de Brier Score para avaliação das predições do Coach'
  },

  // 1.2 Hooks Reativos e Agentes LLM
  {
    part: 'PARTE 1: MENU COACH IA',
    group: '2. Hooks Reativos e Camada de Linguagem (Hooks & LLM)',
    menu: 'Coach IA',
    path: 'src/hooks/useCoachControlCenter.js',
    desc: 'Hook orquestrador de estado reativo, flags e telemetria do Coach Control Center'
  },
  {
    part: 'PARTE 1: MENU COACH IA',
    group: '2. Hooks Reativos e Camada de Linguagem (Hooks & LLM)',
    menu: 'Coach IA',
    path: 'src/llm/coachLLMIntegration.js',
    desc: 'Módulo de integração do Coach IA com modelos de linguagem para geração contextual de conselhos e relatórios'
  },

  // 1.3 Lógica Central, Algoritmos de Urgência e Calibração
  {
    part: 'PARTE 1: MENU COACH IA',
    group: '3. Lógica Central, Urgência e Calibração (Utils & Logic)',
    menu: 'Coach IA',
    path: 'src/utils/coachLogic.js',
    desc: 'Motor algorítmico principal do Coach: cálculo de urgência de matérias, metas diárias, prioridades e foco sugerido'
  },
  {
    part: 'PARTE 1: MENU COACH IA',
    group: '3. Lógica Central, Urgência e Calibração (Utils & Logic)',
    menu: 'Coach IA',
    path: 'src/utils/coachAdaptive.js',
    desc: 'Ajuste adaptativo de limiares de risco, derivação de parâmetros e calibração de pesos preditivos'
  },
  {
    part: 'PARTE 1: MENU COACH IA',
    group: '3. Lógica Central, Urgência e Calibração (Utils & Logic)',
    menu: 'Coach IA',
    path: 'src/utils/coachCausal.js',
    desc: 'Motor causal com DAGs para estimação de impacto de horas de estudo na probabilidade de aprovação'
  },
  {
    part: 'PARTE 1: MENU COACH IA',
    group: '3. Lógica Central, Urgência e Calibração (Utils & Logic)',
    menu: 'Coach IA',
    path: 'src/utils/coachPipeline.js',
    desc: 'Pipeline unificado do Coach para orquestração de entrada, execução algorítmica e retorno estruturado'
  },
  {
    part: 'PARTE 1: MENU COACH IA',
    group: '3. Lógica Central, Urgência e Calibração (Utils & Logic)',
    menu: 'Coach IA',
    path: 'src/utils/coachFeatures.js',
    desc: 'Sistema de feature flags para ativação progressiva e segura de novas capacidades do Coach'
  },
  {
    part: 'PARTE 1: MENU COACH IA',
    group: '3. Lógica Central, Urgência e Calibração (Utils & Logic)',
    menu: 'Coach IA',
    path: 'src/utils/coachFeatureStore.js',
    desc: 'Feature store para vetorização e enriquecimento de métricas históricas de desempenho'
  },
  {
    part: 'PARTE 1: MENU COACH IA',
    group: '3. Lógica Central, Urgência e Calibração (Utils & Logic)',
    menu: 'Coach IA',
    path: 'src/utils/coachText.js',
    desc: 'Formatadores textuais inteligentes, sanitização de linguagem e templates de feedback'
  },
  {
    part: 'PARTE 1: MENU COACH IA',
    group: '3. Lógica Central, Urgência e Calibração (Utils & Logic)',
    menu: 'Coach IA',
    path: 'src/utils/coachObservability.js',
    desc: 'Observabilidade do Coach: métricas de latência, auditoria de decisões e logging de anomalias'
  },
  {
    part: 'PARTE 1: MENU COACH IA',
    group: '3. Lógica Central, Urgência e Calibração (Utils & Logic)',
    menu: 'Coach IA',
    path: 'src/utils/coachStorage.js',
    desc: 'Gerenciador de armazenamento seguro, histórico de planos e retenção de auditorias'
  },
  {
    part: 'PARTE 1: MENU COACH IA',
    group: '3. Lógica Central, Urgência e Calibração (Utils & Logic)',
    menu: 'Coach IA',
    path: 'src/utils/coachTaskId.js',
    desc: 'Gerador determinístico de identificadores de tarefas recomendadas pelo Coach'
  },
  {
    part: 'PARTE 1: MENU COACH IA',
    group: '3. Lógica Central, Urgência e Calibração (Utils & Logic)',
    menu: 'Coach IA',
    path: 'src/utils/coachSafe.js',
    desc: 'Mecanismos de salvaguarda numérica, sanitização de NaN e fallbacks estocásticos seguros'
  },
  {
    part: 'PARTE 1: MENU COACH IA',
    group: '3. Lógica Central, Urgência e Calibração (Utils & Logic)',
    menu: 'Coach IA',
    path: 'src/utils/coachBacktest.js',
    desc: 'Backtesting histórico de acurácia das sugestões de matérias e convergência de notas'
  },
  {
    part: 'PARTE 1: MENU COACH IA',
    group: '3. Lógica Central, Urgência e Calibração (Utils & Logic)',
    menu: 'Coach IA',
    path: 'src/utils/coachEvaluation.js',
    desc: 'Avaliador quantitativo de eficácia pedagógica e assertividade de recomendações'
  },
  {
    part: 'PARTE 1: MENU COACH IA',
    group: '3. Lógica Central, Urgência e Calibração (Utils & Logic)',
    menu: 'Coach IA',
    path: 'src/utils/coachOptimizer.js',
    desc: 'Otimizador de penalidades de risco e pesos de urgência de disciplinas'
  },
  {
    part: 'PARTE 1: MENU COACH IA',
    group: '3. Lógica Central, Urgência e Calibração (Utils & Logic)',
    menu: 'Coach IA',
    path: 'src/utils/coachCaches.js',
    desc: 'Estruturas de cache em memória de alta performance para o motor do Coach'
  },
  {
    part: 'PARTE 1: MENU COACH IA',
    group: '3. Lógica Central, Urgência e Calibração (Utils & Logic)',
    menu: 'Coach IA',
    path: 'src/utils/calibration.js',
    desc: 'Métricas de calibração probabilística, Brier Score, entropia cruzada e limites de confiabilidade'
  },
  {
    part: 'PARTE 1: MENU COACH IA',
    group: '3. Lógica Central, Urgência e Calibração (Utils & Logic)',
    menu: 'Coach IA',
    path: 'src/utils/calibrationTelemetry.js',
    desc: 'Telemetria de calibração e registro de eventos críticos de descalibração'
  },
  {
    part: 'PARTE 1: MENU COACH IA',
    group: '3. Lógica Central, Urgência e Calibração (Utils & Logic)',
    menu: 'Coach IA',
    path: 'src/utils/adaptiveMath.js',
    desc: 'Matemática adaptativa: encolhimento de James-Stein e cálculo de peso de confiança amostral'
  },
  {
    part: 'PARTE 1: MENU COACH IA',
    group: '3. Lógica Central, Urgência e Calibração (Utils & Logic)',
    menu: 'Coach IA',
    path: 'src/utils/adaptiveEngine.js',
    desc: 'Detecção de platôs de aprendizado e transições de regime de desempenho'
  },
  {
    part: 'PARTE 1: MENU COACH IA',
    group: '3. Lógica Central, Urgência e Calibração (Utils & Logic)',
    menu: 'Coach IA',
    path: 'src/utils/autoTunerGate.js',
    desc: 'Portão de segurança para validação de hiperparâmetros ajustados automaticamente'
  },

  // 1.4 Motores Estatísticos, Probabilísticos e Causais
  {
    part: 'PARTE 1: MENU COACH IA',
    group: '4. Motores Estatísticos, Causais e Probabilísticos (Engine)',
    menu: 'Coach IA',
    path: 'src/engine/orchestrator/coachOrchestrator.js',
    desc: 'Orquestrador executivo mestre que conecta dados brutos, modelos probabilísticos e decisões táticas'
  },
  {
    part: 'PARTE 1: MENU COACH IA',
    group: '4. Motores Estatísticos, Causais e Probabilísticos (Engine)',
    menu: 'Coach IA',
    path: 'src/engine/causal/policyEngine.js',
    desc: 'Motor de prescrição de políticas de estudo com inferência causal'
  },
  {
    part: 'PARTE 1: MENU COACH IA',
    group: '4. Motores Estatísticos, Causais e Probabilísticos (Engine)',
    menu: 'Coach IA',
    path: 'src/engine/causal/upliftModel.js',
    desc: 'Modelo de causal uplift para maximizar o ganho de proficiência por minuto estudado'
  },
  {
    part: 'PARTE 1: MENU COACH IA',
    group: '4. Motores Estatísticos, Causais e Probabilísticos (Engine)',
    menu: 'Coach IA',
    path: 'src/engine/evaluation/coachEvaluator.js',
    desc: 'Módulo de avaliação contínua de calibração e precisão preditiva do Coach'
  },
  {
    part: 'PARTE 1: MENU COACH IA',
    group: '4. Motores Estatísticos, Causais e Probabilísticos (Engine)',
    menu: 'Coach IA',
    path: 'src/engine/evaluation/strategyBacktester.js',
    desc: 'Simulador retrospectivo de estratégias de alocação de estudos'
  },
  {
    part: 'PARTE 1: MENU COACH IA',
    group: '4. Motores Estatísticos, Causais e Probabilísticos (Engine)',
    menu: 'Coach IA',
    path: 'src/engine/optimization/autoTuner.js',
    desc: 'Afinador bayesiano automático de taxas de aprendizado e pesos de penalidade'
  },
  {
    part: 'PARTE 1: MENU COACH IA',
    group: '4. Motores Estatísticos, Causais e Probabilísticos (Engine)',
    menu: 'Coach IA',
    path: 'src/engine/optimization/flagOptimizer.js',
    desc: 'Otimizador combinatório de configurações do motor analítico'
  },
  {
    part: 'PARTE 1: MENU COACH IA',
    group: '4. Motores Estatísticos, Causais e Probabilísticos (Engine)',
    menu: 'Coach IA',
    path: 'src/engine/observability/driftMonitor.js',
    desc: 'Monitor de desvio de dados (concept drift) e estabilidade de distribuição'
  },
  {
    part: 'PARTE 1: MENU COACH IA',
    group: '4. Motores Estatísticos, Causais e Probabilísticos (Engine)',
    menu: 'Coach IA',
    path: 'src/engine/observability/modelHealth.js',
    desc: 'Auditoria de integridade funcional e telemetria de integridade dos modelos'
  },
  {
    part: 'PARTE 1: MENU COACH IA',
    group: '4. Motores Estatísticos, Causais e Probabilísticos (Engine)',
    menu: 'Coach IA',
    path: 'src/engine/probabilistic/decisionEngine.js',
    desc: 'Motor de tomada de decisão bayesiana sob condições de incerteza estocástica'
  },
  {
    part: 'PARTE 1: MENU COACH IA',
    group: '4. Motores Estatísticos, Causais e Probabilísticos (Engine)',
    menu: 'Coach IA',
    path: 'src/engine/probabilistic/bayesianTopics.js',
    desc: 'Atualizador bayesiano a posteriori do grau de domínio de tópicos e matérias'
  },
  {
    part: 'PARTE 1: MENU COACH IA',
    group: '4. Motores Estatísticos, Causais e Probabilísticos (Engine)',
    menu: 'Coach IA',
    path: 'src/engine/probabilistic/fsrs.js',
    desc: 'Algoritmo Free Spaced Repetition Scheduler (FSRS) para predição de retenção de memória'
  },
  {
    part: 'PARTE 1: MENU COACH IA',
    group: '4. Motores Estatísticos, Causais e Probabilísticos (Engine)',
    menu: 'Coach IA',
    path: 'src/engine/probabilistic/knowledgeGraph.js',
    desc: 'Grafo de conhecimento para propagação de dependências e pré-requisitos pedagógicos'
  },
  {
    part: 'PARTE 1: MENU COACH IA',
    group: '4. Motores Estatísticos, Causais e Probabilísticos (Engine)',
    menu: 'Coach IA',
    path: 'src/engine/probabilistic/posteriorPredictive.js',
    desc: 'Amostrador de distribuições preditivas a posteriori para notas e aprovação'
  },
  {
    part: 'PARTE 1: MENU COACH IA',
    group: '4. Motores Estatísticos, Causais e Probabilísticos (Engine)',
    menu: 'Coach IA',
    path: 'src/engine/probabilistic/stateSpace.js',
    desc: 'Modelagem de espaço de estados e filtro de Kalman para rastreamento de proficiência oculta'
  },
  {
    part: 'PARTE 1: MENU COACH IA',
    group: '4. Motores Estatísticos, Causais e Probabilísticos (Engine)',
    menu: 'Coach IA',
    path: 'src/engine/probabilistic/volatility.js',
    desc: 'Estimador robusto de volatilidade e oscilação de rendimento disciplinar'
  },

  // 1.5 Suíte de Testes Automatizados do Coach
  {
    part: 'PARTE 1: MENU COACH IA',
    group: '5. Suíte de Testes Automatizados do Coach (Tests)',
    menu: 'Coach IA',
    path: 'tests/coach-logic.integration.test.js',
    desc: 'Testes de integração ponta a ponta do pipeline do Coach com dados simulados'
  },
  {
    part: 'PARTE 1: MENU COACH IA',
    group: '5. Suíte de Testes Automatizados do Coach (Tests)',
    menu: 'Coach IA',
    path: 'tests/coach-math-regressions.test.js',
    desc: 'Testes de regressão das fórmulas matemáticas de Monte Carlo e backtest do Coach'
  },
  {
    part: 'PARTE 1: MENU COACH IA',
    group: '5. Suíte de Testes Automatizados do Coach (Tests)',
    menu: 'Coach IA',
    path: 'tests/coach-ui-resilience.test.js',
    desc: 'Testes de resiliência e integridade da interface do usuário sob falhas parciais'
  },
  {
    part: 'PARTE 1: MENU COACH IA',
    group: '5. Suíte de Testes Automatizados do Coach (Tests)',
    menu: 'Coach IA',
    path: 'src/utils/__tests__/coachAuditVerification.test.js',
    desc: 'Auditoria de conformidade de regras de negócio e priorizações do Coach'
  },
  {
    part: 'PARTE 1: MENU COACH IA',
    group: '5. Suíte de Testes Automatizados do Coach (Tests)',
    menu: 'Coach IA',
    path: 'src/utils/__tests__/coachBacktest.test.js',
    desc: 'Testes de consistência de backtest retrospectivo e scoring preditivo'
  },
  {
    part: 'PARTE 1: MENU COACH IA',
    group: '5. Suíte de Testes Automatizados do Coach (Tests)',
    menu: 'Coach IA',
    path: 'src/utils/__tests__/coachDataIntegrityAudit.test.js',
    desc: 'Validação de integridade de dados e resiliência contra mutações anômalas'
  },
  {
    part: 'PARTE 1: MENU COACH IA',
    group: '5. Suíte de Testes Automatizados do Coach (Tests)',
    menu: 'Coach IA',
    path: 'src/utils/__tests__/coachLogic.regression.test.js',
    desc: 'Testes de regressão cobrindo o motor de urgência, geração de metas e prioridades'
  },
  {
    part: 'PARTE 1: MENU COACH IA',
    group: '5. Suíte de Testes Automatizados do Coach (Tests)',
    menu: 'Coach IA',
    path: 'src/utils/__tests__/coachMathEnhancementsAudit.test.js',
    desc: 'Auditoria das melhorias matemáticas, calibração bayesiana e convergência'
  },
  {
    part: 'PARTE 1: MENU COACH IA',
    group: '5. Suíte de Testes Automatizados do Coach (Tests)',
    menu: 'Coach IA',
    path: 'src/utils/__tests__/coachRaioXIntegrity.test.jsx',
    desc: 'Testes de montagem estática e integridade dos gráficos do Raio-X Técnico'
  },
  {
    part: 'PARTE 1: MENU COACH IA',
    group: '5. Suíte de Testes Automatizados do Coach (Tests)',
    menu: 'Coach IA',
    path: 'src/utils/__tests__/coachText.test.js',
    desc: 'Testes unitários de geração e sanitização textual das mensagens do Coach'
  },
  {
    part: 'PARTE 1: MENU COACH IA',
    group: '5. Suíte de Testes Automatizados do Coach (Tests)',
    menu: 'Coach IA',
    path: 'src/utils/__tests__/learningLoop.sanity.test.js',
    desc: 'Testes de sanidade do ciclo de aprendizado contínuo e feedback do usuário'
  },
  {
    part: 'PARTE 1: MENU COACH IA',
    group: '5. Suíte de Testes Automatizados do Coach (Tests)',
    menu: 'Coach IA',
    path: 'src/utils/__tests__/mathAudit.test.js',
    desc: 'Auditoria matemática abrangente dos algoritmos adaptativos do Coach'
  },
  {
    part: 'PARTE 1: MENU COACH IA',
    group: '5. Suíte de Testes Automatizados do Coach (Tests)',
    menu: 'Coach IA',
    path: 'src/utils/__tests__/hardeningAudit.test.js',
    desc: 'Testes de hardening arquitetural contra separadores numéricos BR e clamp'
  },
  {
    part: 'PARTE 1: MENU COACH IA',
    group: '5. Suíte de Testes Automatizados do Coach (Tests)',
    menu: 'Coach IA',
    path: 'src/utils/__tests__/calibrationIntegrityAudit.test.js',
    desc: 'Testes de integridade da curva de calibração, Brier score e decaimento temporal'
  },
  {
    part: 'PARTE 1: MENU COACH IA',
    group: '5. Suíte de Testes Automatizados do Coach (Tests)',
    menu: 'Coach IA',
    path: 'src/utils/__tests__/diffPatchesVerification.test.js',
    desc: 'Verificação regressiva dos contratos de patches e interfaces do Coach'
  },
  {
    part: 'PARTE 1: MENU COACH IA',
    group: '5. Suíte de Testes Automatizados do Coach (Tests)',
    menu: 'Coach IA',
    path: 'src/utils/__tests__/weightSensitivity.test.js',
    desc: 'Testes de sensibilidade a variações de peso em cálculos de prioridade'
  },
  {
    part: 'PARTE 1: MENU COACH IA',
    group: '5. Suíte de Testes Automatizados do Coach (Tests)',
    menu: 'Coach IA',
    path: 'scripts/test-coach-suite.mjs',
    desc: 'Script runner da suíte completa de testes unitários e de integração do Coach'
  },

  // =========================================================================
  // PARTE 2: MENU CRONÔMETRO (Pomodoro, Gestão de Tempo, Ciclos & Telemetria)
  // =========================================================================

  // 2.1 Páginas e Componentes Principais do Cronômetro
  {
    part: 'PARTE 2: MENU CRONÔMETRO',
    group: '6. Páginas e Componentes Principais do Cronômetro (Pages & Timer UI)',
    menu: 'Cronômetro',
    path: 'src/pages/Pomodoro.jsx',
    desc: 'Página da rota /pomodoro: central de telemetria, painel do mentor IA, estatísticas de produtividade e container do timer'
  },
  {
    part: 'PARTE 2: MENU CRONÔMETRO',
    group: '6. Páginas e Componentes Principais do Cronômetro (Pages & Timer UI)',
    menu: 'Cronômetro',
    path: 'src/components/PomodoroTimer.jsx',
    desc: 'Console completo do cronômetro Pomodoro: relógio interativo, modos de foco/pausa, multiplicador de velocidade, áudio e persistência'
  },

  // 2.2 Subcomponentes Especializados do Cronômetro
  {
    part: 'PARTE 2: MENU CRONÔMETRO',
    group: '7. Subcomponentes Especializados do Cronômetro (Subcomponents)',
    menu: 'Cronômetro',
    path: 'src/components/pomodoro/FocusPanel.jsx',
    desc: 'Painel de foco em tempo real: status da matéria ativa, metas, streak diário, nível de gamificação e telemetria'
  },
  {
    part: 'PARTE 2: MENU CRONÔMETRO',
    group: '7. Subcomponentes Especializados do Cronômetro (Subcomponents)',
    menu: 'Cronômetro',
    path: 'src/components/pomodoro/PomodoroClock.jsx',
    desc: 'Mostrador circular elegante com gauge de precisão, indicadores de segundos e display digital'
  },
  {
    part: 'PARTE 2: MENU CRONÔMETRO',
    group: '7. Subcomponentes Especializados do Cronômetro (Subcomponents)',
    menu: 'Cronômetro',
    path: 'src/components/pomodoro/PomodoroControls.jsx',
    desc: 'Painel de comando do cronômetro: botões de Play, Pausa, Pular, Reiniciar e seletor de velocidade'
  },
  {
    part: 'PARTE 2: MENU CRONÔMETRO',
    group: '7. Subcomponentes Especializados do Cronômetro (Subcomponents)',
    menu: 'Cronômetro',
    path: 'src/components/pomodoro/PomodoroHeader.jsx',
    desc: 'Barra de status compacta com indicador de ciclos de estudo completados e alternador de alarme sonoro'
  },
  {
    part: 'PARTE 2: MENU CRONÔMETRO',
    group: '7. Subcomponentes Especializados do Cronômetro (Subcomponents)',
    menu: 'Cronômetro',
    path: 'src/components/pomodoro/PomodoroProgress.jsx',
    desc: 'Barra de progresso animada com métricas de tempo decorrido e restante no bloco ativo'
  },

  // 2.3 Hooks Reativos e Relógio de Precisão
  {
    part: 'PARTE 2: MENU CRONÔMETRO',
    group: '8. Hooks Reativos e Sincronização (Hooks & Clock)',
    menu: 'Cronômetro',
    path: 'src/hooks/usePomodoroSync.js',
    desc: 'Hook de sincronização do cronômetro entre múltiplas abas via BroadcastChannel, tick em background e restauração pós-reload'
  },
  {
    part: 'PARTE 2: MENU CRONÔMETRO',
    group: '8. Hooks Reativos e Sincronização (Hooks & Clock)',
    menu: 'Cronômetro',
    path: 'src/hooks/useClock.js',
    desc: 'Hook de timer e relógio de alta precisão com suporte a pausas e desacoplamento do render cycle'
  },

  // 2.4 Gerenciamento de Estado Global do Cronômetro
  {
    part: 'PARTE 2: MENU CRONÔMETRO',
    group: '9. Estado Global do Cronômetro (Zustand Store)',
    menu: 'Cronômetro',
    path: 'src/store/slices/createPomodoroSlice.js',
    desc: 'Slice do Zustand responsável pelo estado do cronômetro, contadores de ciclos, histórico de sessões e ações reativas'
  },

  // 2.5 Utilitários de Tempo e Áudio de Alarme
  {
    part: 'PARTE 2: MENU CRONÔMETRO',
    group: '10. Utilitários, Helpers e Alertas Sonoros (Utils & Audio)',
    menu: 'Cronômetro',
    path: 'src/utils/pomodoroHelpers.js',
    desc: 'Formatadores de tempo (MM:SS, HH:MM:SS), validação de minutos positivos e catálogo de velocidades suportadas'
  },
  {
    part: 'PARTE 2: MENU CRONÔMETRO',
    group: '10. Utilitários, Helpers e Alertas Sonoros (Utils & Audio)',
    menu: 'Cronômetro',
    path: 'src/utils/audioAlert.js',
    desc: 'Motor de áudio via Web Audio API para tocar alarmes sonoros sintetizados na transição de foco e pausas'
  },

  // 2.6 Suíte de Testes Automatizados do Cronômetro
  {
    part: 'PARTE 2: MENU CRONÔMETRO',
    group: '11. Suíte de Testes Automatizados do Cronômetro (Tests)',
    menu: 'Cronômetro',
    path: 'tests/pomodoro-menu-bugs.test.js',
    desc: 'Testes de verificação dos bugs do menu cronômetro (reinicio, skip sem tempo, persistência e multi-abas)'
  },
  {
    part: 'PARTE 2: MENU CRONÔMETRO',
    group: '11. Suíte de Testes Automatizados do Cronômetro (Tests)',
    menu: 'Cronômetro',
    path: 'src/utils/__tests__/pomodoro.regression.test.js',
    desc: 'Testes de regressão do cálculo temporal, aceleração de velocidade e integridade de ciclos'
  }
];

function generateMarkdownForFiles(filesList, title, description) {
  let totalFiles = 0;
  let totalLines = 0;
  let totalBytes = 0;

  for (const f of filesList) {
    totalFiles++;
    totalLines += f.lines;
    totalBytes += f.bytes;
  }

  let md = `# ${title}\n\n`;
  md += `> **Data de Consolidação:** ${new Date().toISOString()}\n`;
  md += `> **Total de Arquivos:** ${totalFiles}\n`;
  md += `> **Total de Linhas:** ${totalLines.toLocaleString('pt-BR')}\n`;
  md += `> **Tamanho Total do Código:** ${(totalBytes / 1024).toFixed(2)} KB\n\n`;
  md += `${description}\n\n`;
  md += `---\n\n`;
  md += `## 📑 ÍNDICE GERAL DE ARQUIVOS\n\n`;

  const groupsMap = {};
  for (const file of filesList) {
    const key = file.part ? `${file.part} — ${file.group}` : file.group;
    if (!groupsMap[key]) {
      groupsMap[key] = [];
    }
    groupsMap[key].push(file);
  }

  for (const [groupName, groupFiles] of Object.entries(groupsMap)) {
    md += `### ${groupName}\n\n`;
    md += `| Arquivo | Menu | Descrição | Linhas | Tamanho | Âncora |\n`;
    md += `| :--- | :---: | :--- | :---: | :---: | :--- |\n`;
    for (const f of groupFiles) {
      const anchor = f.path.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
      md += `| \`${f.path}\` | **${f.menu}** | ${f.desc || '-'} | ${f.lines.toLocaleString('pt-BR')} | ${(f.bytes / 1024).toFixed(1)} KB | [Acessar Código](#${anchor}) |\n`;
    }
    md += `\n`;
  }

  md += `---\n\n`;
  md += `## 💻 CÓDIGO-FONTE INTEGRAL DOS ARQUIVOS\n\n`;

  for (let i = 0; i < filesList.length; i++) {
    const file = filesList[i];
    const anchor = file.path.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
    const ext = path.extname(file.path).slice(1);
    let lang = ext;
    if (ext === 'jsx' || ext === 'js') lang = 'javascript';
    if (ext === 'tsx' || ext === 'ts') lang = 'typescript';
    if (ext === 'mjs' || ext === 'cjs') lang = 'javascript';

    md += `<a id="${anchor}"></a>\n\n`;
    md += `### [${i + 1}/${filesList.length}] ${file.path}\n\n`;
    md += `> **Menu Pertencente:** ${file.menu}  \n`;
    md += `> **Seção:** ${file.group}  \n`;
    md += `> **Descrição:** ${file.desc}  \n`;
    md += `> **Métricas:** ${file.lines.toLocaleString('pt-BR')} linhas | ${(file.bytes / 1024).toFixed(2)} KB\n\n`;
    md += `\`\`\`${lang}\n`;
    md += file.content;
    if (!file.content.endsWith('\n')) md += '\n';
    md += `\`\`\`\n\n`;
    md += `---\n\n`;
  }

  return md;
}

function run() {
  const rootDir = path.resolve(__dirname, '..');
  const unifiedMdPath = path.join(rootDir, 'CODIGO_MENU_COACH_E_CRONOMETRO.md');
  const unifiedTxtPath = path.join(rootDir, 'CODIGO_MENU_COACH_E_CRONOMETRO.txt');
  
  // Arquivos individuais por comodidade
  const coachMdPath = path.join(rootDir, 'CODIGO_MENU_COACH_IA.md');
  const cronometroMdPath = path.join(rootDir, 'CODIGO_MENU_CRONOMETRO.md');

  // Diretório isolado
  const targetDir = path.join(rootDir, 'codigo_menu_coach_e_cronometro');

  if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true });
  }
  fs.mkdirSync(targetDir, { recursive: true });

  const validFiles = [];

  for (const item of FILES) {
    const fullPath = path.join(rootDir, item.path);
    if (!fs.existsSync(fullPath)) {
      console.error(`[ERRO] Arquivo não encontrado: ${item.path}`);
      process.exit(1);
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split('\n').length;
    const bytes = Buffer.byteLength(content, 'utf8');

    validFiles.push({
      ...item,
      fullPath,
      content,
      lines,
      bytes
    });

    // Copia para diretório isolado
    const destPath = path.join(targetDir, item.path);
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.writeFileSync(destPath, content, 'utf8');
  }

  // 1. Gera o arquivo UNIFICADO e ORGANIZADO principal (solicitado pelo usuário)
  const unifiedDescription = `Este documento unificado consolida **todo o código-fonte integral e organizado** pertencente aos menus **Coach IA** e **Cronômetro (Pomodoro)** do Ultra Dashboard.\n\n` +
    `Ele está rigorosamente particionado em duas grandes partes:\n` +
    `1. **PARTE 1: MENU COACH IA** — Páginas, Views estratégicas, Hooks reativos, Agentes LLM, Motores estocásticos e bayesianos, Modelos causais e uplift, Lógica matemática de urgência e metas, Auditoria de calibração e Suíte completa de testes automatizados.\n` +
    `2. **PARTE 2: MENU CRONÔMETRO (POMODORO)** — Páginas de alta densidade, Console interativo do cronômetro, Subcomponentes táticos (FocusPanel, Clock, Controls, Header, Progress), Hooks de sincronização multi-abas com BroadcastChannel, Slice do Zustand Store, Utilitários de tempo, Áudios de alarme via Web Audio API e Suíte de testes de regressão.\n`;

  const unifiedMarkdown = generateMarkdownForFiles(
    validFiles,
    'CÓDIGO UNIFICADO — MENU COACH IA & MENU CRONÔMETRO',
    unifiedDescription
  );

  fs.writeFileSync(unifiedMdPath, unifiedMarkdown, 'utf8');
  fs.writeFileSync(unifiedTxtPath, unifiedMarkdown, 'utf8');

  // 2. Gera também as versões individuais por menu para conveniência
  const coachFiles = validFiles.filter(f => f.menu === 'Coach IA');
  const cronometroFiles = validFiles.filter(f => f.menu === 'Cronômetro');

  const coachMarkdown = generateMarkdownForFiles(
    coachFiles,
    'CÓDIGO INTEGRAL — MENU COACH IA (ULTRA DASHBOARD)',
    'Documento contendo todo o código-fonte do Menu Coach IA: páginas, interfaces, motores de urgência, causalidade, calibração, observabilidade e testes.'
  );
  fs.writeFileSync(coachMdPath, coachMarkdown, 'utf8');

  const cronometroMarkdown = generateMarkdownForFiles(
    cronometroFiles,
    'CÓDIGO INTEGRAL — MENU CRONÔMETRO POMODORO (ULTRA DASHBOARD)',
    'Documento contendo todo o código-fonte do Menu Cronômetro (Pomodoro): páginas, console do timer, painel de foco, sincronização multi-aba, relógio, slice de store e testes.'
  );
  fs.writeFileSync(cronometroMdPath, cronometroMarkdown, 'utf8');

  // 3. Compactação ZIP do diretório isolado
  const zipPath = path.join(rootDir, 'codigo_menu_coach_e_cronometro.zip');
  try {
    const isWin = process.platform === 'win32';
    if (isWin) {
      execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${targetDir}\\*' -DestinationPath '${zipPath}' -Force"`, {
        stdio: 'ignore'
      });
      console.log(`[ZIP] Arquivo zip gerado: ${zipPath}`);
    }
  } catch (err) {
    console.warn(`[ZIP] Aviso ao criar zip: ${err.message}`);
  }

  const totalLines = validFiles.reduce((acc, f) => acc + f.lines, 0);
  const totalBytes = validFiles.reduce((acc, f) => acc + f.bytes, 0);

  console.log(`\n======================================================`);
  console.log(`[SUCESSO] Código do Menu Coach IA e Menu Cronômetro unificado e separado com sucesso!`);
  console.log(`- Arquivo Único Principal (Markdown): ${unifiedMdPath}`);
  console.log(`- Arquivo Único Principal (Texto):    ${unifiedTxtPath}`);
  console.log(`- Arquivo Individual Coach IA:        ${coachMdPath}`);
  console.log(`- Arquivo Individual Cronômetro:      ${cronometroMdPath}`);
  console.log(`- Pasta Isolada com Estrutura:        ${targetDir}`);
  console.log(`- Arquivo ZIP Compactado:             ${zipPath}`);
  console.log(`------------------------------------------------------`);
  console.log(`- Total de Arquivos: ${validFiles.length} (Coach IA: ${coachFiles.length} | Cronômetro: ${cronometroFiles.length})`);
  console.log(`- Total de Linhas:   ${totalLines.toLocaleString('pt-BR')}`);
  console.log(`- Tamanho Total:     ${(totalBytes / 1024).toFixed(2)} KB`);
  console.log(`======================================================\n`);
}

run();
