const fs=require('fs');
const c=fs.readFileSync('SabanaAnalyzer.tsx','utf8');
const lines=c.split('\n');
for(var i=250;i<320;i++){console.log('L'+(i+1)+':',lines[i]);}
