const fs = require('fs');
// Revertir al backup antes del fix685
const bak = fs.readFileSync('SabanaAnalyzer.tsx.bak_fix685', 'utf8');
fs.writeFileSync('SabanaAnalyzer.tsx', bak);
const lines = bak.split('\n');
console.log('REVERTIDO. Total lineas:', lines.length);
console.log('L685:', JSON.stringify(lines[684]));
