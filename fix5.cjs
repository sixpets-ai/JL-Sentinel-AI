const fs = require('fs');
let c = fs.readFileSync('SabanaAnalyzer.tsx', 'utf8');

// Detectar separador de linea
const sep = c.includes('\r\n') ? '\r\n' : '\n';
console.log('sep:' + (sep === '\r\n' ? 'CRLF' : 'LF'));

const lines = c.split(sep);

// Buscar lineas con }} que deben ser )}
let fixes = 0;
for (let i = 0; i < lines.length; i++) {
  const l = lines[i];
  // L626 pattern: solo }} con espacios antes (no parte de style={{ }})
  // La linea debe ser SOLO espacios + }} - nada mas
  if (/^\s+\}\}$/.test(l)) {
    const prev = lines[i-1] || '';
    const next = lines[i+1] || '';
    // Solo cambiar si esta entre </div> y </> o entre ))} y </>
    console.log('CANDIDATO L'+(i+1)+': '+JSON.stringify(l));
    console.log('  prev: '+JSON.stringify(prev));
    console.log('  next: '+JSON.stringify(next));
  }
}

// Fix directo por numero de linea - L626 (index 625) y L628 (index 627)
// Verificar que son }} solos
console.log('L626 actual:' + JSON.stringify(lines[625]));
console.log('L628 actual:' + JSON.stringify(lines[627]));

if (lines[625] && /^\s+\}\}/.test(lines[625])) {
  lines[625] = lines[625].replace('}}', ')}');
  fixes++;
  console.log('FIX L626: ' + lines[625]);
}
if (lines[627] && /^\s+\}\}/.test(lines[627])) {
  lines[627] = lines[627].replace('}}', ')}');
  fixes++;
  console.log('FIX L628: ' + lines[627]);
}

console.log('fixes:' + fixes);
const result = lines.join(sep);
fs.writeFileSync('SabanaAnalyzer.tsx', result, 'utf8');
console.log('DONE len:' + result.length);
