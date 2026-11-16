const fs = require('fs');
let c = fs.readFileSync('SabanaAnalyzer.tsx', 'utf8');
const lines = c.split('\n');

console.log('L626 hex:', Buffer.from(lines[625]).toString('hex'));
console.log('L628 hex:', Buffer.from(lines[627]).toString('hex'));

// Reemplazar exactamente lo que hay en esas lineas
// L626 y L628 son "        }}" -> deben ser "        )}"
const old626 = lines[625];
const old628 = lines[627];

lines[625] = old626.replace('}}', ')}');
lines[627] = old628.replace('}}', ')}');

console.log('L626 nuevo:', lines[625]);
console.log('L628 nuevo:', lines[627]);

const result = lines.join('\n');
fs.writeFileSync('SabanaAnalyzer.tsx', result, 'utf8');
console.log('DONE len:' + result.length);
