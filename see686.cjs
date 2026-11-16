const fs = require('fs');
const lines = fs.readFileSync('SabanaAnalyzer.tsx', 'utf8').split('\n');
for(let i=682; i<=692; i++) console.log('L'+(i+1)+':', JSON.stringify(lines[i]));
