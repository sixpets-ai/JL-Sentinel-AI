const fs = require('fs');
const babel = require('@babel/parser');
const code = fs.readFileSync('SabanaAnalyzer.tsx', 'utf8');
try {
  babel.parse(code, { sourceType: 'module', plugins: ['typescript', 'jsx'] });
  console.log('OK: SabanaAnalyzer.tsx compila sin errores');
} catch(e) {
  console.log('ERROR:', e.message);
}
