const fs=require('fs');
let c=fs.readFileSync('SabanaAnalyzer.tsx','utf8');
const idx=c.indexOf('{/* TAB DEL GRAFO (i2) */}');
console.log('L607 contexto:',JSON.stringify(c.slice(idx-200,idx+50)));
