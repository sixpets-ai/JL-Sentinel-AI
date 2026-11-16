const fs = require('fs');
const lines = fs.readFileSync('SabanaAnalyzer.tsx', 'utf8').split('\n');
fs.writeFileSync('SabanaAnalyzer.tsx.bak_fix685', lines.join('\n'));
// L685 index 684: "            )))" -> quitar un ")"
console.log('ANTES:', JSON.stringify(lines[684]));
lines[684] = lines[684].replace(')))', '))');
console.log('DESPUES:', JSON.stringify(lines[684]));
fs.writeFileSync('SabanaAnalyzer.tsx', lines.join('\n'));
