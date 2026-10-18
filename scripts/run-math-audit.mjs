import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const commands = [
  ['node', ['scripts/test-math-engines.mjs']],
  ['node', ['scripts/test-math-rigorous.mjs']],
  ['node', ['scripts/test-bootstrap-ci.mjs']],
  ['node', ['scripts/test-math-integration.mjs']],
];

const startedAt = new Date().toISOString();
const results = [];

for (const [cmd, args] of commands) {
  const r = spawnSync(cmd, args, { encoding: 'utf8' });
  results.push({
    command: `${cmd} ${args.join(' ')}`,
    status: r.status ?? 1,
    ok: (r.status ?? 1) === 0,
    stdout: (r.stdout || '').slice(0, 6000),
    stderr: (r.stderr || '').slice(0, 3000),
  });
}

const report = {
  startedAt,
  finishedAt: new Date().toISOString(),
  ok: results.every(r => r.ok),
  results,
};

fs.mkdirSync('docs/reports', { recursive: true });
const path = `docs/reports/math-audit-${startedAt.replace(/[:.]/g, '-')}.json`;
fs.writeFileSync(path, JSON.stringify(report, null, 2));

console.log(`Math audit report: ${path}`);
for (const r of results) {
  console.log(`${r.ok ? 'PASS' : 'FAIL'} - ${r.command}`);
}

if (!report.ok) process.exit(1);
