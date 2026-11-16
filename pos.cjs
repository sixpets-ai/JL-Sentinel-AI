const fs=require('fs');
let c=fs.readFileSync('SabanaAnalyzer.tsx','utf8');
const s=c.indexOf('{/* TARJETAS INFORMATIVAS */}');
const e=c.indexOf(') : (\n          <>',s);
console.log(s,e);
