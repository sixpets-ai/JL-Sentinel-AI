const fs=require('fs');
let c=fs.readFileSync('SabanaAnalyzer.tsx','utf8');
const idx=c.indexOf('TARJETAS INFORMATIVAS');
console.log(c.slice(idx,idx+1200));
