import { promises as fs } from 'fs';
import path from 'path';

console.log('🔍 Executing Round 26 Verification...');

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
        file: 'src/components/Header.jsx',
        checks: [
            { expected: "user = { name: 'Visitante', avatar: '👤', xp: 0, level: 1 }", desc: 'Header User Default Prop (Bug 82)' },
            { expected: 'contests = {}', desc: 'Header Contests Default Prop (Bug 82)' }
        ]
    },
    {
        file: 'src/engine/stats.js',
        checks: [
            { expected: 'Number(h.score) || 0', desc: 'Stats Numeric Parsing (Bug 84)' }
        ]
    },
    {
        file: 'test_projection.js',
        checks: [
            { expected: 'Test 6: String Handling', desc: 'Projection Test String Handling (Bug 83)' },
            { expected: 'Test 7: Empty History', desc: 'Projection Test Empty History (Bug 83)' }
        ]
    }
];

(async () => {
    for (const v of validations) {
        await checkFileContent(v.file, v.checks);
    }
    if (errors === 0) console.log('\n✨ ALL ROUND 26 CHECKS PASSED.');
    else console.log(`\n⚠️ FOUND ${errors} ISSUES.`);
})();
