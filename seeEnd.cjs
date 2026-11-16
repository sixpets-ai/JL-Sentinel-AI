const fs = require('fs');
const lines = fs.readFileSync('SabanaAnalyzer.tsx', 'utf8').split('\n');
for(let i=695; i<=703; i++) console.log('L'+(i+1)+':', JSON.stringify(lines[i]));
