const fs = require('fs');
const file = 'd:/Downloads/ultra-patched/src/engine/insightGenerator.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'details: `Melhor dia: **${DAY_NAMES_SINGULAR[best.dow]}** (${best.pct.toFixed(1)}%, ${best.total}q). !!Pior:',
  'details: `++Melhor dia: **${DAY_NAMES_SINGULAR[best.dow]}** (${best.pct.toFixed(1)}%, ${best.total}q).++ !!Pior:'
);
content = content.replace(
  'advice: "Alinhe seus simulados mais densos ao dia de melhor rendimento."',
  'advice: "Alinhe seus simulados mais densos ao dia de ++melhor rendimento++."'
);
content = content.replace(
  'Células verdes indicam desempenho acima da meta',
  'Células verdes indicam desempenho ++acima da meta++'
);
content = content.replace(
  'title: "Consistência Sólida"',
  'title: "++Consistência Sólida++"'
);
content = content.replace(
  'text: `Variação mínima de ${maxSwing.toFixed(0)}${unit}.`',
  'text: `++Variação mínima de ${maxSwing.toFixed(0)}${unit}.++`'
);
content = content.replace(
  'title: "Alta Precisão Bayesiana"',
  'title: "++Alta Precisão Bayesiana++"'
);
content = content.replace(
  'advice: "Convergência máxima do algoritmo."',
  'advice: "++Convergência máxima++ do algoritmo."'
);
content = content.replace(
  'Se a linha estiver subindo',
  'Se a linha estiver ++subindo++'
);
content = content.replace(
  'title: "Conhecimento Consolidado"',
  'title: "++Conhecimento Consolidado++"'
);
content = content.replace(
  'text: `Desempenho muito acima da média.`',
  'text: `Desempenho ++muito acima da média++.`'
);
content = content.replace(
  'title: "Rendimento de Mestre"',
  'title: "++Rendimento de Mestre++"'
);
content = content.replace(
  'text: `Operando na zona de máxima eficiência.`',
  'text: `Operando na zona de ++máxima eficiência++.`'
);

fs.writeFileSync(file, content);
console.log('Replaced successfully.');
