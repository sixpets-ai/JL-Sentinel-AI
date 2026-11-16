const fs = require('fs');
const parser = require('@babel/parser');
const code = fs.readFileSync('SabanaAnalyzer.tsx', 'utf8');
const result = parser.parse(code, {
  sourceType:'module',
  plugins:['typescript','jsx'],
  errorRecovery: true
});
// Mostrar TODOS los errores encontrados
result.errors.forEach(e => console.log('ERR:', e.message, 'at', e.loc ? e.loc.line+':'+e.loc.column : '?'));
console.log('Total errores:', result.errors.length);
