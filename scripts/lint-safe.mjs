import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const eslintBin = './node_modules/.bin/eslint';
const eslintJsPkg = './node_modules/@eslint/js/package.json';
if (!existsSync(eslintBin) || !existsSync(eslintJsPkg)) {
  console.log('[lint:safe] eslint/@eslint/js não encontrados. Pulando lint.');
  process.exit(0);
}
const r = spawnSync(eslintBin, ['.'], { stdio: 'inherit', shell: process.platform === 'win32' });
process.exit(r.status ?? 1);
