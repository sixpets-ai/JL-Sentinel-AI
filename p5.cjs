const fs=require('fs');
let c=fs.readFileSync('SabanaAnalyzer.tsx','utf8');
const s=23736;
const e=c.indexOf(') : (\n          <>\n',s);
console.log('end:',e,'text:',JSON.stringify(c.slice(e,e+30)));
