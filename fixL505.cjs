const fs = require('fs');
const lines = fs.readFileSync('SabanaAnalyzer.tsx', 'utf8').split('\n');
const ln = lines[504];
console.log('L505 actual:', JSON.stringify(ln));
console.log('L483 actual:', JSON.stringify(lines[482]));
// Reemplazar L505 completamente con el valor correcto
// Estructura: {[ datos ].map((r,i) => ( <tr/> ))}
// {[" abre en L483, ].map en L490, )) cierra map en L505, } cierra el { de L483
lines[504] = '            ])}';
console.log('L505 nuevo:', JSON.stringify(lines[504]));
fs.writeFileSync('SabanaAnalyzer.tsx', lines.join('\n'));
