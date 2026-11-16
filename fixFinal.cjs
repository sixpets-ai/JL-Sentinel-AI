const fs = require('fs');
const lines = fs.readFileSync('SabanaAnalyzer.tsx.bak_fix505b', 'utf8').split('\n');
console.log('Base:', lines.length, 'lineas');
console.log('L505 original:', JSON.stringify(lines[504]));
console.log('L509:', JSON.stringify(lines[508]));
console.log('L510:', JSON.stringify(lines[509]));
// Fix: L505 "))}}" -> "))" (quitar el "}")
lines[504] = lines[504].replace('))}', '))');
console.log('L505 fixed:', JSON.stringify(lines[504]));
// Insertar ") : null}" en index 509 (despues de L509 actual)
lines.splice(509, 0, '        ) : null}');
console.log('Nueva L510:', JSON.stringify(lines[509]));
console.log('L511:', JSON.stringify(lines[510]));
console.log('Total:', lines.length);
fs.writeFileSync('SabanaAnalyzer.tsx', lines.join('\n'));
