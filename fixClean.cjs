const fs = require('fs');
const lines = fs.readFileSync('SabanaAnalyzer.tsx.bak_fix509', 'utf8').split('\n');
console.log('Restaurado. Lineas:', lines.length);
console.log('L505:', JSON.stringify(lines[504]));
console.log('L509:', JSON.stringify(lines[508]));
// Ahora aplicar el fix UNA sola vez
// L505 (index 504): "))}}" -> "))" quitar el "}"
lines[504] = lines[504].replace('))}', '))');
console.log('L505 fixed:', JSON.stringify(lines[504]));
// Insertar ") : null}" despues de L509 (index 508), es decir en index 509
lines.splice(509, 0, '        ) : null}');
console.log('Nueva L510:', JSON.stringify(lines[509]));
console.log('Total:', lines.length);
fs.writeFileSync('SabanaAnalyzer.tsx', lines.join('\n'));
