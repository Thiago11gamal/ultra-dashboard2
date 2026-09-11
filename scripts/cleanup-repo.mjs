#!/usr/bin/env node
/**
 * Script de sanitização do repositório.
 * Remove artefatos, duplicatas e arquivos gerados que não deveriam estar no source.
 * Execute ANTES de aplicar qualquer patch: node scripts/cleanup-repo.mjs
 */
import { rmSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

// ✅ FIX #8: Proteção contra execução em diretório errado
function isSafeToClean() {
  const markers = ['package.json', '.git', 'src', 'vite.config.js'];
  const hasMarkers = markers.filter(m => existsSync(m)).length >= 2;
  if (!hasMarkers) {
    console.error('❌ [CLEANUP] Diretório não parece ser o projeto. Abortando para segurança.');
    console.error('   Esperados: package.json, .git, src, vite.config.js');
    process.exit(1);
  }
}

isSafeToClean();

const targets = [
  'ultra-patched',
  'coverage',
  'playwright-report',
  'test-results',
  'script.js',
  'test_mc.js',
  'combine.cjs',
  'stitch.cjs',
];

const timestampPattern = /^vite\.config\.js\.timestamp-\d+\.mjs$/;

console.log('🧹 [CLEANUP] Iniciando sanitização do repositório...\n');

let removed = 0;

for (const target of targets) {
  if (existsSync(target)) {
    console.log(`   ❌ Removendo: ${target}`);
    rmSync(target, { recursive: true, force: true });
    removed++;
  }
}

const rootFiles = readdirSync('.');
for (const f of rootFiles) {
  if (timestampPattern.test(f)) {
    console.log(`   ❌ Removendo artefato: ${f}`);
    rmSync(f, { force: true });
    removed++;
  }
}

console.log(`\n✅ [CLEANUP] ${removed} itens removidos.`);
console.log('📌 Agora aplique os patches de FASE 1, 2 e 3.');
