import { promises as fs } from 'fs';
import path from 'path';

console.log('🔍 Executing Round 28 Verification...');

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
        file: 'src/engine/bayesianEngine.js',
        checks: [
            { expected: 'priorVariance === 0', desc: 'Bayesian Div by Zero Guard (Bug 88)' },
            { expected: 'variance: priorVariance || 0', desc: 'Bayesian Variance Safety (Bug 88)' }
        ]
    },
    {
        file: 'src/components/NextGoalCard.jsx',
        checks: [
            { expected: "category.color || '#64748b'", desc: 'NextGoalCard Color Fallback (Bug 89)' },
            { expected: '.toLowerCase()', desc: 'NextGoalCard Priority Normalization (Bug 89)' }
        ]
    },
    {
        file: 'src/components/Checklist.jsx',
        checks: [
            { expected: 'safePriority = (task.priority || \'medium\').toLowerCase()', desc: 'Checklist Priority Normalization (Bug 90)' }
        ]
    }
];

(async () => {
    for (const v of validations) {
        await checkFileContent(v.file, v.checks);
    }
    if (errors === 0) console.log('\n✨ ALL ROUND 28 CHECKS PASSED.');
    else console.log(`\n⚠️ FOUND ${errors} ISSUES.`);
})();
