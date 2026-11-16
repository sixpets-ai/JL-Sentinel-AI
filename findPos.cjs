const fs = require('fs');
const code = fs.readFileSync('SabanaAnalyzer.tsx', 'utf8');
const pos = 34593;
// Mostrar contexto alrededor del byte 34593
const before = code.substring(pos-200, pos);
const after = code.substring(pos, pos+100);
console.log('=== ANTES pos 34593 ===');
console.log(JSON.stringify(before));
console.log('=== EN pos 34593 ===');
console.log(JSON.stringify(after));
// Encontrar que linea es
const lines = code.substring(0, pos).split('\n');
console.log('Linea:', lines.length, 'Col:', lines[lines.length-1].length);
