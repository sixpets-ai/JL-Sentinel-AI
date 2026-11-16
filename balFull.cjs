const fs = require('fs');
const lines = fs.readFileSync('SabanaAnalyzer.tsx', 'utf8').split('\n');
let p=0;
for(let i=351; i<=699; i++){
  const ln=lines[i];
  for(const c of ln){if(c==='(')p++;if(c===')')p--;}
  if(i>=690||p<0) console.log('L'+(i+1)+' p='+p+':', JSON.stringify(ln.substring(0,60)));
}
console.log('FINAL p='+p);
