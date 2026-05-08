import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const cliPath = './node_modules/.bin/playwright';

if (!existsSync(cliPath)) {
  console.log('[evolution-e2e] Playwright não encontrado em node_modules. Pulando smoke test.');
  process.exit(0);
}

const result = spawnSync(cliPath, ['test', 'e2e/evolution-smoke.spec.js', '--project=chromium'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

if (result.error) {
  console.error('[evolution-e2e] Falha ao executar Playwright:', result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
