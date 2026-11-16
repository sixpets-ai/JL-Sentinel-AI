const fs = require('fs');
const lines = fs.readFileSync('SabanaAnalyzer.tsx', 'utf8').split('\n');
lines[456] = lines[456].replace('rows.length === 0 ? (', 'rows.length === 0 && (');
lines[482] = lines[482].replace('["', '{["');
lines[504] = lines[504].replace('))}"', ')}"');
fs.writeFileSync('SabanaAnalyzer.tsx', lines.join('\n'));
console.log('L457:', JSON.stringify(lines[456]));
console.log('L483:', JSON.stringify(lines[482]));
console.log('L505:', JSON.stringify(lines[504]));
