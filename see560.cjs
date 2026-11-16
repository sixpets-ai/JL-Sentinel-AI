const fs = require('fs');
const lines = fs.readFileSync('SabanaAnalyzer.tsx', 'utf8').split('\n');
// L560 col 32 - ver la línea completa con char codes
const ln = lines[559]; // L560 = index 559
console.log('L560:', JSON.stringify(ln));
// mostrar char en posicion 31
console.log('col31 char:', ln.charCodeAt(31), JSON.stringify(ln[31]));
// Ver L558-565
for(let i=557; i<=565; i++) console.log('L'+(i+1)+':', JSON.stringify(lines[i]));
