const fs = require('fs');
const lines = fs.readFileSync('SabanaAnalyzer.tsx', 'utf8').split('\n');
fs.writeFileSync('SabanaAnalyzer.tsx.bak_fix505b', lines.join('\n'));
const ln = lines[504];
console.log('ANTES:', JSON.stringify(ln));
// Reemplazar el ultimo "}" con " : null}"
lines[504] = ln.replace(/\}$/, ' : null}');
console.log('DESPUES:', JSON.stringify(lines[504]));
fs.writeFileSync('SabanaAnalyzer.tsx', lines.join('\n'));
