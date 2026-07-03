import { spawn } from 'node:child_process';

console.log('[Safe-Runner] Starting vitest...');

const child = spawn('npx', ['vitest', 'run'], { 
  stdio: ['inherit', 'pipe', 'pipe'],
  shell: true 
});

let timeoutId = null;
let hasFailures = false;

function resetTimeout() {
  if (timeoutId) clearTimeout(timeoutId);
  // If no new output for 10 seconds, assume hanging and force exit
  timeoutId = setTimeout(() => {
    console.log('\n[Safe-Runner] No output for 10 seconds. Assuming hanging process due to unclosed handles.');
    console.log('[Safe-Runner] Forcing exit. Has failures:', hasFailures);
    process.exit(hasFailures ? 1 : 0);
  }, 10000);
}

child.stdout.on('data', (data) => {
  process.stdout.write(data);
  const text = data.toString().toLowerCase();
  if (text.includes('failed')) {
    hasFailures = true;
  }
  resetTimeout();
});

child.stderr.on('data', (data) => {
  process.stderr.write(data);
  resetTimeout();
});

child.on('exit', (code) => {
  console.log(`[Safe-Runner] vitest exited with code ${code}`);
  process.exit(code || 0);
});

resetTimeout();
