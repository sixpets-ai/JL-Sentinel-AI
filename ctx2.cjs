const fs = require('fs');
const c = fs.readFileSync('C:\\Users\\Wyse\\Desktop\\sabana_full.txt', 'utf8');
const lines = c.split('\n');
// Ver L565-L615 del original
for (let i = 564; i <= 614; i++) {
  console.log('L' + (i+1) + ': ' + lines[i]);
}
