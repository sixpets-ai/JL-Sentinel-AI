const fs = require('fs');
const lines = fs.readFileSync('SabanaAnalyzer.tsx', 'utf8').split('\n');
// Buscar desde L430 hacia adelante - todo lo que tenga ? que no sea ?. ?? ?.
for(let i=430; i<=560; i++){
  const ln = lines[i];
  if(/[^?!<>=]?\?[^?.:\s>]/.test(ln) || ln.includes('?: ') || (ln.includes('?') && !ln.includes('?.') && !ln.includes('??') && !ln.includes('? ') && !ln.includes(' ?'))){
    console.log('L'+(i+1)+':', JSON.stringify(ln.substring(0,100)));
  }
}
