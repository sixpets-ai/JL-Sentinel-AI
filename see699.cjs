const fs = require('fs');
const lines = fs.readFileSync('SabanaAnalyzer.tsx', 'utf8').split('\n');
// L699 = index 698
const ln = lines[698];
console.log('L699:', JSON.stringify(ln));
console.log('chars:', [...ln].map((c,i)=>i+':'+c.charCodeAt(0)+'('+c+')').join(' '));
// Ver L695-700
for(let i=694; i<=699; i++) console.log('L'+(i+1)+':', JSON.stringify(lines[i]));
