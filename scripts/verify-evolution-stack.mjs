import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const requiredBins = [
  './node_modules/.bin/vitest',
  './node_modules/.bin/eslint',
  './node_modules/.bin/vite',
];

const missing = requiredBins.filter((p) => !existsSync(p));
if (missing.length) {
  console.error('[verify:evolution] Dependências ausentes para validação estrita:');
  missing.forEach((m) => console.error(` - ${m}`));
  console.error('[verify:evolution] Execute `npm ci` e rode novamente.');
  process.exit(1);
}

const commands = [
  ['npm', ['run', 'test:evolution-all']],
  ['npm', ['run', 'lint']],
  ['npm', ['run', 'build']],
  ['npm', ['run', 'test:evolution-e2e']],
];

for (const [cmd, args] of commands) {
  const result = spawnSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  if ((result.status ?? 1) !== 0) process.exit(result.status ?? 1);
}

console.log('[verify:evolution] Validação completa concluída com sucesso.');
