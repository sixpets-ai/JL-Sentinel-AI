const fs = require('fs');
const lines = fs.readFileSync('SabanaAnalyzer.tsx', 'utf8').split('\n');
for(let i=481; i<=492; i++) console.log('L'+(i+1)+':', JSON.stringify(lines[i]));
