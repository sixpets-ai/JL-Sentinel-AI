const fs = require('fs');
const lines = fs.readFileSync('SabanaAnalyzer.tsx.bak_fix505b', 'utf8').split('\n');
// Encontrar donde esta el return( para insertar la const antes
// Buscar "return (" 
for(let i=340; i<=365; i++) {
  if(lines[i] && lines[i].includes('return')) console.log('L'+(i+1)+':', JSON.stringify(lines[i]));
}
