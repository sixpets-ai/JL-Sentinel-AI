const fs = require('fs');
const lines = fs.readFileSync('SabanaAnalyzer.tsx', 'utf8').split('\n');
const ln = lines[504];
console.log('L505 JSON:', JSON.stringify(ln));
console.log('chars:', [...ln].map((c,i)=>i+':'+c.charCodeAt(0)).join(' '));
