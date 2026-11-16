const fs = require('fs');
const lines = fs.readFileSync('SabanaAnalyzer.tsx', 'utf8').split('\n');
// Buscar desde L570 (segundo return) hasta L700
// Rastrear ternarios abiertos: cada ? que no sea ?. o ?.( abre uno, cada : cierra uno
let depth = 0;
let stack = [];
for(let i=569; i<=699; i++){
  const ln = lines[i];
  // buscar ? que no sea ?. ni ??
  const qMatches = [...ln.matchAll(/(?<![?.])\?(?![?.:])/g)];
  const cMatches = [...ln.matchAll(/(?<![?:]) : /g)];
  if(qMatches.length > 0){
    for(const m of qMatches) stack.push({line:i+1, col:m.index});
  }
  if(cMatches.length > 0){
    for(const m of cMatches) stack.pop();
  }
  if(stack.length > 0) console.log('L'+(i+1)+' openTernarios='+stack.length, JSON.stringify(ln.substring(0,80)));
}
console.log('STACK FINAL:', JSON.stringify(stack));
