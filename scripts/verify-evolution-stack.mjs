import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const isWin = process.platform === 'win32';
const bin = (name) => isWin ? `./node_modules/.bin/${name}.cmd` : `./node_modules/.bin/${name}`;

const requiredBins = [bin('vitest'), bin('eslint'), bin('vite')];

const missing = requiredBins.filter((p) => !existsSync(p));
if (missing.length) {
  console.error('[verify:evolution] Dependências ausentes para validação estrita:');
  missing.forEach((m) => console.error(` - ${m}`));
  console.error('[verify:evolution] Execute `npm ci` e rode novamente.');
  process.exit(1);
}

const npmCmd = isWin ? 'npm.cmd' : 'npm';
const commands = [
  [npmCmd, ['run', 'test:evolution-all']],
  [npmCmd, ['run', 'lint']],
  [npmCmd, ['run', 'build']],
  [npmCmd, ['run', 'test:evolution-e2e']],
];

for (const [cmd, args] of commands) {
  const result = spawnSync(cmd, args, { stdio: 'inherit', shell: true });
  if ((result.status ?? 1) !== 0) process.exit(result.status ?? 1);
}

console.log('[verify:evolution] Validação completa concluída com sucesso.');
