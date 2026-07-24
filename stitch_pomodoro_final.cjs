const fs = require('fs');
const transcriptPath = 'C:/Users/antun.BOOK-201QO8FPFE/.gemini/antigravity-ide/brain/b2842dac-dbdb-4741-a325-e5a46ac280a5/.system_generated/logs/transcript_full.jsonl';
const logs = fs.readFileSync(transcriptPath, 'utf8').split('\n').filter(Boolean).map(JSON.parse);

let chunk1 = '';
let chunk2 = '';

logs.forEach(log => {
  if (log.type === 'USER_INPUT' && log.content.includes('Substitua todo o conteúdo do arquivo src/pages/Pomodoro.jsx')) {
    chunk1 = log.content;
  }
  if (log.type === 'USER_INPUT' && log.content.includes('if (normalized === \'dashboard\' || normalized === \'dashboard_selector\')')) {
    chunk2 = log.content;
  }
});

if(chunk1 && chunk2) {
    const p1 = chunk1.substring(chunk1.indexOf('import { PageErrorBoundary }'));
    // We want chunk 1 up to right before "if (normalized === 'dashboard' || normalize"
    // So we split at that string and take the first part
    const code1 = p1.split('if (normalized === \'dashboard\' || normalize')[0].trimEnd();
    
    // Chunk 2 starts with "    if (normalized === 'dashboard' || normalized === 'dashboard_selector') {"
    const startString = '    if (normalized === \'dashboard\' || normalized === \'dashboard_selector\') {';
    const code2 = chunk2.substring(chunk2.indexOf(startString), chunk2.lastIndexOf('</USER_REQUEST>'));
    
    // Clean up the end of code2 in case of stray characters like "ess?"
    const finalCode2 = code2.substring(0, code2.lastIndexOf('}') + 1).trim();

    const finalResult = code1 + '\n' + finalCode2 + '\n';
    fs.writeFileSync('src/pages/Pomodoro.jsx', finalResult);
    console.log('Success! Stitched length: ', finalResult.length);
} else {
    console.log('Chunks not found.');
}
