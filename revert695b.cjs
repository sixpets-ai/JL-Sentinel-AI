const fs = require('fs');
const bak = fs.readFileSync('SabanaAnalyzer.tsx.bak_fix695b', 'utf8');
fs.writeFileSync('SabanaAnalyzer.tsx', bak);
const lines = bak.split('\n');
console.log('REVERTIDO L695:', JSON.stringify(lines[694]));
console.log('Total:', lines.length);
