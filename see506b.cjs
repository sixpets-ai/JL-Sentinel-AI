const fs = require('fs');
const lines = fs.readFileSync('SabanaAnalyzer.tsx', 'utf8').split('\n');
console.log('L505:', JSON.stringify(lines[504]));
console.log('L506:', JSON.stringify(lines[505]));
console.log('L507:', JSON.stringify(lines[506]));
// Ver chars de L506
const ln = lines[505];
console.log('L506 chars:', [...ln].map((c,i)=>i+':'+c.charCodeAt(0)).join(' '));
