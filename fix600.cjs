const fs = require('fs');
const lines = fs.readFileSync('SabanaAnalyzer.tsx', 'utf8').split('\n');
fs.writeFileSync('SabanaAnalyzer.tsx.bak_fix600', lines.join('\n'));
console.log('ANTES L600:', JSON.stringify(lines[599]));
// Quitar la comilla al final
lines[599] = lines[599].replace(/"$/, '');
console.log('DESPUES L600:', JSON.stringify(lines[599]));
fs.writeFileSync('SabanaAnalyzer.tsx', lines.join('\n'));
