import { promises as fs } from 'fs';
import path from 'path';

console.log('🔍 Executing Round 25 Verification...');

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
        file: 'src/App.jsx',
        checks: [
            { expected: 'studyLogs: (prev.studyLogs || []).filter(l => l.categoryId !== categoryId)', desc: 'Delete Category Cleanup (Bug 79)' },
            { expected: 'coachPlan: (prev.coachPlan || []).filter(t => t.categoryId !== categoryId)', desc: 'Delete Coach Plan Cleanup (Bug 79)' }
        ]
    },
    {
        file: 'src/components/TopicPerformance.jsx',
        checks: [
            { expected: 'truncate max-w-[140px]', desc: 'Topic Name Truncation (Bug 80)' },
            { expected: '(t.name || "Sem Nome").trim()', desc: 'Topic Name Safety (Bug 80)' }
        ]
    }
];

(async () => {
    for (const v of validations) {
        await checkFileContent(v.file, v.checks);
    }
    if (errors === 0) console.log('\n✨ ALL ROUND 25 CHECKS PASSED.');
    else console.log(`\n⚠️ FOUND ${errors} ISSUES.`);
})();
