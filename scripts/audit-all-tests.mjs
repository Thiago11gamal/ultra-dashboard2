import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

function walk(dir) {
  let files = [];
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (f === 'node_modules' || f === '.git' || f === 'dist' || f === 'e2e') continue;
    if (fs.statSync(full).isDirectory()) files = files.concat(walk(full));
    else if (f.endsWith('.test.js') || f.endsWith('.test.jsx') || f.endsWith('.spec.js')) files.push(full);
  }
  return files;
}

const tests = walk('tests').concat(walk('src'));
console.log(`Found ${tests.length} test files to verify.`);

const passed = [];
const failed = [];
const hangs = [];

for (let i = 0; i < tests.length; i++) {
  const t = tests[i];
  const relative = path.relative(process.cwd(), t);
  const start = Date.now();
  try {
    execSync(`npx vitest run "${relative}" --reporter=dot`, {
      timeout: 45000,
      stdio: 'pipe',
      env: { ...process.env, CI: 'true' }
    });
    const dur = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`[${i + 1}/${tests.length}] PASS: ${relative} (${dur}s)`);
    passed.push({ file: relative, dur });
  } catch (err) {
    const dur = ((Date.now() - start) / 1000).toFixed(1);
    const isTimeout = err.code === 'ETIMEDOUT' || err.signal === 'SIGTERM';
    if (isTimeout) {
      console.error(`[${i + 1}/${tests.length}] HANG/TIMEOUT: ${relative} (${dur}s)`);
      hangs.push({ file: relative, error: 'TIMEOUT > 45s' });
    } else {
      console.error(`[${i + 1}/${tests.length}] FAIL: ${relative} (${dur}s)`);
      const output = err.stdout?.toString() || err.stderr?.toString() || err.message;
      failed.push({ file: relative, output: output.slice(-500) });
    }
  }
}

console.log('\n================ SUMMARY ================');
console.log(`Total: ${tests.length} | Passed: ${passed.length} | Failed: ${failed.length} | Hangs: ${hangs.length}`);

fs.writeFileSync('test_audit_results.json', JSON.stringify({ passed, failed, hangs }, null, 2), 'utf8');
