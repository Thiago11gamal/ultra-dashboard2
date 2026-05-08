import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const result = spawnSync('npx', ['playwright', 'test', 'e2e/evolution-smoke.spec.js', '--project=chromium'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

if (result.error) {
  console.error('[evolution-e2e] Falha ao executar Playwright:', result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
