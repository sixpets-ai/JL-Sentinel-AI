const fs = require('fs');
const lines = fs.readFileSync('SabanaAnalyzer.tsx', 'utf8').split('\n');
let p = 0, lastOpen = -1;
for(let i=351; i<lines.length; i++){
  for(const c of lines[i]){
    if(c==='('){p++; lastOpen=i+1;}
    if(c===')') p--;
  }
  if(p<0){console.log('NEG at L'+(i+1)+' p='+p); break;}
}
console.log('Final p='+p+' lastOpen=L'+lastOpen);
