import { spawnSync } from 'node:child_process';

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const checks = [
  ['run', 'test:coach-unit'],
  ['run', 'test:coach-integration'],
];

for (const args of checks) {
  const out = spawnSync(npmCmd, args, { stdio: 'inherit', shell: false });
  if ((out.status ?? 1) !== 0) {
    throw new Error(`Coach suite failed at: npm ${args.join(' ')}`);
  }
}

console.log('Coach suite checks passed');
