import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolveStatus } from './lib/evolutionE2E.js';

const isWin = process.platform === 'win32';
const cliPath = isWin ? 'node_modules\\.bin\\playwright.cmd' : './node_modules/.bin/playwright';

if (!existsSync(cliPath)) {
  console.log('[evolution-e2e] Playwright não encontrado em node_modules. Pulando smoke test.');
  process.exit(0);
}

const result = spawnSync(cliPath, ['test', 'e2e/evolution-smoke.spec.js', '--project=chromium'], {
  shell: process.platform === 'win32',
  encoding: 'utf8',
});

const out = `${result.stdout || ''}${result.stderr || ''}`;
if (out.trim()) process.stdout.write(out);

if (result.error) {
  console.error('[evolution-e2e] Falha ao executar Playwright:', result.error.message);
}

const status = resolveStatus({ status: result.status, error: result.error, output: out });
if ((result.status ?? 1) !== 0 && status === 0) {
  console.warn('[evolution-e2e] Browser do Playwright não está instalado neste ambiente. Pulando E2E sem falhar o pipeline.');
}

process.exit(status);
