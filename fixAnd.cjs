const fs = require('fs');
const lines = fs.readFileSync('SabanaAnalyzer.tsx.bak_fix505b', 'utf8').split('\n');
// L457: {rows.length === 0 ? ( -> {rows.length === 0 && (
lines[456] = lines[456].replace('rows.length === 0 ? (', 'rows.length === 0 && (');
// L505: ))} -> )}
lines[504] = lines[504].replace('))}', ')}');
console.log('L457:', JSON.stringify(lines[456]));
console.log('L505:', JSON.stringify(lines[504]));
fs.writeFileSync('SabanaAnalyzer.tsx', lines.join('\n'));
