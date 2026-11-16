const fs = require('fs');
let c = fs.readFileSync('SabanaAnalyzer.tsx', 'utf8');
const lines = c.split('\n');

console.log('Total lineas:', lines.length);

// Buscar y eliminar la linea {tab === "map" && ( que insertó fix9
// Debe estar alrededor de L547 (index 546)
let mapOpenIdx = -1;
for (let i = 540; i <= 560; i++) {
  if (lines[i] && lines[i].trim() === '{tab === "map" && (') {
    mapOpenIdx = i;
    console.log('ENCONTRADO tab===map en L'+(i+1)+': '+lines[i]);
    break;
  }
}

if (mapOpenIdx === -1) {
  console.log('NO ENCONTRADO {tab === "map" && ( en rango 541-560');
  process.exit(1);
}

// Eliminar esa linea
lines.splice(mapOpenIdx, 1);
console.log('ELIMINADO L'+(mapOpenIdx+1));
console.log('Ahora L'+(mapOpenIdx+1)+': '+lines[mapOpenIdx]);

// Ahora buscar el )} de cierre que quedó en ~L628 (antes L629)
// Debe estar justo antes de </div> (que cierra el div principal del mapa)
// Buscar hacia atrás desde ~L630
let mapCloseIdx = -1;
for (let i = 625; i <= 635; i++) {
  if (lines[i] && lines[i].trim() === ')}') {
    // verificar que la linea siguiente sea </div>
    const next = lines[i+1] ? lines[i+1].trim() : '';
    console.log('CANDIDATO cierre L'+(i+1)+': "'+lines[i]+'" next:"'+next+'"');
    if (next === '</div>') {
      mapCloseIdx = i;
      break;
    }
  }
}

if (mapCloseIdx === -1) {
  console.log('NO ENCONTRADO )} de cierre - buscando contexto:');
  for (let i = 623; i <= 635; i++) {
    console.log('L'+(i+1)+': '+JSON.stringify(lines[i]));
  }
  process.exit(1);
}

lines.splice(mapCloseIdx, 1);
console.log('ELIMINADO cierre L'+(mapCloseIdx+1));

const result = lines.join('\n');
fs.writeFileSync('SabanaAnalyzer.tsx', result, 'utf8');
console.log('DONE len:'+result.length);
