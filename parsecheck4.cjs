const fs = require('fs');
const parser = require('@babel/parser');
try {
  const code = fs.readFileSync('SabanaAnalyzer.tsx', 'utf8');
  parser.parse(code, { sourceType:'module', plugins:['typescript','jsx'] });
  console.log('OK - SIN ERRORES');
} catch(e) {
  console.log('ERROR:', e.message);
}
