const fs = require('fs');
const lines = fs.readFileSync('SabanaAnalyzer.tsx', 'utf8').split('\n');
fs.writeFileSync('SabanaAnalyzer.tsx.bak_fix695b', lines.join('\n'));
console.log('ANTES L695:', JSON.stringify(lines[694]));
// L695 tiene "))}" - necesita un ")" más -> ")))}"
lines[694] = lines[694].replace('))}', ')))'); 
console.log('DESPUES L695:', JSON.stringify(lines[694]));
fs.writeFileSync('SabanaAnalyzer.tsx', lines.join('\n'));
