const fs = require('fs');
const parser = require('@babel/parser');
const lines = fs.readFileSync('SabanaAnalyzer.tsx', 'utf8').split('\n');
[560,580,590,595,598,602,610,620,630,640,650,660,670,680,690,695,698].forEach(n => {
  try {
    parser.parse(lines.slice(0,n).join('\n'), { sourceType:'module', plugins:['typescript','jsx'] });
    console.log('L1-'+n+': OK');
  } catch(e) {
    console.log('L1-'+n+' ERR:', e.message);
  }
});
