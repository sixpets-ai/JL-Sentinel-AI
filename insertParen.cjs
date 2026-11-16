const fs = require('fs');
const lines = fs.readFileSync('SabanaAnalyzer.tsx', 'utf8').split('\n');
fs.writeFileSync('SabanaAnalyzer.tsx.bak_insertParen', lines.join('\n'));
// Insertar "  )" antes de L699 (index 698)
lines.splice(698, 0, '  )');
console.log('Insertado. Total:', lines.length);
for(let i=695; i<=701; i++) console.log('L'+(i+1)+':', JSON.stringify(lines[i]));
fs.writeFileSync('SabanaAnalyzer.tsx', lines.join('\n'));
