const fs = require('fs');
const lines = fs.readFileSync('SabanaAnalyzer.tsx', 'utf8').split('\n');
// Contar parens desde L656 (index 655) hasta L700
let p = 0;
for(let i=655; i<=699; i++){
  const ln = lines[i];
  for(const c of ln){ if(c==='(') p++; if(c===')') p--; }
  if(p !== 0) console.log('L'+(i+1)+' p='+p+':', JSON.stringify(ln.substring(0,100)));
}
console.log('FINAL p='+p);
