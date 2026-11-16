const fs = require('fs');
const lines = fs.readFileSync('SabanaAnalyzer.tsx', 'utf8').split('\n');
const orig505 = lines[504];
lines[504] = orig505.slice(0, orig505.lastIndexOf('"'));
lines[482] = lines[482].replace('["', '{[');
fs.writeFileSync('SabanaAnalyzer.tsx', lines.join('\n'));
console.log('L483:', JSON.stringify(lines[482]));
console.log('L505:', JSON.stringify(lines[504]));
