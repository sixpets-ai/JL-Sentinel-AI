const fs = require('fs');
const lines = fs.readFileSync('SabanaAnalyzer.tsx', 'utf8').split('\n');
// Ver L700 con chars exactos
const ln = lines[699];
console.log('L700 JSON:', JSON.stringify(ln));
console.log('L700 chars:', [...ln].map((c,i)=>i+':'+c.charCodeAt(0)).join(' '));
