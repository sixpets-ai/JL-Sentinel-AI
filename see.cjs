const fs=require('fs');
let c=fs.readFileSync('SabanaAnalyzer.tsx','utf8');
// Ver lines 600-615
const lines=c.split('\n');
for(let i=598;i<615;i++) console.log('L'+(i+1)+':',lines[i]);
