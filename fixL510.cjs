const fs = require('fs');
const lines = fs.readFileSync('SabanaAnalyzer.tsx', 'utf8').split('\n');
lines[509] = '          )}';
fs.writeFileSync('SabanaAnalyzer.tsx', lines.join('\n'));
console.log('L510:', JSON.stringify(lines[509]));
