const fs = require('fs');
const lines = fs.readFileSync('SabanaAnalyzer.tsx', 'utf8').split('\n');
for(let i=453; i<=465; i++) console.log('L'+(i+1)+':', JSON.stringify(lines[i]));
