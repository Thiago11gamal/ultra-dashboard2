const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SIMULADOS_FILES = [
  // 1. Página e Visão Principal
  { 
    group: '1. Página e Visão Principal (Pages & Main Views)', 
    path: 'src/pages/Simulados.jsx', 
    desc: 'Página mestre da rota /simulados: abas Gerar Simulado (IA / Manual), Último Simulado, Histórico; Cards de resumo Hoje/Ontem, Badge de Origem, processamento de acertos e integração ao appStore' 
  },

  // 2. Fluxo e Execução de Simulado por IA
  { 
    group: '2. Fluxo e Execução de Simulado por IA (AI Simulado Engine & Views)', 
    path: 'src/components/ai/AIGeneratedSimulado.jsx', 
    desc: 'Orquestrador do fluxo do simulado gerado por IA: gerencia transição de telas Setup -> Player -> Results, timer de prova, rascunhos de progresso e persistência no store' 
  },
  { 
    group: '2. Fluxo e Execução de Simulado por IA (AI Simulado Engine & Views)', 
    path: 'src/components/ai/SimuladoSetup.jsx', 
    desc: 'Interface de configuração de parâmetros do simulado IA: seleção de disciplinas, assuntos cadastrados ou livres, banca examinadora, quantidade de questões e nível de dificuldade' 
  },
  { 
    group: '2. Fluxo e Execução de Simulado por IA (AI Simulado Engine & Views)', 
    path: 'src/components/ai/SimuladoPlayer.jsx', 
    desc: 'Console de resolução do simulado IA: exibição de enunciados, alternativas, timer regressivo com alerta visual, suporte a gestos touch/swipe e navegação direta' 
  },
  { 
    group: '2. Fluxo e Execução de Simulado por IA (AI Simulado Engine & Views)', 
    path: 'src/components/ai/SimuladoResults.jsx', 
    desc: 'Painel analítico pós-simulado IA: pontuação final, cálculo de acertos, análise de tempo por questão, revisão comentada com justificativas da IA e opções de tentar novamente' 
  },

  // 3. Simulado Manual e Relatórios Analíticos
  { 
    group: '3. Simulado Manual e Relatórios Analíticos (Manual Simulado & Analysis)', 
    path: 'src/components/SimuladoAnalysis.jsx', 
    desc: 'Formulário e relatório detalhado de simulado manual: grade de preenchimento de questões e acertos por disciplina/assunto, cálculo automático de notas, porcentagem de acertos, badges de status e botão de persistência' 
  },

  // 4. Histórico e Visualização de Desempenho
  { 
    group: '4. Histórico e Visualização de Desempenho (History & Analytics)', 
    path: 'src/components/StudyHistory.jsx', 
    desc: 'Painel de histórico de sessões e simulados com modo de desempenho, filtros cronológicos e suporte à exclusão granular de simulados' 
  },

  // 5. Serviços e Conexão de IA
  { 
    group: '5. Serviços e Conexão de IA (Services & AI Integration)', 
    path: 'src/services/aiQuestionService.js', 
    desc: 'Serviço cliente de geração de questões com IA: schema de validação estrutural (AI_QUESTION_SCHEMA), sanitização de alternativas e comunicação resiliente' 
  },

  // 6. Gerenciamento de Estado Global
  { 
    group: '6. Gerenciamento de Estado Global (Zustand Store Slices)', 
    path: 'src/store/slices/createSimuladoSlice.js', 
    desc: 'Slice do Zustand para simulados: resetSimuladoStats (reset seguro) e deleteSimulado com remoção granular e recalibração bayesiana automática das categorias afetadas' 
  },

  // 7. Utilitários, Normalização e Medição
  { 
    group: '7. Utilitários, Normalização e Medição (Utils & Helpers)', 
    path: 'src/utils/aiSaveHelper.js', 
    desc: 'Helper de persistência atômica dos resultados do simulado IA no draft do Zustand, agregação com pesos de dificuldade, atualização de simuladoRows e evento global' 
  },
  { 
    group: '7. Utilitários, Normalização e Medição (Utils & Helpers)', 
    path: 'src/utils/measurement.js', 
    desc: 'Motor de medição e integridade: deduplicateSimulados, sanitizeSimuladoRow, mergeQuestionResult, safeDomain e clampFinite' 
  },
  { 
    group: '7. Utilitários, Normalização e Medição (Utils & Helpers)', 
    path: 'src/utils/normalization.js', 
    desc: 'Normalização canônica de matérias e tópicos, remoção de diacríticos e mapeamento de aliases para pareamento exato entre formulários e categorias' 
  },
  { 
    group: '7. Utilitários, Normalização e Medição (Utils & Helpers)', 
    path: 'src/utils/dateHelper.js', 
    desc: 'Formatadores e normalizadores de fuso horário, datas e chaves diárias para agrupamento cronológico correto de simulados' 
  },

  // 8. Suíte de Testes Automatizados
  { 
    group: '8. Suíte de Testes Automatizados (Tests & Audits)', 
    path: 'src/components/__tests__/simuladoMenuBugs.test.jsx', 
    desc: 'Suíte completa de testes do menu Simulado: auditoria de salvamento por IA, deleção em cascata, recálculo de médias e isolamento de estado' 
  },
  { 
    group: '8. Suíte de Testes Automatizados (Tests & Audits)', 
    path: 'src/utils/__tests__/measurement.test.js', 
    desc: 'Testes unitários de domínio de notas, sanitização de rows de simulados e deduplicação de históricos' 
  }
];

function generate() {
  const rootDir = path.resolve(__dirname, '..');
  const mdOutputPath = path.join(rootDir, 'CODIGO_MENU_SIMULADOS.md');
  const mdAliasPath = path.join(rootDir, 'CODIGO_MENU_SIMULADO.md');
  const txtOutputPath = path.join(rootDir, 'CODIGO_MENU_SIMULADOS.txt');
  const targetDir = path.join(rootDir, 'codigo_menu_simulado');

  if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true });
  }
  fs.mkdirSync(targetDir, { recursive: true });

  let totalFiles = 0;
  let totalLines = 0;
  let totalBytes = 0;
  const validFiles = [];

  for (const item of SIMULADOS_FILES) {
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

      // Copia para a pasta isolada codigo_menu_simulado/
      const destPath = path.join(targetDir, item.path);
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.writeFileSync(destPath, content, 'utf8');
    } else {
      console.warn(`[AVISO] Arquivo não encontrado: ${item.path}`);
    }
  }

  let md = `# CÓDIGO UNIFICADO — MENU SIMULADOS (ULTRA DASHBOARD)\n\n`;
  md += `> **Data de Geração:** ${new Date().toISOString()}\n`;
  md += `> **Total de Arquivos:** ${totalFiles}\n`;
  md += `> **Total de Linhas:** ${totalLines.toLocaleString('pt-BR')}\n`;
  md += `> **Tamanho Total:** ${(totalBytes / 1024).toFixed(2)} KB\n\n`;

  md += `Este documento contém o **código-fonte completo e exclusivo do Menu Simulados** do Ultra Dashboard.\n`;
  md += `Ele inclui a página principal da rota \`/simulados\`, o ecossistema completo de Simulado por Inteligência Artificial (Setup, Player interativo de questões com timer, painel pós-prova com revisão detalhada e pontuação), formulário e relatório de Simulado Manual, histórico de desempenho, slice do Zustand com lógica de exclusão granular e recalibração bayesiana, helpers de medição e persistência atômica, normalização de dados e a suíte completa de testes unitários e de integração.\n\n`;

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

  // Cria arquivo ZIP com a pasta separada
  try {
    const zipPath = path.join(rootDir, 'codigo_menu_simulado.zip');
    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
    execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${targetDir}' -DestinationPath '${zipPath}' -Force"`);
    console.log(`[ZIP] Arquivo zip gerado: ${zipPath}`);
  } catch (zipErr) {
    console.warn(`[AVISO] Falha ao criar zip: ${zipErr.message}`);
  }

  console.log(`[SUCESSO] Código do Menu Simulado separado com sucesso:`);
  console.log(`- Markdown: ${mdOutputPath}`);
  console.log(`- Markdown Alias: ${mdAliasPath}`);
  console.log(`- Texto: ${txtOutputPath}`);
  console.log(`- Diretório isolado: ${targetDir}`);
  console.log(`- Arquivos processados: ${totalFiles}`);
  console.log(`- Total de linhas: ${totalLines.toLocaleString('pt-BR')}`);
  console.log(`- Tamanho: ${(totalBytes / 1024).toFixed(2)} KB`);
}

generate();
