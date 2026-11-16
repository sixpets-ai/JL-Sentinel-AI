const fs = require('fs');
const lines = fs.readFileSync('SabanaAnalyzer.tsx', 'utf8').split('\n');
// Ver L599-600 con todos los char codes
const ln599 = lines[598];
const ln600 = lines[599];
console.log('L599 chars:', [...ln599].map((c,i)=>i+':'+c.charCodeAt(0)).join(' '));
console.log('L600 chars:', [...ln600].map((c,i)=>i+':'+c.charCodeAt(0)).join(' '));
