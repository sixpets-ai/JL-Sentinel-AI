const fs = require('fs');
const lines = fs.readFileSync('SabanaAnalyzer.tsx', 'utf8').split('\n');
lines[482] = '                            {[';
lines[504] = '            )}';
fs.writeFileSync('SabanaAnalyzer.tsx', lines.join('\n'));
console.log('L483:', JSON.stringify(lines[482]));
console.log('L505:', JSON.stringify(lines[504]));
