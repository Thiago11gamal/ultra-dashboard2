import { promises as fs } from 'fs';
import path from 'path';

console.log('🔍 Executing Round 27 Verification...');

let errors = 0;

async function checkFileContent(filePath, checks) {
    try {
        const content = await fs.readFile(filePath, 'utf8');
        for (const check of checks) {
            if (!content.includes(check.expected)) {
                console.error(`❌ [FAIL] ${path.basename(filePath)}: Missing fix "${check.desc}"`);
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
        file: 'src/context/AuthContext.jsx',
        checks: [
            { expected: 'animate-spin', desc: 'Auth Loading Spinner (Bug 85)' },
            { expected: '<div className="w-8 h-8', desc: 'Auth Loading UI (Bug 85)' }
        ]
    },
    {
        file: 'src/components/SimuladoAnalysis.jsx',
        checks: [
            { expected: 'if (currentTotal > 0 && val > currentTotal) finalValue = currentTotal;', desc: 'Simulado Correct Clamp (Bug 86)' },
            { expected: 'if (val < currentCorrect)', desc: 'Simulado Total Validation (Bug 86)' }
        ]
    }
];

(async () => {
    for (const v of validations) {
        await checkFileContent(v.file, v.checks);
    }
    if (errors === 0) console.log('\n✨ ALL ROUND 27 CHECKS PASSED.');
    else console.log(`\n⚠️ FOUND ${errors} ISSUES.`);
})();
