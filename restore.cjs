const fs = require('fs');
fs.copyFileSync('SabanaAnalyzer.tsx.bak_fix505b', 'SabanaAnalyzer.tsx');
const lines = fs.readFileSync('SabanaAnalyzer.tsx', 'utf8').split('\n');
console.log('Restaurado. Lineas:', lines.length);
console.log('L457:', JSON.stringify(lines[456]));
console.log('L483:', JSON.stringify(lines[482]));
console.log('L490:', JSON.stringify(lines[489]));
console.log('L505:', JSON.stringify(lines[504]));
