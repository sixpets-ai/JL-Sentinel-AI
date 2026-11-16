const fs = require('fs');
const lines = fs.readFileSync('SabanaAnalyzer.tsx', 'utf8').split('\n');
fs.writeFileSync('SabanaAnalyzer.tsx.bak_fix505', lines.join('\n'));
// L505 (index 504): "            ))}" -> agregar " : null" antes del "}"
console.log('ANTES L505:', JSON.stringify(lines[504]));
lines[504] = lines[504].replace('))}"', ')) : null}');
console.log('DESPUES L505:', JSON.stringify(lines[504]));
fs.writeFileSync('SabanaAnalyzer.tsx', lines.join('\n'));
