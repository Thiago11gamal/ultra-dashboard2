import { promises as fs } from 'fs';
import path from 'path';

console.log('🔍 Executing Round 30 Verification...');

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
        file: 'src/engine/projection.js',
        checks: [
            { expected: '0.9 + n / 15', desc: 'Relaxed History Boost (0.9)' },
            { expected: '45 * Math.log(1 + projectDays / 45)', desc: 'Relaxed Time Damping (45)' }
        ]
    }
];

(async () => {
    for (const v of validations) {
        await checkFileContent(v.file, v.checks);
    }

    if (errors === 0) console.log('\n✨ ALL ROUND 30 CHECKS PASSED.');
    else console.log(`\n⚠️ FOUND ${errors} ISSUES.`);
})();
