const fs = require('fs');
const path = require('path');

const files = [
  "src/utils/coachLogic.js",
  "src/utils/coachAdaptive.js",
  "src/utils/coachCausal.js",
  "src/utils/coachFeatures.js",
  "src/utils/coachOptimizer.js",
  "src/utils/coachSafe.js",
  "src/utils/coachText.js",
  "src/utils/adaptiveMath.js",
  "src/engine/probabilistic/stateSpace.js",
  "src/engine/probabilistic/volatility.js",
  "src/engine/probabilistic/knowledgeGraph.js",
  "src/engine/evaluation/coachEvaluator.js",
  "src/engine/orchestrator/coachOrchestrator.js",
  "src/llm/coachLLMIntegration.js",
  "src/hooks/useCoachControlCenter.js",
  "src/components/coach/CoachMenuNav.jsx",
  "src/components/coach/CoachControlCenter.jsx",
  "src/components/AICoachWidget.jsx",
  "src/components/AICoachView.jsx",
  "src/components/AICoachPlanner.jsx",
  "src/pages/Coach.jsx"
];

const outputFile = path.join(__dirname, 'coach_menu_ai_atualizado_final.md');
let markdownContent = '# Código Completo do Coach AI (Atualizado e Refatorado)\n\n';

for (let i = 0; i < files.length; i++) {
  const file = files[i];
  const filePath = path.join(__dirname, file);
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const ext = path.extname(file).slice(1);
    markdownContent += `## 📄 ARQUIVO ${i + 1}/${files.length} — \`${file}\`\n\n`;
    markdownContent += '```' + (ext === 'jsx' ? 'jsx' : 'javascript') + '\n';
    markdownContent += content;
    markdownContent += '\n```\n\n---\n\n';
    console.log(`✔ Adicionado: ${file}`);
  } catch (err) {
    console.error(`❌ Erro ao ler: ${file}`, err.message);
  }
}

fs.writeFileSync(outputFile, markdownContent, 'utf8');
console.log(`\n✅ Arquivo gerado com sucesso em: ${outputFile}`);
