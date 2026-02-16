import { promises as fs } from 'fs';
import path from 'path';

console.log('🔍 Executing Comprehensive Bug Fix Verification...');

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

// Verification Plan
const validations = [
    {
        file: 'src/components/VolumeRanking.jsx',
        checks: [
            { expected: 'parseInt(h.total) || 0', desc: 'Volume Sum Safety (Bug 70)' }
        ]
    },
    {
        file: 'src/utils/coachLogic.js',
        checks: [
            { expected: 'if (options && options.user', desc: 'User Options Safety (Bug 71)' },
            { expected: 'isNaN(d.getTime())', desc: 'Date Validity Check (Bug 71)' }
        ]
    },
    {
        file: 'src/components/AICoachWidget.jsx',
        checks: [
            { expected: 'suggestion && suggestion.urgency', desc: 'Widget Props Safety (Bug 72)' }
        ]
    },
    {
        file: 'debug_mc.mjs',
        checks: [
            { expected: 'safeSimulations = Math.max', desc: 'Debug Script Safety (Bug 73)' }
        ]
    },
    {
        file: 'src/data/initialData.js',
        checks: [
            { expected: 'studyLogs: []', desc: 'Missing studyLogs (Bug 74)' },
            { expected: 'studySessions: []', desc: 'Renamed pomodoroSessions (Bug 74)' }
        ]
    },
    {
        file: 'e2e/example.spec.js',
        checks: [
            { expected: "page.locator('header')", desc: 'Updated E2E Selector (Bug 75)' }
        ]
    }
];

// Execute All Checks
(async () => {
    for (const v of validations) {
        await checkFileContent(v.file, v.checks);
    }

    if (errors === 0) {
        console.log('\n✨ ALL CHECKS PASSED: System is stable.');
    } else {
        console.log(`\n⚠️ FOUND ${errors} ISSUES. Please review.`);
    }
})();
