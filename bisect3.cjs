const fs = require('fs');
const parser = require('@babel/parser');
const lines = fs.readFileSync('SabanaAnalyzer.tsx', 'utf8').split('\n');
// Bisect fino: buscar exactamente donde aparece el primer error
[540,545,550,553,555,556,557,558,559,560].forEach(n => {
  try {
    parser.parse(lines.slice(0,n).join('\n'), {sourceType:'module',plugins:['typescript','jsx']});
    console.log('L1-'+n+': OK');
  } catch(e) {
    console.log('L1-'+n+' ERR col'+(e.loc?e.loc.column:'?')+':', e.message.substring(0,50));
  }
});
