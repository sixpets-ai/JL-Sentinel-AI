const fs = require('fs');
const lines = fs.readFileSync('SabanaAnalyzer.tsx', 'utf8').split('\n');
console.log('ANTES L692:', JSON.stringify(lines[691]));
lines[691] = lines[691].replace(')}'  , '))}'  );
fs.writeFileSync('SabanaAnalyzer.tsx', lines.join('\n'));
console.log('DESPUES L692:', JSON.stringify(lines[691]));
