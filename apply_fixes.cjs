const fs = require('fs');
let changed = 0;
function update(file, replacer) {
  if (!fs.existsSync(file)) return;
  let text = fs.readFileSync(file, 'utf8');
  let newText = replacer(text);
  if (text !== newText) {
    fs.writeFileSync(file, newText);
    console.log('Updated:', file);
    changed++;
  }
}

// BUG-N700/777
update('src/components/PerformanceTable.jsx', t => 
  t.replace(/const c = Number\.isFinite\(score\)\s*\?\s*\(\(score - minS\) \/ \(ms - minS\) \* t\) : 0;/, 
    'const c = Number.isFinite(score) && (ms - minS) !== 0 ? ((score - minS) / (ms - minS) * t) : 0;')
);

// BUG-N701/778
update('src/components/AICoachView.jsx', t => 
  t.replace(/CARD_COLORS\[idx % CARD_COLORS\.length\]/g, 'CARD_COLORS[Math.max(0, idx) % CARD_COLORS.length]')
);

// BUG-N702/779/748
update('src/utils/coachText.js', t => 
  t.replace(/action = bracketMatch\[2\]\.trim\(\);/g, 'action = bracketMatch[2]?.trim() || "";')
);

// BUG-N704/781/792
update('src/services/aiQuestionService.js', t => 
  t.replace(/const data = await response\.json\(\);/, 'let data; try { data = await response.json(); } catch(e) { throw new Error("Invalid JSON"); }')
);

// BUG-N705/744/782
update('src/utils/coachPipeline.js', t => 
  t.replace(/return runCoachOrchestrator\((\w+)\);/, 'return runCoachOrchestrator($1) || null;')
);

// BUG-N706/783
update('src/hooks/useSubjectAggData.js', t => 
  t.replace(/studyLogs\.forEach\(/g, '(studyLogs || []).forEach(')
);

// BUG-N707/784
update('src/hooks/useMonteCarloStats.js', t => 
  t.replace(/runCoachMonteCarlo\(\{([\s\S]*?)\}\)\.then\(result => \{/g, 
    'let isMounted = true;\n    runCoachMonteCarlo({$1}).then(result => {\n      if (!isMounted) return;')
   .replace(/return \(\) => clearInterval\(interval\);/g, 'return () => {\n      isMounted = false;\n      clearInterval(interval);\n    };')
);

// BUG-N708/785
update('src/hooks/useEvolutionMC.js', t => 
  t.replace(/runCoachMonteCarlo\(\{([\s\S]*?)\}\)\.then\(result => \{/g, 
    'let isMounted = true;\n    runCoachMonteCarlo({$1}).then(result => {\n      if (!isMounted) return;')
   .replace(/return \(\) => clearInterval\(interval\);/g, 'return () => {\n      isMounted = false;\n      clearInterval(interval);\n    };')
);

// BUG-N709/786
update('src/hooks/useCategoryLevels.js', t => 
  t.replace(/const stats = computeCategoryStats\(history, weight/g, 'const stats = computeCategoryStats(history || [], weight')
);

// BUG-N710/787
update('src/hooks/useChartData.js', t => 
  t.replace(/pct: total > 0 \? Math\.round\(\(correct \/ total\) \* 100\) : 0/g, 'pct: (total > 0 && Number.isFinite(correct) && Number.isFinite(total)) ? Math.round((correct / total) * 100) : 0')
);

// BUG-N711/788
update('src/hooks/usePomodoroSync.js', t => 
  t.replace(/syncChannel\.addEventListener\('message', handleMessage\);([\s\S]*?)\}\);/g, 'syncChannel.addEventListener("message", handleMessage);\n    $1\n    return () => syncChannel.removeEventListener("message", handleMessage);\n  });')
);

// BUG-N712/789
update('src/hooks/useGlobalToasts.js', t => 
  t.replace(/window\.addEventListener\('show-toast', handleToastEvent\);([\s\S]*?)\}, \[\]\);/g, 'window.addEventListener("show-toast", handleToastEvent);\n    $1\n    return () => window.removeEventListener("show-toast", handleToastEvent);\n  }, []);')
);

// BUG-N713/790
update('src/hooks/useLevelUp.js', t => 
  t.replace(/window\.addEventListener\('show-toast', handleToastEvent\);([\s\S]*?)\}, \[\]\);/g, 'window.addEventListener("show-toast", handleToastEvent);\n    $1\n    return () => window.removeEventListener("show-toast", handleToastEvent);\n  }, []);')
);

// BUG-N723/800
update('src/store/slices/createSettingsSlice.js', t => 
  t.replace(/state\.appState\.hasSeenTour = value;/g, 'if (state.appState) state.appState.hasSeenTour = value;')
);

// BUG-N730
update('src/utils/adaptiveMath.js', t => 
  t.replace(/const v = Number\(value\) \|\| 0;/g, 'const v = Number.isFinite(Number(value)) ? Number(value) : 0;')
);

// BUG-N741
update('src/utils/coachLogic.js', t => 
  t.replace(/weakestTopic: getWeakestTopic\(top, simulados, maxScore\)/g, 'weakestTopic: getWeakestTopic(top, simulados, maxScore) || null')
);

// BUG-N756
update('src/utils/idGenerator.js', t => 
  t.replace(/return \`\$\{prefix\}-\$\{crypto\.randomUUID\(\)\}\`;/g, 'try { return `${prefix}-${crypto.randomUUID()}`; } catch (e) { return `${prefix}-${Math.random().toString(36).slice(2)}`; }')
);

// BUG-N757
update('src/utils/lazyRetry.js', t => 
  t.replace(/const component = await componentImport\(\);/g, 'const component = await componentImport();\n        if (!component) throw new Error("Component is undefined");')
);

// BUG-N764
update('src/utils/retentionCore.js', t => 
  t.replace(/value = value\.toNumber\(\);/g, 'try { value = value.toNumber(); } catch { value = 0; }')
);

// BUG-N769
update('src/utils/stableHash.js', t => 
  t.replace(/return JSON\.stringify\(value, function replacer\(key, val\) {/g, 'try {\n    return JSON.stringify(value, function replacer(key, val) {')
   .replace(/}\);/g, '});\n  } catch (e) {\n    return "";\n  }')
);

// BUG-N772
update('src/App.jsx', t => 
  t.replace(/sessionStorage\.removeItem\('navigateToDashboard'\);\n\s*localStorage\.removeItem\(\`lastRoute_\$\{currentUser\.uid\}\`\);/, '')
);

// BUG-N773
update('src/components/ActivityHeatmap.jsx', t => 
  t.replace(/const minutes = Math\.max\(0, Number\(log\?\.minutes\) \|\| 0\);/g, 'const minutes = Math.max(0, Number(log?.minutes) || Number(log?.duration) || 0);')
);

// BUG-N774
update('src/components/ai/AIGeneratedSimulado.jsx', t => 
  t.replace(/const \[materia, assunto\] = groupKey\.split\('\|'\);/g, 'const [materia, ...assuntoParts] = groupKey.split("|");\n    const assunto = assuntoParts.join("|");')
);

// BUG-N775
update('src/components/ConfirmModal.jsx', t => 
  t.replace(/console\.error\('Erro ao executar confirmação:', err\);/g, 'console.error("Erro ao executar confirmação:", err);\n      onClose?.();')
);

// BUG-N776 -> Actually we leave it for now unless we are sure about the exact fix (refactoring multiple clocks into a single clock provider is complex).
console.log('Total files updated:', changed);
