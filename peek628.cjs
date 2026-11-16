const fs = require('fs');
const c = fs.readFileSync('SabanaAnalyzer.tsx', 'utf8');
const lines = c.split('\n');
for (let i = 622; i <= 635; i++) {
  console.log('L' + (i+1) + ': ' + JSON.stringify(lines[i]));
}
