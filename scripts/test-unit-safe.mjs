import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const vitestBin = './node_modules/.bin/vitest';
if (!existsSync(vitestBin)) {
  console.log('[test:unit:safe] vitest não encontrado. Pulando testes unitários.');
  process.exit(0);
}
const r = spawnSync(vitestBin, ['run'], { stdio: 'inherit', shell: process.platform === 'win32' });
process.exit(r.status ?? 1);
