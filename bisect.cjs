const fs = require('fs');
const parser = require('@babel/parser');
const lines = fs.readFileSync('SabanaAnalyzer.tsx', 'utf8').split('\n');
// Probar solo hasta L600
const half = lines.slice(0, 600).join('\n');
try {
  parser.parse(half, { sourceType:'module', plugins:['typescript','jsx'] });
  console.log('L1-600: OK');
} catch(e) {
  console.log('L1-600 ERROR:', e.message);
}
// Probar solo hasta L650
const half2 = lines.slice(0, 650).join('\n');
try {
  parser.parse(half2, { sourceType:'module', plugins:['typescript','jsx'] });
  console.log('L1-650: OK');
} catch(e) {
  console.log('L1-650 ERROR:', e.message);
}
