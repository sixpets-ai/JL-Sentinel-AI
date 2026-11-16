const fs = require('fs');
const lines = fs.readFileSync('SabanaAnalyzer.tsx', 'utf8').split('\n');
// Buscar desde L352 (return) hasta L355
for(let i=351; i<=360; i++) console.log('L'+(i+1)+':', JSON.stringify(lines[i]));
