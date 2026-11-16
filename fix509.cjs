const fs = require('fs');
const lines = fs.readFileSync('SabanaAnalyzer.tsx', 'utf8').split('\n');
fs.writeFileSync('SabanaAnalyzer.tsx.bak_fix509', lines.join('\n'));
// L505 (index 504): "))}}" -> "))" quitar el "}"
lines[504] = lines[504].replace('))}', '))');
console.log('L505:', JSON.stringify(lines[504]));
// Insertar ") : null}" despues de L509 (index 508)
lines.splice(509, 0, '        ) : null}');
console.log('L509:', JSON.stringify(lines[508]));
console.log('L510 nueva:', JSON.stringify(lines[509]));
console.log('L511:', JSON.stringify(lines[510]));
fs.writeFileSync('SabanaAnalyzer.tsx', lines.join('\n'));
console.log('Total lineas:', lines.length);
