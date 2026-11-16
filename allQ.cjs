const fs = require('fs');
const lines = fs.readFileSync('SabanaAnalyzer.tsx', 'utf8').split('\n');
// Buscar TODOS los ? en el archivo
lines.forEach((ln, i) => {
  if(ln.includes('?')) {
    const idx = i+1;
    // Solo mostrar lineas de L430 a L700
    if(idx >= 430) console.log('L'+idx+':', JSON.stringify(ln.substring(0,120)));
  }
});
