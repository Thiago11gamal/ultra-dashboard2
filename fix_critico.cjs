const fs = require('fs');
const file = 'c:/Users/antun.BOOK-201QO8FPFE/Downloads/fly/ultra-dashboard2/src/components/SimuladoAnalysis.jsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(/CRÃ\s*TICO/g, 'CRÍTICO');
c = c.replace(/CRÃ TICO/g, 'CRÍTICO');

fs.writeFileSync(file, c);
console.log('Fixed');
