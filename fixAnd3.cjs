const fs = require('fs');
const lines = fs.readFileSync('SabanaAnalyzer.tsx', 'utf8').split('\n');
const ln = lines[504];
console.log('ANTES:', JSON.stringify(ln));
// Agregar "}" al final
lines[504] = ln + '}';
console.log('DESPUES:', JSON.stringify(lines[504]));
fs.writeFileSync('SabanaAnalyzer.tsx', lines.join('\n'));
