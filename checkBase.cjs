const fs = require('fs');
// Restaurar backup original de 700 lineas
const lines = fs.readFileSync('SabanaAnalyzer.tsx.bak_fix505b', 'utf8').split('\n');
console.log('Base:', lines.length, 'L457:', JSON.stringify(lines[456]));
console.log('L483:', JSON.stringify(lines[482]));
console.log('L490:', JSON.stringify(lines[489]));
console.log('L505:', JSON.stringify(lines[504]));
