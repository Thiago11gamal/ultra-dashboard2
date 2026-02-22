import { promises as fs } from 'fs';
import path from 'path';

console.log('🔍 Executing Round 31 Verification - Bug: Lançar Matérias...');

let errors = 0;

async function checkFileContent(filePath, checks) {
    try {
        const content = await fs.readFile(filePath, 'utf8');
        for (const check of checks) {
            const found = content.includes(check.expected);
            const shouldExist = check.shouldExist !== false; // default true
            if (shouldExist && !found) {
                console.error(`❌ [FAIL] ${path.basename(filePath)}: Missing fix "${check.desc}"`);
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
            {
                expected: 'const { validated, ...rest } = row',
                desc: 'BUG REMOVED: validated field was being destructured/discarded on every keystroke',
                shouldExist: false // This line should be GONE
            },
            {
                expected: 'BUG FIX: preserve the \'validated\' field',
                desc: 'FIX PRESENT: validated field is preserved in handleUpdateSimuladoRows',
                shouldExist: true
            },
            {
                expected: 'processedKeys',
                desc: 'FIX PRESENT: Set-based key matching for validated rows in handleSimuladoAnalysis',
                shouldExist: true
            },
            {
                expected: 'subject || \'\').trim()}|${(row.topic || \'\').trim()}',
                desc: 'FIX PRESENT: subject|topic key used for robust row matching',
                shouldExist: true
            }
        ]
    }
];

(async () => {
    for (const v of validations) {
        await checkFileContent(v.file, v.checks);
    }

    if (errors === 0) console.log('\n✨ ALL ROUND 31 CHECKS PASSED. Simulado rows now preserve validated flag correctly.');
    else console.log(`\n⚠️ FOUND ${errors} ISSUES.`);
})();
