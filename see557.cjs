const fs = require('fs');
const lines = fs.readFileSync('SabanaAnalyzer.tsx', 'utf8').split('\n');
// Ver L555-562 con char codes para detectar chars raros
for(let i=554; i<=562; i++){
  const ln = lines[i];
  console.log('L'+(i+1)+':', JSON.stringify(ln));
}
