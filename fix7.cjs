const fs = require('fs');
let c = fs.readFileSync('SabanaAnalyzer.tsx', 'utf8');

const bq = String.fromCharCode(92) + String.fromCharCode(34); // \"
console.log('bq char codes:', bq.charCodeAt(0), bq.charCodeAt(1));
console.log('bq antes:', (c.split(bq).length - 1));

// Reemplazar TODAS las ocurrencias de \" con " en el archivo completo
// Esto es seguro porque en TSX/JSX las comillas en strings de atributos no usan backslash
c = c.split(bq).join(String.fromCharCode(34));

console.log('bq despues:', (c.split(bq).length - 1));
fs.writeFileSync('SabanaAnalyzer.tsx', c, 'utf8');
console.log('DONE len:' + c.length);
