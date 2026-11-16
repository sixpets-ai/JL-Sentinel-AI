const fs = require('fs');
const lines = fs.readFileSync('SabanaAnalyzer.tsx', 'utf8').split('\n');
const ln = lines[698]; // L699
console.log('L699 JSON:', JSON.stringify(ln));
console.log('L699 chars:', [...ln].map((c,i)=>i+':'+c.charCodeAt(0)).join(' '));
