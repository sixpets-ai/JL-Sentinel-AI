const fs=require('fs');
let c=fs.readFileSync('SabanaAnalyzer.tsx','utf8');
console.log(JSON.stringify(c.slice(24500,24800)));
