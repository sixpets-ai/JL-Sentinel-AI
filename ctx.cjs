const fs = require('fs');
// Leer el backup original para ver el contexto real
const c = fs.readFileSync('C:\\Users\\Wyse\\Desktop\\sabana_full.txt', 'utf8');
const lines = c.split('\n');
// Mostrar L580-L640 del original para entender la estructura
for (let i = 579; i <= 639; i++) {
  console.log('L' + (i+1) + ': ' + lines[i]);
}
