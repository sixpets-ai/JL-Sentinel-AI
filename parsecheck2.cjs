const fs = require('fs');
try {
  const code = fs.readFileSync('SabanaAnalyzer.tsx', 'utf8');
  const parser = require('@babel/parser');
  parser.parse(code, { sourceType:'module', plugins:['typescript','jsx'] });
  console.log('OK - SIN ERRORES');
} catch(e) {
  console.log('ERROR:', e.message);
}
