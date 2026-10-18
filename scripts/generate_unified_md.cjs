const fs = require('fs');
const path = require('path');

function getFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(fullPath));
    } else {
      results.push(fullPath);
    }
  });
  return results;
}

const allFiles = getFiles('src');

const sectionMap = {
  logic: {
    title: 'PARTE 1: ARQUITETURA E LÓGICA DO SISTEMA',
    description: 'Motores matemáticos, inferência bayesiana, simulações estocásticas de Monte Carlo, gerenciamento de estado Zustand, hooks reativos, inteligência artificial (LLM), serviços em nuvem e utilitários de transformação de dados.',
    groups: [
      {
        id: 'logic-engine',
        title: '1.1 Motor Estatístico, Matemático e Probabilístico (Engine)',
        files: []
      },
      {
        id: 'logic-store',
        title: '1.2 Gerenciamento de Estado Global e Slices (Zustand Store)',
        files: []
      },
      {
        id: 'logic-hooks',
        title: '1.3 Hooks Customizados do React (Hooks)',
        files: []
      },
      {
        id: 'logic-utils',
        title: '1.4 Utilitários, Algoritmos e Helpers (Utils)',
        files: []
      },
      {
        id: 'logic-llm',
        title: '1.5 Módulo de LLM e Agentes Inteligentes (LLM)',
        files: []
      },
      {
        id: 'logic-services',
        title: '1.6 Serviços e Integrações Externas (Services & Firebase)',
        files: []
      },
      {
        id: 'logic-context',
        title: '1.7 Contextos de Autenticação (Context)',
        files: []
      },
      {
        id: 'logic-config-data',
        title: '1.8 Configurações e Dados Base (Config & Data)',
        files: []
      }
    ]
  },
  front: {
    title: 'PARTE 2: FRONTEND E INTERFACE DO USUÁRIO',
    description: 'Ponto de entrada, rotas e páginas completas, painéis analíticos, componentes gráficos interativos (Recharts / Canvas), módulos de estudo e folhas de estilo CSS.',
    groups: [
      {
        id: 'front-entry',
        title: '2.1 Ponto de Entrada e Casca da Aplicação (Entry & App)',
        files: []
      },
      {
        id: 'front-pages',
        title: '2.2 Páginas e Rotas Principais (Pages)',
        files: []
      },
      {
        id: 'front-charts',
        title: '2.3 Gráficos e Visualizações de Dados (Charts & Analytics)',
        files: []
      },
      {
        id: 'front-coach',
        title: '2.4 Componentes de Interface do AI Coach (Coach Components)',
        files: []
      },
      {
        id: 'front-simulados',
        title: '2.5 Módulo de Simulados com IA (Simulados Components)',
        files: []
      },
      {
        id: 'front-pomodoro',
        title: '2.6 Módulo de Foco e Cronômetro (Pomodoro Components)',
        files: []
      },
      {
        id: 'front-components',
        title: '2.7 Componentes Gerais de UI, Modais e Painéis (Components)',
        files: []
      },
      {
        id: 'front-styles',
        title: '2.8 Folhas de Estilo CSS (Styles)',
        files: []
      }
    ]
  }
};

allFiles.forEach(f => {
  const norm = f.split(path.sep).join('/');
  if (
    norm.includes('__tests__') ||
    norm.endsWith('.test.js') ||
    norm.endsWith('.test.jsx') ||
    norm.endsWith('.md') ||
    norm.endsWith('.png') ||
    norm.endsWith('.svg')
  ) {
    return;
  }

  // Logic takes precedence by directory
  if (norm.startsWith('src/engine/')) {
    sectionMap.logic.groups[0].files.push(norm);
  } else if (norm.startsWith('src/store/')) {
    sectionMap.logic.groups[1].files.push(norm);
  } else if (norm.startsWith('src/hooks/')) {
    sectionMap.logic.groups[2].files.push(norm);
  } else if (norm.startsWith('src/utils/')) {
    sectionMap.logic.groups[3].files.push(norm);
  } else if (norm.startsWith('src/llm/')) {
    sectionMap.logic.groups[4].files.push(norm);
  } else if (norm.startsWith('src/services/')) {
    sectionMap.logic.groups[5].files.push(norm);
  } else if (norm.startsWith('src/context/')) {
    sectionMap.logic.groups[6].files.push(norm);
  } else if (norm.startsWith('src/config/') || norm.startsWith('src/config.') || norm.startsWith('src/data/')) {
    sectionMap.logic.groups[7].files.push(norm);
  }
  // Frontend
  else if (norm === 'src/main.jsx' || norm === 'src/App.jsx') {
    sectionMap.front.groups[0].files.push(norm);
  } else if (norm.startsWith('src/pages/')) {
    sectionMap.front.groups[1].files.push(norm);
  } else if (norm.endsWith('.css')) {
    sectionMap.front.groups[7].files.push(norm);
  } else if (norm.startsWith('src/components/charts/')) {
    sectionMap.front.groups[2].files.push(norm);
  } else if (norm.startsWith('src/components/coach/') || norm.startsWith('src/components/AICoach')) {
    sectionMap.front.groups[3].files.push(norm);
  } else if (norm.startsWith('src/components/ai/') || norm === 'src/components/SimuladoAnalysis.jsx') {
    sectionMap.front.groups[4].files.push(norm);
  } else if (norm.startsWith('src/components/pomodoro/') || norm === 'src/components/PomodoroTimer.jsx') {
    sectionMap.front.groups[5].files.push(norm);
  } else if (norm.startsWith('src/components/')) {
    sectionMap.front.groups[6].files.push(norm);
  } else {
    sectionMap.logic.groups[3].files.push(norm);
  }
});

function getAnchor(str) {
  return str.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
}

function getLang(filePath) {
  if (filePath.endsWith('.jsx')) return 'jsx';
  if (filePath.endsWith('.js')) return 'javascript';
  if (filePath.endsWith('.css')) return 'css';
  if (filePath.endsWith('.html')) return 'html';
  if (filePath.endsWith('.json')) return 'json';
  return '';
}

let totalLogicCount = 0;
sectionMap.logic.groups.forEach(g => totalLogicCount += g.files.length);
let totalFrontCount = 0;
sectionMap.front.groups.forEach(g => totalFrontCount += g.files.length);

let md = '';

md += '# 🚀 ULTRA DASHBOARD — BASE DE CÓDIGO UNIFICADA (LÓGICA & FRONTEND)\n\n';
md += '> **Consolidação Arquitetural Completa**  \n';
md += `> **Total de Arquivos:** ${totalLogicCount + totalFrontCount} (${totalLogicCount} Lógica | ${totalFrontCount} Frontend)\n`;
md += '> \n';
md += '> Este documento reúne todos os arquivos-fonte do projeto organizados rigorosamente em duas divisões principais:\n';
md += '> 1. **PARTE 1: ARQUITETURA E LÓGICA** — Motores matemáticos, inferência bayesiana, simulações estocásticas de Monte Carlo, gerenciamento de estado Zustand, hooks reativos, integração com IA/LLM e utilitários de transformação de dados.\n';
md += '> 2. **PARTE 2: FRONTEND E INTERFACE** — Ponto de entrada, rotas e páginas completas, painéis analíticos, componentes gráficos interativos (Recharts / Canvas), módulos de estudo e folhas de estilo CSS.\n\n';

md += '---\n\n';
md += '## 📑 SUMÁRIO GERAL DE NAVEGAÇÃO\n\n';

let globalFileCounter = 1;

for (const secKey of ['logic', 'front']) {
  const sec = sectionMap[secKey];
  md += `### [${sec.title}](#${getAnchor(sec.title)})\n\n`;
  for (const group of sec.groups) {
    group.files.sort();
    md += `#### ${group.title} (${group.files.length} arquivos)\n\n`;
    group.files.forEach((f) => {
      md += `${globalFileCounter++}. [\`${f}\`](#${getAnchor(f)})\n`;
    });
    md += '\n';
  }
}

md += '---\n\n';

for (const secKey of ['logic', 'front']) {
  const sec = sectionMap[secKey];
  const secAnchor = getAnchor(sec.title);
  
  md += `# ${sec.title}\n\n`;
  md += `<a id="${secAnchor}"></a>\n\n`;
  md += `*${sec.description}*\n\n`;
  md += '---\n\n';

  for (const group of sec.groups) {
    md += `## ${group.title}\n\n`;
    md += '---\n\n';

    for (const f of group.files) {
      const fileAnchor = getAnchor(f);
      const lang = getLang(f);
      const code = fs.readFileSync(f, 'utf8');
      
      md += `### Arquivo: \`${f}\`\n\n`;
      md += `<a id="${fileAnchor}"></a>\n\n`;
      md += `\`\`\`${lang}\n`;
      md += code.endsWith('\n') ? code : code + '\n';
      md += `\`\`\`\n\n`;
      md += '---\n\n';
    }
  }
}

const outputPath = path.resolve('ARQUIVOS_PRINCIPAIS_LOGICA_E_FRONT.md');
fs.writeFileSync(outputPath, md, 'utf8');
console.log('Successfully written:', outputPath);
console.log(`Summary: ${totalLogicCount} Logic files + ${totalFrontCount} Front files = ${totalLogicCount + totalFrontCount} total files.`);
console.log('Total file size:', (fs.statSync(outputPath).size / 1024 / 1024).toFixed(2), 'MB');
