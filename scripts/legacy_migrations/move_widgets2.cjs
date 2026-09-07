const fs = require('fs');
const path = 'c:/Users/antun.BOOK-201QO8FPFE/Downloads/ultra-patched/ultra-patched/src/components/AICoachView.jsx';

const content = fs.readFileSync(path, 'utf8');

const target1 = '                {suggestedFocus ? (\\n                    <div className="w-full">\\n                        <AICoachWidget suggestion={suggestedFocus} onGenerateGoals={onGenerateGoals} loading={loading} />\\n                    </div>\\n                ) : (\\n                    <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.01] p-8 text-center">\\n                        <AlertCircle size={20} className="mx-auto mb-3 text-slate-600" />\\n                        <p className="text-sm font-semibold text-slate-400">Nenhum foco sugerido</p>\\n                        <p className="text-[10px] text-slate-500 mt-1">Recalcule a estratégia após novos simulados.</p>\\n                    </div>\\n                )}';

// Actually, let's just do dynamic line extraction instead of matching large strings which fails with CRLF vs LF.

const lines = content.split('\\n');

let startF = -1, endF = -1;
let startC = -1, endC = -1;
let targetT = -1;

for (let i=0; i<lines.length; i++) {
    if (lines[i].includes('                {suggestedFocus ? (')) startF = i;
    if (startF !== -1 && endF === -1 && lines[i].includes('Nenhum foco sugerido')) {
        // It ends a few lines after
        endF = i + 3;
    }

    if (lines[i].includes('            {calibrationSummary.length > 0 && (')) startC = i;
    if (startC !== -1 && endC === -1 && lines[i].includes('                            );')) {
        // It ends a few lines after
        endC = i + 5;
    }

    if (lines[i].includes('                        {systemAlerts.length > 0 && (')) targetT = i;
}

if (startF === -1 || endF === -1 || startC === -1 || endC === -1 || targetT === -1) {
    console.error("Could not find boundaries", {startF, endF, startC, endC, targetT});
    process.exit(1);
}

// Ensure endC points exactly to "            )}"
while (!lines[endC].includes('            )}')) {
    endC++;
    if (endC > lines.length) { console.error("Missing end of calib"); process.exit(1); }
}

const suggestedFocusBlock = lines.slice(startF, endF + 1);
const calibBlock = lines.slice(startC, endC + 1);

let newLines = [];
for (let i=0; i<lines.length; i++) {
    if (i >= startF && i <= endF) continue; // skip suggestedFocus
    if (i >= startC && i <= endC) continue; // skip calib

    if (i === targetT) {
        newLines.push('                        <div className="space-y-6 mb-8">');
        
        // Add suggestedFocus with 4 more spaces
        suggestedFocusBlock.forEach(l => {
            if (l.trim().length > 0) newLines.push('    ' + l);
            else newLines.push(l);
        });

        newLines.push('');

        // Add calib with 4 more spaces
        calibBlock.forEach(l => {
            if (l.trim().length > 0) newLines.push('    ' + l);
            else newLines.push(l);
        });

        newLines.push('                        </div>');
    }

    newLines.push(lines[i]);
}

fs.writeFileSync(path, newLines.join('\\n'));
console.log("Success");
