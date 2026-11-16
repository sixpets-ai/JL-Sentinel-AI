const fs=require('fs');
const c=fs.readFileSync('SabanaAnalyzer.tsx','utf8');
const lines=c.split('\n');
console.log('TOTAL LINES:',lines.length);
for(var i=0;i<50;i++){console.log('L'+(i+1)+':',lines[i]);}
