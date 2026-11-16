const fs = require('fs');
const lines = fs.readFileSync('SabanaAnalyzer.tsx', 'utf8').split('\n');
// L505 actual: "))" -> "))}""
lines[504] = lines[504].replace('))"', '))}');
// Verificar que no haya ")" de más - el } cierra el && expression
console.log('L505:', JSON.stringify(lines[504]));
console.log('L457:', JSON.stringify(lines[456]));
fs.writeFileSync('SabanaAnalyzer.tsx', lines.join('\n'));
