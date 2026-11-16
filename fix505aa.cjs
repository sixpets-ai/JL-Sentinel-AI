const fs = require('fs');
const lines = fs.readFileSync('SabanaAnalyzer.tsx', 'utf8').split('\n');
lines[504] = '            )}';
fs.writeFileSync('SabanaAnalyzer.tsx', lines.join('\n'));
console.log('L505:', JSON.stringify(lines[504]));
