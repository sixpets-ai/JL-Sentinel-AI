const fs = require('fs');
// Buscar el backup original de 700 lineas
const backups = ['SabanaAnalyzer.tsx.bak_fix505b', 'SabanaAnalyzer.tsx.bak_fix505c', 'SabanaAnalyzer.tsx.bak_fix505'];
for(const b of backups) {
  try {
    const lines = fs.readFileSync(b, 'utf8').split('\n');
    console.log(b, '- lineas:', lines.length, '- L505:', JSON.stringify(lines[504]));
  } catch(e) { console.log(b, 'no encontrado'); }
}
