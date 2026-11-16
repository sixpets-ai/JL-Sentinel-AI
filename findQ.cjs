const fs = require('fs');
const lines = fs.readFileSync('SabanaAnalyzer.tsx', 'utf8').split('\n');
// Buscar desde L699 hacia arriba el ultimo ? sin :
for(let i=698; i>=351; i--){
  const ln = lines[i].trim();
  if(ln.includes('?') && !ln.startsWith('//') && !ln.includes(':')){
    console.log('TERNARIO SIN : en L'+(i+1)+':', JSON.stringify(lines[i].substring(0,120)));
    // mostrar contexto
    for(let j=i; j<=Math.min(i+5,699); j++) console.log('  L'+(j+1)+':', JSON.stringify(lines[j]));
    break;
  }
}
