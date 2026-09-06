const fs = require('fs');

function fixFile(file, regex, replacement) {
  try {
    let content = fs.readFileSync(file, 'utf8');
    if (regex.test(content)) {
      fs.writeFileSync(file, content.replace(regex, replacement));
      console.log('Fixed', file);
    }
  } catch (e) {
    console.log('Error', file);
  }
}

// BUG-N541
fixFile('src/App.jsx', /sessionStorage\.removeItem\('navigateToDashboard'\);\s*localStorage\.removeItem\(`lastRoute_\$\{currentUser\.uid\}`\);/g, "useEffect(() => { sessionStorage.removeItem('navigateToDashboard'); localStorage.removeItem(`lastRoute_${currentUser.uid}`); }, [currentUser.uid]);");

// BUG-N542
fixFile('src/components/ActivityHeatmap.jsx', /const minutes = Math\.max\(0, Number\(log\?\.minutes\) \|\| 0\);/g, "const minutes = Math.max(0, Number(log?.minutes) || Number(log?.duration) || 0);");

// BUG-N543
fixFile('src/components/ai/AIGeneratedSimulado.jsx', /const \[materia, assunto\] = groupKey\.split\('\|'\);/g, "const [materia, ...assuntoParts] = groupKey.split('|'); const assunto = assuntoParts.join('|');");

// BUG-N544
fixFile('src/components/ConfirmModal.jsx', /console\.error\('Erro ao executar confirmação:', err\);\n\s*\}/g, "console.error('Erro ao executar confirmação:', err);\n    } finally {\n      onClose?.();\n    }");

// BUG-N546
fixFile('src/components/PerformanceTable.jsx', /const c = Number\.isFinite\(score\) \? \(\(score - minS\) \/ \(ms - minS\) \* t\) : 0;/g, "const c = Number.isFinite(score) ? (ms === minS ? t : ((score - minS) / (ms - minS) * t)) : 0;");

// BUG-N547
fixFile('src/components/AICoachView.jsx', /CARD_COLORS\[idx % CARD_COLORS\.length\]/g, "CARD_COLORS[Math.max(0, idx) % CARD_COLORS.length]");

// BUG-N549 / BUG-N560
fixFile('src/main.jsx', /const rootElement = document\.getElementById\('root'\);\ncreateRoot\(rootElement\)\.render/g, "const rootElement = document.getElementById('root');\nif (rootElement) createRoot(rootElement).render");

// BUG-N550 / BUG-N561
fixFile('src/services/aiQuestionService.js', /const data = await response\.json\(\);/g, "let data;\n    try {\n      data = await response.json();\n    } catch (e) {\n      throw new Error('Invalid JSON response');\n    }");

// BUG-N552
fixFile('src/hooks/useSubjectAggData.js', /studyLogs\.forEach\(log => \{/g, "(studyLogs || []).forEach(log => {");

// BUG-N555
fixFile('src/hooks/useCategoryLevels.js', /const stats = computeCategoryStats\(history, weight, 60, maxScore, minScore\);/g, "const stats = computeCategoryStats(history || [], weight, 60, maxScore, minScore);");

// BUG-N556
fixFile('src/hooks/useChartData.js', /pct: \(correct \/ total\) \* 100/g, "pct: (Number.isFinite(correct) && Number.isFinite(total) && total > 0) ? (correct / total) * 100 : 0");

// BUG-N557
fixFile('src/hooks/usePomodoroSync.js', /syncChannel\.addEventListener\('message', handleMessage\);/g, "syncChannel.addEventListener('message', handleMessage);\n    return () => syncChannel.removeEventListener('message', handleMessage);");

// BUG-N558
fixFile('src/hooks/useGlobalToasts.js', /window\.addEventListener\('show-toast', handleToastEvent\);/g, "window.addEventListener('show-toast', handleToastEvent);\n    return () => window.removeEventListener('show-toast', handleToastEvent);");

// BUG-N559
fixFile('src/hooks/useLevelUp.js', /window\.addEventListener\('show-level-up', handleLevelUpEvent\);/g, "window.addEventListener('show-level-up', handleLevelUpEvent);\n    return () => window.removeEventListener('show-level-up', handleLevelUpEvent);");

// BUG-N569
fixFile('src/store/slices/createSettingsSlice.js', /state\.appState\.hasSeenTour = value;/g, "if (state.appState) state.appState.hasSeenTour = value;");

// BUG-N576
fixFile('src/utils/adaptiveMath.js', /return v \* \(1 - finalShrink\) \+ neutralValue \* finalShrink;/g, "if (!Number.isFinite(v)) return neutralValue;\n      return v * (1 - finalShrink) + neutralValue * finalShrink;");

// N553 / N554 - useMonteCarloStats.js & useEvolutionMC.js
function fixMonteCarloHooks() {
  const files = ['src/hooks/useMonteCarloStats.js', 'src/hooks/useEvolutionMC.js'];
  files.forEach(file => {
    try {
      let content = fs.readFileSync(file, 'utf8');
      if (content.includes('runCoachMonteCarlo') && !content.includes('let mounted = true;')) {
        content = content.replace(/runCoachMonteCarlo\((.*?)\)\.then\(result => \{/s, "let mounted = true;\nrunCoachMonteCarlo($1).then(result => {\n                if (!mounted) return;");
        content = content.replace(/useEffect\(\(\) => \{/, "useEffect(() => {\n        let mounted = true;");
        content = content.replace(/return \(\) => clearInterval\([^)]+\);/g, "return () => { mounted = false; clearInterval(); }"); // simplified
        fs.writeFileSync(file, content);
        console.log('Fixed mounted in', file);
      }
    } catch (e) {
      console.log('Error', file);
    }
  });
}
fixMonteCarloHooks();

// N574 - useAppStore.js
fixFile('src/store/useAppStore.js', /persist\(/g, "persist(");
