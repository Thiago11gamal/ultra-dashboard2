import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const viteBin = './node_modules/.bin/vite';
if (!existsSync(viteBin)) {
  console.log('[build:safe] vite não encontrado. Pulando build.');
  process.exit(0);
}
const r = spawnSync(viteBin, ['build'], { stdio: 'inherit', shell: process.platform === 'win32' });
process.exit(r.status ?? 1);
