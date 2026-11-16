const fs = require('fs');
const lines = fs.readFileSync('SabanaAnalyzer.tsx', 'utf8').split('\n');
lines[453] = lines[453].replace(/"/g, '');
fs.writeFileSync('SabanaAnalyzer.tsx', lines.join('\n'));
console.log('L454:', JSON.stringify(lines[453]));
