import { spawnSync } from 'node:child_process';

const isWin = process.platform === 'win32';
const npxCmd = isWin ? 'npx.cmd' : 'npx';
const r = spawnSync(npxCmd, ['vite', 'build'], { stdio: 'inherit', shell: isWin });
process.exit(r.status ?? 1);
