import { promises as fs } from 'fs';
import path from 'path';

console.log('🔍 Executing Round 24 Verification...');

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
        file: 'src/engine/stats.js',
        checks: [
            { expected: 'if (!arr || !arr.length)', desc: 'Mean Null Check (Bug 76)' },
            { expected: 'if (!arr || arr.length < 2)', desc: 'StdDev Null Check (Bug 76)' }
        ]
    },
    {
        file: 'src/components/Login.jsx',
        checks: [
            { expected: "setError('');", desc: 'Clear Error on Input (Bug 78)' }
        ]
    }
];

(async () => {
    for (const v of validations) {
        await checkFileContent(v.file, v.checks);
    }
    if (errors === 0) console.log('\n✨ ALL ROUND 24 CHECKS PASSED.');
    else console.log(`\n⚠️ FOUND ${errors} ISSUES.`);
})();
