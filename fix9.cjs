const fs = require('fs');
let c = fs.readFileSync('SabanaAnalyzer.tsx', 'utf8');
const lines = c.split('\n');

// L547 (index 546) es "<>" que inicia el mapa
// Necesitamos insertar {tab === "map" && ( antes de esa linea
console.log('L546:' + JSON.stringify(lines[545]));
console.log('L547:' + JSON.stringify(lines[546]));

// Insertar la linea {tab === "map" && ( en posicion 546 (antes del <>)
const mapOpen = '        {tab === "map" && (';
lines.splice(546, 0, mapOpen);

console.log('despues del splice:');
console.log('L546:' + lines[545]);
console.log('L547:' + lines[546]);
console.log('L548:' + lines[547]);

const result = lines.join('\n');
fs.writeFileSync('SabanaAnalyzer.tsx', result, 'utf8');
console.log('DONE len:' + result.length);
