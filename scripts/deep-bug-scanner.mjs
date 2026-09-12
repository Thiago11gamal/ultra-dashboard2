import fs from 'node:fs';
import path from 'node:path';

function getAllFiles(dir, exts = ['.js', '.jsx', '.ts', '.tsx']) {
  let files = [];
  for (const item of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (item !== 'node_modules' && item !== 'dist' && item !== '.git' && item !== '__tests__') {
        files = files.concat(getAllFiles(fullPath, exts));
      }
    } else if (exts.includes(path.extname(item))) {
      files.push(fullPath);
    }
  }
  return files;
}

const files = getAllFiles('src');
console.log(`Auditing ${files.length} source files in src/...`);

const findings = [];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    const trimmed = line.trim();

    // 1. Unsafe JSON.parse
    if (line.includes('JSON.parse(') && !line.includes('try') && !line.includes('catch')) {
      // Check if surrounding lines have try/catch
      const start = Math.max(0, idx - 10);
      const end = Math.min(lines.length, idx + 10);
      const block = lines.slice(start, end).join('\n');
      if (!block.includes('try {') && !block.includes('try{')) {
        findings.push({
          file,
          lineNum,
          type: 'UNSAFE_JSON_PARSE',
          snippet: trimmed,
          desc: 'JSON.parse without immediate try/catch block'
        });
      }
    }

    // 2. Unsafe .toISOString()
    if (line.includes('.toISOString()') && !line.includes('new Date().toISOString()')) {
      const start = Math.max(0, idx - 5);
      const block = lines.slice(start, idx + 1).join('\n');
      if (!block.includes('isNaN') && !block.includes('Number.isFinite') && !block.includes('isValid') && !block.includes('try')) {
        findings.push({
          file,
          lineNum,
          type: 'POTENTIAL_INVALID_DATE_TOISOSTRING',
          snippet: trimmed,
          desc: '.toISOString() called without apparent date validity check'
        });
      }
    }

    // 3. Unsafe Math.sqrt without Math.max(0, ...)
    if (/Math\.sqrt\([^)]+\)/.test(line) && !line.includes('Math.max(0') && !line.includes('Math.abs')) {
      findings.push({
        file,
        lineNum,
        type: 'POTENTIAL_NEGATIVE_SQRT',
        snippet: trimmed,
        desc: 'Math.sqrt without explicit non-negative clamp Math.max(0, ...)'
      });
    }

    // 4. Unsafe Math.log without Math.max
    if (/Math\.log\([^)]+\)/.test(line) && !line.includes('Math.max(') && !line.includes('Math.log(10') && !line.includes('Math.log(2')) {
      findings.push({
        file,
        lineNum,
        type: 'POTENTIAL_NON_POSITIVE_LOG',
        snippet: trimmed,
        desc: 'Math.log without clamp (could produce -Infinity or NaN)'
      });
    }

    // 5. Unsafe division by difference
    if (/\/\s*\([a-zA-Z0-9_.]+\s*-\s*[a-zA-Z0-9_.]+\)/.test(line)) {
      if (!line.includes('Math.max(') && !line.includes('!== 0') && !line.includes('!= 0') && !line.includes('range')) {
        findings.push({
          file,
          lineNum,
          type: 'POTENTIAL_DIV_BY_ZERO_DIFF',
          snippet: trimmed,
          desc: 'Division by (a - b) without zero/range protection'
        });
      }
    }

    // 6. Dangerous window.addEventListener in useEffect without cleanup
    if (line.includes('window.addEventListener') || line.includes('document.addEventListener')) {
      const start = Math.max(0, idx - 20);
      const end = Math.min(lines.length, idx + 30);
      const block = lines.slice(start, end).join('\n');
      if (block.includes('useEffect') && !block.includes('removeEventListener')) {
        findings.push({
          file,
          lineNum,
          type: 'MISSING_REMOVE_EVENT_LISTENER',
          snippet: trimmed,
          desc: 'addEventListener in useEffect without matching removeEventListener in cleanup'
        });
      }
    }

    // 7. setInterval / setTimeout in useEffect without cleanup
    if (line.includes('setInterval(') && !line.includes('//')) {
      const start = Math.max(0, idx - 15);
      const end = Math.min(lines.length, idx + 25);
      const block = lines.slice(start, end).join('\n');
      if (block.includes('useEffect') && !block.includes('clearInterval')) {
        findings.push({
          file,
          lineNum,
          type: 'MISSING_CLEAR_INTERVAL',
          snippet: trimmed,
          desc: 'setInterval in useEffect without matching clearInterval'
        });
      }
    }
  });
}

const grouped = {};
for (const f of findings) {
  grouped[f.type] = (grouped[f.type] || 0) + 1;
}
fs.writeFileSync('scratch_findings.json', JSON.stringify({ total: findings.length, grouped, findings }, null, 2), 'utf8');
console.log('Saved scratch_findings.json. Total:', findings.length);


