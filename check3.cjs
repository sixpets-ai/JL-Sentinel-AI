const fs=require('fs');
let c=fs.readFileSync('SabanaAnalyzer.tsx','utf8');
const idx=c.indexOf('TOPOGRAF\u00cdA');
console.log('pos:',idx);
if(idx>0) console.log(c.slice(idx-300,idx+600));
