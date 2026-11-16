const fs=require('fs');
let c=fs.readFileSync('SabanaAnalyzer.tsx','utf8');
const idx=c.indexOf('TOPOGRAF');
console.log(c.slice(idx-200,idx+500));
