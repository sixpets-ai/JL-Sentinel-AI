const fs=require('fs');
let c=fs.readFileSync('SabanaAnalyzer.tsx','utf8');
const s=23736;
const e=c.indexOf(') : (',s);
console.log('end:',e);
console.log(JSON.stringify(c.slice(e,e+40)));
