const fs = require('fs');
const lines = fs.readFileSync('SabanaAnalyzer.tsx', 'utf8').split('\n');
[456,457,458,459,633,634,635,636,657,658,659,660].forEach(n=>console.log('L'+n+':',JSON.stringify(lines[n-1])));
