const fs = require('fs');
const lines = fs.readFileSync('SabanaAnalyzer.tsx', 'utf8').split('\n');
fs.writeFileSync('SabanaAnalyzer.tsx.bak_remove699', lines.join('\n'));
// Quitar la linea L699 (index 698) que insertamos
lines.splice(698, 1);
console.log('Total:', lines.length);
for(let i=694; i<=701; i++) console.log('L'+(i+1)+':', JSON.stringify(lines[i]));
fs.writeFileSync('SabanaAnalyzer.tsx', lines.join('\n'));
