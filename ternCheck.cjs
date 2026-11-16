const fs = require('fs');
const lines = fs.readFileSync('SabanaAnalyzer.tsx', 'utf8').split('\n');
// Contar ternarios: cada "? " que no sea ?. ni ?? abre uno, cada " : " cierra uno
let stack = [];
for(let i=351; i<=699; i++){
  const ln = lines[i];
  // ? ternario: tiene " ? " o "? ("
  const opens = [...ln.matchAll(/ \? (?!void|\?)/g)].length + [...ln.matchAll(/\? \(/g)].length;
  const closes = [...ln.matchAll(/ : /g)].length;
  for(let j=0; j<opens; j++) stack.push(i+1);
  for(let j=0; j<closes && stack.length>0; j++) stack.pop();
}
console.log('Ternarios sin cerrar:', stack);
