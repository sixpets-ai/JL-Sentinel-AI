const fs = require('fs');
const lines = fs.readFileSync('SabanaAnalyzer.tsx', 'utf8').split('\n');
// L699 es index 698: "  );"
// Necesito insertar ")" antes del ");" 
// BACKUP primero
fs.writeFileSync('SabanaAnalyzer.tsx.bak_fix699', lines.join('\n'));
// Ver L697-700 exacto
for(let i=696; i<=699; i++) console.log('L'+(i+1)+':', JSON.stringify(lines[i]));
