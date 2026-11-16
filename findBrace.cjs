const fs = require('fs');
const lines = fs.readFileSync('SabanaAnalyzer.tsx', 'utf8').split('\n');
let b = 0, lastOpen = -1;
for(let i=351; i<lines.length; i++){
  for(const c of lines[i]){
    if(c==='{'){b++; lastOpen=i+1;}
    if(c==='}') b--;
  }
}
console.log('Final b='+b+' lastOpen=L'+lastOpen);
