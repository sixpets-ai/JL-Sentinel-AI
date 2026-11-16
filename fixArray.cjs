const fs = require('fs');
const lines = fs.readFileSync('SabanaAnalyzer.tsx', 'utf8').split('\n');
console.log('L483:', JSON.stringify(lines[482]));
console.log('L505:', JSON.stringify(lines[504]));
// L483: '            ["' -> '            {["'
lines[482] = lines[482].replace('            ["', '            {["');
// L505: '))}' -> '])}'  (el ] cierra el array, ) cierra map, } cierra {)
lines[504] = lines[504].replace('))}', ']}');
console.log('L483 fixed:', JSON.stringify(lines[482]));
console.log('L505 fixed:', JSON.stringify(lines[504]));
fs.writeFileSync('SabanaAnalyzer.tsx', lines.join('\n'));
