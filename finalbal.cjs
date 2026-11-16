const fs = require('fs');
const s = fs.readFileSync('SabanaAnalyzer.tsx', 'utf8');
let p=0, b=0;
s.split('').forEach(c=>{if(c==='(')p++;if(c===')')p--;if(c==='{')b++;if(c==='}')b--;});
console.log('parens:', p, 'braces:', b);
