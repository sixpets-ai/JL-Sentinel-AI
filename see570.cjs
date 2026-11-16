const fs = require('fs');
const lines = fs.readFileSync('SabanaAnalyzer.tsx', 'utf8').split('\n');
for(let i=569; i<=585; i++) console.log('L'+(i+1)+':', JSON.stringify(lines[i]));
