const fs=require('fs');
let c=fs.readFileSync('SabanaAnalyzer.tsx','utf8');
const idx=c.indexOf('Dibuja cada celda');
console.log('Dibuja cada celda pos:',idx);
if(idx>0) console.log(c.slice(idx-400,idx+800));
