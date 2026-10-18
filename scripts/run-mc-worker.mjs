import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

async function run() {
  const argv = process.argv.slice(2);
  const paramsPath = argv[0];
  const sims = Number(argv[1] || 0);
  if (!paramsPath) {
    console.error('Usage: node run-mc-worker.mjs <params.json> <simulations>');
    process.exit(2);
  }
  try {
    const params = JSON.parse(fs.readFileSync(paramsPath, 'utf8'));
    const modPath = path.resolve(process.cwd(), 'src/engine/monteCarlo.js');
    const mod = await import(pathToFileURL(modPath).href);
    const result = mod.runMonteCarloAnalysis({ ...params, simulations: sims });
    console.log(JSON.stringify({ ok: true, result }));
  } catch (err) {
    console.log(JSON.stringify({ ok: false, error: String(err) }));
    process.exit(1);
  }
}

run();
