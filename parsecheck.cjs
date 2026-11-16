const fs = require('fs');
const src = fs.readFileSync('SabanaAnalyzer.tsx', 'utf8');
try {
  require('@babel/parser').parse(src, {
    sourceType: 'module',
    plugins: ['typescript', 'jsx']
  });
  console.log('PARSE OK - no syntax errors!');
} catch(e) {
  console.log('ERROR:', e.message);
}
