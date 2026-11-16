const fs = require('fs');
const lines = fs.readFileSync('SabanaAnalyzer.tsx', 'utf8').split('\n');
lines[387] = '              {t === "map" ? "MAPA" : t === "graph" ? "GRAFO" : "TABLA"}';
fs.writeFileSync('SabanaAnalyzer.tsx', lines.join('\n'));
console.log('DONE:', lines[387]);
