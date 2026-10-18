import os from 'os';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

function partition(total, parts) {
  const base = Math.floor(total / parts);
  const out = Array(parts).fill(base);
  let rem = total - base * parts;
  let i = 0;
  while (rem > 0) { out[i % parts]++; i++; rem--; }
  return out;
}

async function main() {
  const argv = process.argv.slice(2);
  const configPath = argv[0];
  let params = {};
  if (configPath) {
    try { params = JSON.parse(fs.readFileSync(configPath, 'utf8')); } catch (e) { console.error('Failed to read config JSON:', e); process.exit(2); }
  } else {
    params = { values: [60, 62, 65, 70, 72], dates: [] };
  }

  const totalSims = Number(process.env.MC_SIMULATIONS || params.simulations || 5000);
  const cpus = Math.max(1, Number(process.env.WORKERS || os.cpus().length || 2));
  const workersCount = Math.min(cpus, totalSims);
  const parts = partition(totalSims, workersCount);

  // Write params to a temporary file for workers to read
  const tmpParamsPath = path.resolve(process.cwd(), 'scripts', `mc-params-${Date.now()}.json`);
  fs.writeFileSync(tmpParamsPath, JSON.stringify(params));

  const promises = parts.map((sims) => {
    return new Promise((resolve) => {
      const child = spawn(process.execPath, [path.resolve(process.cwd(), 'scripts', 'run-mc-worker.mjs'), tmpParamsPath, String(sims)], { cwd: process.cwd(), env: process.env });
      let stdout = '';
      child.stdout.on('data', (d) => { stdout += d.toString(); });
      child.on('error', (err) => resolve({ ok: false, error: String(err) }));
      child.on('close', (code) => {
        try {
          const parsed = JSON.parse(stdout.trim() || '{}');
          resolve(parsed);
        } catch (e) {
          resolve({ ok: false, error: `worker parse error: ${e} stdout: ${stdout}`, code });
        }
      });
    });
  });

  const results = await Promise.all(promises);
  // Cleanup
  try { fs.unlinkSync(tmpParamsPath); } catch {}

  const successes = results.filter(r => r && r.ok).map(r => r.result).filter(Boolean);
  if (successes.length === 0) {
    console.error('All workers failed:', results);
    process.exit(3);
  }

  let totalN = 0;
  let weightedEmpiricalSum = 0;
  let analyticalWeighted = 0;
  for (const res of successes) {
    const n = Number(res.simulationCount || (res.diagnostics && res.diagnostics.simulationCount) || 0) || 0;
    totalN += n;
    weightedEmpiricalSum += (Number(res.empiricalProbabilityRaw || res.empiricalProbabilityBayes || res.probability || 0) * n);
    analyticalWeighted += (Number(res.analyticalProbability || 0) * n);
  }
  const combinedEmpirical = totalN > 0 ? (weightedEmpiricalSum / totalN) : 0;
  const combinedAnalytical = totalN > 0 ? (analyticalWeighted / totalN) : 0;

  const pHat = Math.max(0, Math.min(1, combinedEmpirical / 100));
  const empiricalStdErr = Math.sqrt(Math.max(1e-12, (pHat * (1 - pHat)) / Math.max(1, totalN))) * 100;

  const out = {
    simulationCount: totalN,
    empiricalProbabilityCombined: Number(combinedEmpirical.toFixed(6)),
    analyticalProbabilityCombined: Number(combinedAnalytical.toFixed(6)),
    empiricalStdErr: Number(empiricalStdErr.toFixed(6)),
    parts: successes.length,
    timestamp: new Date().toISOString()
  };

  const outPath = path.resolve(process.cwd(), 'scripts', 'mc-parallel-result.json');
  fs.writeFileSync(outPath, JSON.stringify({ meta: out, raw: successes }, null, 2));
  console.log('Wrote result to', outPath);
  console.log(JSON.stringify(out, null, 2));
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });

