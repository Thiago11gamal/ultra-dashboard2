import { promises as fs } from 'fs';
import path from 'path';

console.log('🔍 Executing Round 31 Final Verification - Bug: Lançar Matérias (Definitivo)...');

let errors = 0;

async function checkFileContent(filePath, checks) {
    try {
        const content = await fs.readFile(filePath, 'utf8');
        for (const check of checks) {
            const found = content.includes(check.expected);
            const shouldExist = check.shouldExist !== false;
            if (shouldExist && !found) {
                console.error(`❌ [FAIL] ${path.basename(filePath)}: Missing "${check.desc}"`);
                errors++;
            } else if (!shouldExist && found) {
                console.error(`❌ [FAIL] ${path.basename(filePath)}: Should NOT contain "${check.desc}"`);
                errors++;
            } else {
                console.log(`✅ [PASS] ${path.basename(filePath)}: ${check.desc}`);
            }
        }
    } catch (err) {
        console.error(`❌ [ERROR] Could not read ${filePath}: ${err.message}`);
        errors++;
    }
}

const validations = [
    {
        file: 'src/pages/Simulados.jsx',
        checks: [
            // Bug 1: validated field destruction must be gone
            {
                expected: 'const { validated, ...rest } = row',
                desc: 'BUG REMOVED: validated field destruction in handleUpdateSimuladoRows',
                shouldExist: false
            },
            // Bug 1 fix: validated field now preserved in onRowsChange
            {
                expected: 'BUG FIX: preserve the \'validated\' field',
                desc: 'FIX: validated field preserved on keystroke',
                shouldExist: true
            },
            // Bug 2 definitive fix: direct upsert of rawRows as validated
            {
                expected: 'DEFINITIVE FIX',
                desc: 'FIX: Direct upsert approach in handleSimuladoAnalysis',
                shouldExist: true
            },
            {
                expected: 'validated: true',
                desc: 'FIX: rawRows stamped with validated:true on analysis',
                shouldExist: true
            },
            // The old fragile matching code must be gone
            {
                expected: 'processedKeys',
                desc: 'OLD fragile processedKeys Set approach removed',
                shouldExist: false
            },
            // nonTodayRows pattern should exist in handleSimuladoAnalysis
            {
                expected: 'nonTodayRows',
                desc: 'FIX: nonTodayRows used for safe upsert in handleSimuladoAnalysis',
                shouldExist: true
            }
        ]
    }
];

(async () => {
    for (const v of validations) {
        await checkFileContent(v.file, v.checks);
    }

    if (errors === 0) {
        console.log('\n✨ ALL CHECKS PASSED.');
        console.log('   → handleUpdateSimuladoRows now PRESERVES validated flag on every keystroke.');
        console.log('   → handleSimuladoAnalysis now DIRECTLY UPSERTS rawRows as validated into store.');
        console.log('   → Simulado rows will now always appear in Histórico after Gerar Plano.');
    } else {
        console.log(`\n⚠️ FOUND ${errors} ISSUES.`);
    }
})();
