const fs = require('fs');
let c = fs.readFileSync('SabanaAnalyzer.tsx', 'utf8');

// Fix: reemplazar \"graph\" con "graph" en la linea del tab
const before = c.length;

// Buscar el patron exacto con backslash-quote
c = c.replace('{tab === \\"graph\\" && (', '{tab === "graph" && (');

// Tambien fix para otros tabs si tienen el mismo problema
c = c.replace('{tab === \\"map\\" && (', '{tab === "map" && (');
c = c.replace('{tab === \\"table\\" && (', '{tab === "table" && (');

console.log('len antes:' + before + ' despues:' + c.length);

// Verificar que quedo bien
const lineIdx = c.split('\n').findIndex(l => l.includes('TAB DEL GRAFO'));
const lines = c.split('\n');
console.log('L' + (lineIdx+1) + ': ' + lines[lineIdx]);
console.log('L' + (lineIdx+2) + ': ' + lines[lineIdx+1]);

fs.writeFileSync('SabanaAnalyzer.tsx', c, 'utf8');
console.log('DONE');
