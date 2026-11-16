const fs = require('fs');
let c = fs.readFileSync('SabanaAnalyzer.tsx', 'utf8');
const lines = c.split('\n');

console.log('L546:' + JSON.stringify(lines[545]));
console.log('L547:' + JSON.stringify(lines[546]));

// L546 (index 545) debe ser "        </div>) : (" -> cambiar a "        </div>"
if (lines[545] && lines[545].includes(') : (')) {
  lines[545] = lines[545].replace(') : (', '');
  console.log('FIX L546:' + lines[545]);
} else {
  // buscar la linea con ) : (
  for (let i = 540; i <= 560; i++) {
    if (lines[i] && lines[i].includes(') : (')) {
      console.log('ENCONTRADO en L'+(i+1)+':'+lines[i]);
      lines[i] = lines[i].replace(') : (', '');
      console.log('FIX:' + lines[i]);
      break;
    }
  }
}

const result = lines.join('\n');
fs.writeFileSync('SabanaAnalyzer.tsx', result, 'utf8');
console.log('DONE len:' + result.length);
