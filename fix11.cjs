const fs = require('fs');
let c = fs.readFileSync('SabanaAnalyzer.tsx', 'utf8');
const lines = c.split('\n');

// Mostrar contexto L622-631
console.log('=== CONTEXTO ANTES ===');
for (let i = 621; i <= 631; i++) {
  console.log('L'+(i+1)+': '+JSON.stringify(lines[i]));
}

// L626 (index 625) tiene ")}" sobrante - es el cierre del {tab==="map"&&( original
// que ya no existe. Eliminarlo.
// Verificar que sea exactamente ")}"
const idx = 625; // L626
if (lines[idx] && lines[idx].trim() === ')}') {
  console.log('ELIMINANDO L626: '+JSON.stringify(lines[idx]));
  lines.splice(idx, 1);
} else {
  console.log('L626 no es )}: '+JSON.stringify(lines[idx]));
  // Buscar en rango
  for (let i = 622; i <= 630; i++) {
    console.log('L'+(i+1)+': '+JSON.stringify(lines[i]));
  }
  process.exit(1);
}

console.log('=== CONTEXTO DESPUES ===');
for (let i = 621; i <= 630; i++) {
  console.log('L'+(i+1)+': '+JSON.stringify(lines[i]));
}

const result = lines.join('\n');
fs.writeFileSync('SabanaAnalyzer.tsx', result, 'utf8');
console.log('DONE len:'+result.length);
